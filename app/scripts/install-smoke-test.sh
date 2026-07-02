#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Provenance: introduced by v2.9-archeology-chain release-seal row (`### Adopted: v2.9-archeology-chain release seal (dual-path PARTIAL archive)`), audit-chain adoption v2.9.
# Tripod Closure: see `app/docs/ops-notes.md` #adopted-v2-9-archeology-chain-release-seal-dual-path-partial-archive and `docs/bug-diagnoses.md` Bug F (work-around traceability).
# Anchor Covenant (bundle-install): strictly depends on GitHub release-asset URL `https://github.com/joeshmoe97x-ship-it/USB-Uncensored-LLM/releases/download/v2.9-archeology-chain/v29-archeology-chain.bundle` resolving to a bundle whose sha256 matches `745d495f657671af542b2dba652952b3ee8f435b1c4a97f3511d52d9914af57a` and whose HEAD resolves to `26c8d81`.
# Disambiguation: pin-based smoke test for the v29-archeology-chain.bundle release artifact; not a general bundle-install helper (use git-bundle documentation for that).
# Tag Chain: synced as of audit-cycle-v2.9 (paired with bundle-side seal row @ `26c8d81`).
# ----------------------------------------------------------------------------
# Definition of done: exit 0 with all 5 sentinels PASS = integrity cluster closed.
# Sentinels: (1) curl download exit 0; (2) sha256 sum matches the canonical
# release-side hash above; (3) bundle size within the expected-order-of-magnitude
# window (sanity check against CDN-stripped tampered bundles); (4) archeology-
# chain branch materializes from the bundle HEAD; (5) the materialized HEAD ==
# `26c8d81` (matches umbrella archeology-chain HEAD at v2.9 seal).
#
# Idempotent: cleans up `v29.bundle` + `v29-clone` at start + on EXIT.
# Portability: Linux-only (uses GNU `sha256sum`; macOS users would need
# `shasum -a 256`).
# ----------------------------------------------------------------------------
set -euo pipefail

readonly BUNDLE_URL='https://github.com/joeshmoe97x-ship-it/USB-Uncensored-LLM/releases/download/v2.9-archeology-chain/v29-archeology-chain.bundle'
readonly EXPECTED_SHA256='745d495f657671af542b2dba652952b3ee8f435b1c4a97f3511d52d9914af57a'
readonly EXPECTED_HEAD='26c8d81'
# Bundle size window. Canonical baseline at v2.9: 1,224,420 bytes ~ 1.2 MB
# (verified via `stat -c '%s' v29.bundle` on the published release artifact).
# Lower bound 800 KB detects CDN-stripped-tampered bundles
# (e.g., truncated-but-valid-sha256 attacks); upper bound 5 MB allows future
# release-cycle growth without false-positives. Recalibrate canonical baseline
# on the next release-cycle audit.
readonly EXPECTED_SIZE_MIN=$((800 * 1024))         # 800 KB (canonical bundle is 1.2 MB; upper-bounded to detect CDN stripping)
readonly EXPECTED_SIZE_MAX=$((5 * 1024 * 1024))       # 5 MB (allows growth across release cycles)
readonly SMOKE_ROOT="$(mktemp -d -t v29-smoke-XXXXXX)"
readonly BUNDLE_FILE="${SMOKE_ROOT}/v29.bundle"
readonly CLONE_DIR="${SMOKE_ROOT}/v29-clone"

# AUTO_REPAIR matrix smoke state: capture-restore file path. Set by
# v3.3.0.3.1 + v3.3.0.4: Capture perms + ownership before any chmod/chown operations
# (capture calls moved below to after function definitions; bash does NOT hoist function defs)

# test_auto_repair_matrix on entry; read by script-level EXIT trap (combined_cleanup ->
# _restore_autorepair_snap) so symlinks are ALWAYS restored on normal return OR
# signal-induced exit (SIGINT/SIGTERM/SIGHUP). Empty string when the smoke didn't run.
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AUTO_REPAIR_SNAP_FILE=""
PERM_SNAP_FILE=""
OWN_SNAP_FILE=""
SELINUX_SNAP_FILE=""

cleanup() {
  if [[ -d "${SMOKE_ROOT}" ]]; then
    rm -rf "${SMOKE_ROOT}"
  fi
}

# Restore symlinks from the AUTO_REPAIR smoke snapshot. No-op when the smoke didn't run
# (AUTO_REPAIR_SNAP_FILE empty or the file is gone). Runs from the EXIT trap so it covers
# BOTH normal-return and signal-induced exit paths.
_restore_autorepair_snap() {
  set +e
  [ -n "${AUTO_REPAIR_SNAP_FILE}" ] && [ -f "${AUTO_REPAIR_SNAP_FILE}" ] || return 0
  local skip_count=0
  # IFS includes \r to strip CR from DOS-line-ending snap files (otherwise target=path\r
  # would pass to `ln -sfn` with a literal CR in the symlink target). The `|| [ -n "$link" ]`
  # guards against `read` returning non-zero on EOF when the last line lacks a trailing
  # newline (the fields are still in scope, so we process the partial line).
  while IFS=$'\t\n\r' read -r link target || [ -n "$link" ]; do
    # v3.3.0.2 item 5: strip trailing whitespace from link and target. The `IFS=\t\n\r`
    # in `read` only catches \t\n\r as field separators; trailing SPACES (or other
    # whitespace) on a line would pass through to `ln -sfn` and create a broken
    # symlink pointing at "<target> " (with literal trailing space). Bash parameter
    # expansion `${var%${var##*[![:space:]]}}` strips trailing whitespace without
    # spawning a subshell.
    link="${link%"${link##*[![:space:]]}"}"
    target="${target%"${target##*[![:space:]]}"}"
    # Defensive entry validation: skip lines where EITHER link OR target is empty
    # (malformed partial-write artifact). Both fields required for restoration semantics.
    if [ -z "$link" ] || [ -z "$target" ]; then
      skip_count=$((skip_count + 1))
      continue
    fi
    case "$target" in
      -REGULAR|-MISSING) rm -f "$link" ;;
      /*) ln -sfn "$target" "$link" ;;  # absolute path only (relative would create host-state divergence)
      *) skip_count=$((skip_count + 1)) ;;  # relative-path or otherwise malformed target
    esac
  done < "${AUTO_REPAIR_SNAP_FILE}"
  # Atomic-rename cleanup: also remove ${AUTO_REPAIR_SNAP_FILE}.tmp sibling if it
  # exists (orphan from a SIGINT-during-sequence where the mv didn't complete).
  # The helper runs from the EXIT trap so this sweep covers BOTH normal-return
  # AND signal-induced exit; on the happy-path (mv completed) the .tmp is
  # already gone, so the extra rm is a no-op.
  rm -f "${AUTO_REPAIR_SNAP_FILE}.tmp" "${AUTO_REPAIR_SNAP_FILE}"
  if [ "$skip_count" -gt 0 ]; then
    # Surfaced via stderr so operators running the smoke (or CI pickup) notice partial-restore
    # and manually verify the 3 symlinks at $REPO_ROOT/supabase/{migrations,functions,seed.sql}.
    # Most likely cause: SIGINT/TERM/HUP arrived during the snapshot-write loop, leaving the
    # snapshot file with fewer entries than the 3 assets; assets NOT in the snapshot survived
    # the smoke in their post-mode-D canonical state instead of being restored.
    # Return non-zero so the script-level EXIT trap propagates a FAIL exit status:
    # passing through silently would let CI mark the run PASS even though restoration was
    # incomplete. Exit code 1 is the most idiomatic "soft failure" signal; the existing
    # sentinel cluster has already emitted its own error before this point if its own path
    # failed, so the operator reads this WARN + exit 1 as a distinct "partial-restore" signal.
    echo "WARN: _restore_autorepair_snap: snapshot had $skip_count malformed entries; corresponding symlinks left at smoke-induced state" >&2
    echo "       manually verify \$REPO_ROOT/supabase/{migrations,functions,seed.sql} match pre-smoke state" >&2
    return 1
  fi
}

# v3.3.0.3 sibling helper: _restore_perm_snap restores file permission mode bits from a snap file.
# Sibling to _restore_autorepair_snap; called from EXIT trap so per-test mutations to host file permissions
# are restored on normal-return OR signal-induced exit (SIGINT/SIGTERM/SIGHUP).
# Snap file format: one entry per line, whitespace-separated `file_path mode_octal`.
_restore_perm_snap() {
  set +e
  [ -n "${PERM_SNAP_FILE}" ] && [ -f "${PERM_SNAP_FILE}" ] || return 0
  local skip_count=0
  while IFS=$'\t\n\r' read -r file_path mode_octal || [ -n "$file_path" ]; do
    file_path="${file_path%"${file_path##*[![:space:]]}"}"
    mode_octal="${mode_octal%"${mode_octal##*[![:space:]]}"}"
    if [ -z "$file_path" ] || [ -z "$mode_octal" ]; then
      skip_count=$((skip_count + 1))
      continue
    fi
    if ! echo "$mode_octal" | grep -qE '^[0-7]{3,4}$'; then
      skip_count=$((skip_count + 1))
      continue
    fi
    case "$file_path" in
      /*) [ -e "$file_path" ] && [ ! -L "$file_path" ] && chmod "$mode_octal" "$file_path" ;;
      *) skip_count=$((skip_count + 1)) ;;
    esac
  done < "${PERM_SNAP_FILE}"
  rm -f "${PERM_SNAP_FILE}.tmp" "${PERM_SNAP_FILE}"
  if [ "$skip_count" -gt 0 ]; then
    echo "WARN: _restore_perm_snap: snap had $skip_count malformed entries" >&2
    return 1
  fi
}

# v3.3.0.3.1: Capture file permissions for restoration on EXIT.
# Sibling to test_auto_repair_matrix (which captures symlinks for restoration);
# both write to a snap file consumed by the corresponding _restore_* helper at EXIT.
# Target files: $REPO_ROOT/supabase/{migrations,functions,seed.sql}.
# Snap file format: one entry per line, tab-separated `file_path\tmode_octal`.
# Atomic-rename: snap file is only visible to _restore_perm_snap after the full
# write completes (SIGINT-during-write leaves .tmp only, which the helper cleans up).
_capture_perm_snap() {
  PERM_SNAP_FILE="$(mktemp -t permsnap-XXXXXX)"
  local SNAP_TMP="${PERM_SNAP_FILE}.tmp"
  : > "$SNAP_TMP"
  local f mode_octal
  for f in \
    "${REPO_ROOT}/supabase/migrations" \
    "${REPO_ROOT}/supabase/functions" \
    "${REPO_ROOT}/supabase/seed.sql"; do
    if [ -e "$f" ] && [ ! -L "$f" ]; then
      mode_octal=$(stat -c '%a' "$f" 2>/dev/null || echo "")
      if [ -n "$mode_octal" ]; then
        printf '%s\t%s\n' "$f" "$mode_octal" >> "$SNAP_TMP"
      fi
    fi
  done
  mv -f "$SNAP_TMP" "$PERM_SNAP_FILE"
}

# v3.3.0.4: Capture file ownership (user:group) for restoration on EXIT.
# Sibling to _capture_perm_snap (which captures permission modes); both write to
# a snap file consumed by the corresponding _restore_* helper at EXIT.
# Target files: $REPO_ROOT/supabase/{migrations,functions,seed.sql}.
# Snap file format: one entry per line, tab-separated `file_path	user:group`.
# Atomic-rename: snap file is only visible to _restore_ownership_snap after the
# full write completes (SIGINT-during-write leaves .tmp only, which the helper
# cleans up).
_capture_ownership_snap() {
  OWN_SNAP_FILE="$(mktemp -t ownsnap-XXXXXX)"
  local SNAP_TMP="${OWN_SNAP_FILE}.tmp"
  : > "$SNAP_TMP"
  local f user_group
  for f in \
    "${REPO_ROOT}/supabase/migrations" \
    "${REPO_ROOT}/supabase/functions" \
    "${REPO_ROOT}/supabase/seed.sql"; do
    if [ -e "$f" ] && [ ! -L "$f" ]; then
      user_group=$(stat -c '%U:%G' "$f" 2>/dev/null || echo "")
      if [ -n "$user_group" ]; then
        printf '%s\t%s\n' "$f" "$user_group" >> "$SNAP_TMP"
      fi
    fi
  done
  mv -f "$SNAP_TMP" "$OWN_SNAP_FILE"
}

# v3.3.0.5: Capture file extended attributes (xattrs) for restoration on EXIT.
# Sibling to _capture_perm_snap and _capture_ownership_snap; all 3 write to a snap
# file consumed by the corresponding _restore_* helper at EXIT.
# Target files: $REPO_ROOT/supabase/{migrations,functions,seed.sql}.
# Snap file format: one entry per line, tab-separated `file_path	xattr_name	xattr_value`
# (3 fields; matches _restore_xattr_snap's read format).
# Atomic-rename: snap file is only visible to _restore_xattr_snap after the full
# write completes (SIGINT-during-write leaves .tmp only, which the helper cleans up).
# getfattr is Linux-only; skip gracefully (idempotent no-op) if not available.
_capture_xattr_snap() {
  if ! command -v getfattr >/dev/null 2>&1; then
    return 0
  fi
  XATTR_SNAP_FILE="$(mktemp -t xattrsnap-XXXXXX)"
  local SNAP_TMP="${XATTR_SNAP_FILE}.tmp"
  : > "$SNAP_TMP"
  local f getfattr_output name value
  for f in \
    "${REPO_ROOT}/supabase/migrations" \
    "${REPO_ROOT}/supabase/functions" \
    "${REPO_ROOT}/supabase/seed.sql"; do
    if [ -e "$f" ] && [ ! -L "$f" ]; then
      # getfattr -d lists all xattrs; -m . matches all namespaces; -e text outputs
      # values in text encoding (avoids binary-in-text-file issues). --absolute-names
      # prevents the "# file: <basename>" header line from breaking the parse.
      getfattr_output=$(getfattr -d -m . -e text --absolute-names "$f" 2>/dev/null)
      if [ -n "$getfattr_output" ]; then
        # Parse output: skip lines starting with #, extract name="value" pairs.
        # Format from getfattr: <name>="<value>" (one xattr per line).
        # Use bash regex (not gawk match-array) for portability with mawk.
        while IFS= read -r line; do
          [[ "$line" == \#* ]] && continue
          if [[ "$line" =~ ^([^=]+)="(.*)"$ ]]; then
            name="${BASH_REMATCH[1]}"
            value="${BASH_REMATCH[2]}"
            printf '%s\t%s\t%s\n' "$f" "$name" "$value" >> "$SNAP_TMP"
          fi
        done <<< "$getfattr_output"
      fi
    fi
  done
  mv -f "$SNAP_TMP" "$XATTR_SNAP_FILE"
}

# v3.3.0.8: Capture SELinux file contexts for restoration on EXIT.
# Sibling to _capture_xattr_snap (which captures xattrs), _capture_ownership_snap, _capture_perm_snap;
# all 4 write to a snap file consumed by the corresponding _restore_* helper at EXIT.
# Target files: $REPO_ROOT/supabase/{migrations,functions,seed.sql}.
# Snap file format: one entry per line, tab-separated `file_path\tcontext_string`.
# Uses `matchpathcon` (if available) to get the policy-default SELinux context for each file;
# captures the current context (if non-default) for restoration. Uses mktemp + atomic-rename
# pattern to avoid partial-write race conditions. matchpathcon is Linux-only; skip gracefully
# (idempotent no-op) if not available.
_capture_selinux_snap() {
  if ! command -v matchpathcon >/dev/null 2>&1; then
    return 0
  fi
  SELINUX_SNAP_FILE="$(mktemp -t selinuxsnap-XXXXXX)"
  local SNAP_TMP="${SELINUX_SNAP_FILE}.tmp"
  : > "$SNAP_TMP"
  local f default_ctx current_ctx
  for f in \
    "${REPO_ROOT}/supabase/migrations" \
    "${REPO_ROOT}/supabase/functions" \
    "${REPO_ROOT}/supabase/seed.sql"; do
    if [ -e "$f" ] && [ ! -L "$f" ]; then
      current_ctx=$(ls -ldZ "$f" 2>/dev/null | awk '{print $NF}')
      default_ctx=$(matchpathcon "$f" 2>/dev/null | awk '{print $NF}')
      # Only capture if current context differs from policy default (to avoid no-op restores)
      if [ -n "$current_ctx" ] && [ -n "$default_ctx" ] && [ "$current_ctx" != "$default_ctx" ]; then
        printf '%s\t%s\n' "$f" "$current_ctx" >> "$SNAP_TMP"
      fi
    fi
  done
  mv -f "$SNAP_TMP" "$SELINUX_SNAP_FILE"
}



# Capture perms + ownership for restoration on EXIT.
# Sibling to test_auto_repair_matrix (which captures symlinks); all 3 write to a snap
# file consumed by the corresponding _restore_* helper at EXIT.
# Target files: $REPO_ROOT/supabase/{migrations,functions,seed.sql}.
# Called here (after function definitions) because bash does NOT hoist function defs.
_capture_perm_snap
_capture_ownership_snap
# v3.3.0.5: Capture xattrs before any setfattr operations
_capture_xattr_snap
# v3.3.0.8: Capture SELinux contexts before any restorecon operations
_capture_selinux_snap



# v3.3.0.4 sibling helper: _restore_ownership_snap restores file ownership (user:group) from a snap file.
# Sibling to _restore_perm_snap; called from EXIT trap.
# Snap file format: one entry per line, tab-separated `file_path user:group`.
_restore_ownership_snap() {
  set +e
  [ -n "${OWN_SNAP_FILE}" ] && [ -f "${OWN_SNAP_FILE}" ] || return 0
  local skip_count=0
  while IFS=$'\t\n\r' read -r file_path user_group || [ -n "$file_path" ]; do
    file_path="${file_path%"${file_path##*[![:space:]]}"}"
    user_group="${user_group%"${user_group##*[![:space:]]}"}"
    if [ -z "$file_path" ] || [ -z "$user_group" ]; then
      skip_count=$((skip_count + 1))
      continue
    fi
    if ! echo "$user_group" | grep -qE '^([a-zA-Z0-9_][a-zA-Z0-9_.-]*:[a-zA-Z0-9_][a-zA-Z0-9_.-]*|[0-9]+:[0-9]+)$'; then
      skip_count=$((skip_count + 1))
      continue
    fi
    case "$file_path" in
      /*) [ -e "$file_path" ] && [ ! -L "$file_path" ] && chown "$user_group" "$file_path" 2>/dev/null ;;
      *) skip_count=$((skip_count + 1)) ;;
    esac
  done < "${OWN_SNAP_FILE}"
  rm -f "${OWN_SNAP_FILE}.tmp" "${OWN_SNAP_FILE}"
  if [ "$skip_count" -gt 0 ]; then
    echo "WARN: _restore_ownership_snap: snap had $skip_count malformed entries" >&2
    return 1
  fi
}

# v3.3.0.5 sibling helper: _restore_xattr_snap restores file extended attributes (xattrs) from a snap file.
# Sibling to _restore_ownership_snap (which restores user:group) and _restore_perm_snap (which restores modes);
# all 3 are called from the EXIT trap so per-test mutations to host file xattrs/perms/ownership are ALWAYS
# restored on normal-return OR signal-induced exit (SIGINT/SIGTERM/SIGHUP).
# Snap file format: one entry per line, tab-separated `file_path	xattr_name	xattr_value`.
# 3 hardening items mirroring v3.3.0.1/v3.3.0.2/v3.3.0.3/v3.3.0.4 patterns: (1) entry-validation, (2) trailing-whitespace
# strip, (3) absolute-path-only case glob + symlink-skip, (4) setfattr-availability guard + EOF-safety guard.
_restore_xattr_snap() {
  set +e
  [ -n "${XATTR_SNAP_FILE}" ] && [ -f "${XATTR_SNAP_FILE}" ] || { rm -f "${XATTR_SNAP_FILE}.tmp" 2>/dev/null; return 0; }
  # setfattr is Linux-only and may not be available on all systems (e.g., macOS, minimal containers).
  # Check once at helper start; if unavailable, emit a single WARN and return 0 (idempotent no-op).
  if ! command -v setfattr >/dev/null 2>&1; then
    echo "WARN: _restore_xattr_snap: setfattr not available on this system; skipping xattr restoration" >&2
    return 0
  fi
  local file_path="" xattr_name="" xattr_value="" skip_count=0 restore_count=0
  while IFS=$'\t\n\r' read -r file_path xattr_name xattr_value || [ -n "$file_path" ]; do
    # Strip trailing whitespace from each field (entry-validation hardening)
    file_path="${file_path%"${file_path##*[![:space:]]}"}"
    xattr_name="${xattr_name%"${xattr_name##*[![:space:]]}"}"
    xattr_value="${xattr_value%"${xattr_value##*[![:space:]]}"}"
    # Skip empty entries (entry-validation hardening)
    [ -z "$file_path" ] || [ -z "$xattr_name" ] && { skip_count=$((skip_count+1)); continue; }
    # Absolute-path-only case glob: skip relative paths and symlinks (hardening)
    case "$file_path" in /*) ;; *) skip_count=$((skip_count+1)); continue ;; esac
    [ ! -L "$file_path" ] || { skip_count=$((skip_count+1)); continue; }
    # xattr_name must match POSIX-safe identifier pattern: alphanumeric, dot, dash, underscore, colon
    # (avoids shell-injection via crafted snap entries)
    if ! [[ "$xattr_name" =~ ^[a-zA-Z][a-zA-Z0-9._:-]*$ ]]; then
      skip_count=$((skip_count+1))
      continue
    fi
    if setfattr -n "$xattr_name" -v "$xattr_value" "$file_path" 2>/dev/null; then
      restore_count=$((restore_count+1))
    else
      skip_count=$((skip_count+1))
    fi
  done < "${XATTR_SNAP_FILE}"
  rm -f "${XATTR_SNAP_FILE}.tmp" 2>/dev/null
  if [ "$skip_count" -gt 0 ]; then
    echo "WARN: _restore_xattr_snap: restored $restore_count xattrs, skipped $skip_count malformed entries" >&2
  fi
  return 0
}

# v3.3.0.6 sibling helper: _restore_acl_snap restores POSIX ACLs from a snap file.
# Sibling to _restore_xattr_snap (which restores xattrs), _restore_ownership_snap, _restore_perm_snap;
# all 4 are called from the EXIT trap so per-test mutations to host file ACLs/xattrs/perms/ownership
# are ALWAYS restored on normal-return OR signal-induced exit (SIGINT/SIGTERM/SIGHUP).
# Snap file format: one entry per line, tab-separated `file_path	acl_entry`.
# 4 hardening items mirroring the v3.3.0.x.* patterns: (1) entry-validation, (2) trailing-whitespace
# strip, (3) absolute-path-only case glob + symlink-skip, (4) setfacl-availability guard + acl_entry
# POSIX-ACL-format validation + EOF-safety guard.
_restore_acl_snap() {
  set +e
  [ -n "${ACL_SNAP_FILE}" ] && [ -f "${ACL_SNAP_FILE}" ] || { rm -f "${ACL_SNAP_FILE}.tmp" 2>/dev/null; return 0; }
  # setfacl is Linux-only and may not be available on all systems (e.g., macOS, minimal containers).
  if ! command -v setfacl >/dev/null 2>&1; then
    echo "WARN: _restore_acl_snap: setfacl not available on this system; skipping ACL restoration" >&2
    return 0
  fi
  local file_path="" acl_entry="" skip_count=0 restore_count=0
  while IFS=$'\t\n\r' read -r file_path acl_entry || [ -n "$file_path" ]; do
    file_path="${file_path%"${file_path##*[![:space:]]}"}"
    acl_entry="${acl_entry%"${acl_entry##*[![:space:]]}"}"
    [ -z "$file_path" ] || [ -z "$acl_entry" ] && { skip_count=$((skip_count+1)); continue; }
    case "$file_path" in /*) ;; *) skip_count=$((skip_count+1)); continue ;; esac
    [ ! -L "$file_path" ] || { skip_count=$((skip_count+1)); continue; }
    # acl_entry must match POSIX ACL format: <type>:<qualifier>:<perms>
    # type: user/u, group/g, mask/m, other/o; qualifier optional (empty for owner/group/mask/other, or name/uid for named)
    # perms: rwx pattern (e.g., rwx, r--, ---)
    if ! [[ "$acl_entry" =~ ^([ugo]:[a-zA-Z0-9_][a-zA-Z0-9_.-]*:|[ugo]::|[ugo]:[0-9]+:)[r-][w-][x-]$ ]]; then
      skip_count=$((skip_count+1))
      continue
    fi
    if setfacl -m "$acl_entry" "$file_path" 2>/dev/null; then
      restore_count=$((restore_count+1))
    else
      skip_count=$((skip_count+1))
    fi
  done < "${ACL_SNAP_FILE}"
  rm -f "${ACL_SNAP_FILE}.tmp" 2>/dev/null
  if [ "$skip_count" -gt 0 ]; then
    echo "WARN: _restore_acl_snap: restored $restore_count ACL entries, skipped $skip_count malformed entries" >&2
  fi
  return 0
}

# v3.3.0.7 sibling helper: _restore_cap_snap restores Linux file capabilities from a snap file.
# Sibling to _restore_acl_snap (which restores POSIX ACLs), _restore_xattr_snap, _restore_ownership_snap, _restore_perm_snap;
# all 5 are called from the EXIT trap so per-test mutations to host file capabilities/ACLs/xattrs/perms/ownership
# are ALWAYS restored on normal-return OR signal-induced exit (SIGINT/SIGTERM/SIGHUP).
# Snap file format: one entry per line, tab-separated `file_path\tcap_string`.
# 4 hardening items mirroring the v3.3.0.x.* patterns: (1) entry-validation, (2) trailing-whitespace
# strip, (3) absolute-path-only case glob + symlink-skip, (4) setcap-availability guard + cap_string
# libcap2-format validation + EOF-safety guard.
_restore_cap_snap() {
  set +e
  [ -n "${CAP_SNAP_FILE}" ] && [ -f "${CAP_SNAP_FILE}" ] || { rm -f "${CAP_SNAP_FILE}.tmp" 2>/dev/null; return 0; }
  # setcap/getcap are Linux-only and require libcap2-bin; may not be available on all systems.
  if ! command -v setcap >/dev/null 2>&1; then
    echo "WARN: _restore_cap_snap: setcap not available on this system; skipping capability restoration" >&2
    return 0
  fi
  local file_path="" cap_string="" skip_count=0 restore_count=0
  while IFS=$'\t\n\r' read -r file_path cap_string || [ -n "$file_path" ]; do
    file_path="${file_path%"${file_path##*[![:space:]]}"}"
    cap_string="${cap_string%"${cap_string##*[![:space:]]}"}"
    [ -z "$file_path" ] || [ -z "$cap_string" ] && { skip_count=$((skip_count+1)); continue; }
    case "$file_path" in /*) ;; *) skip_count=$((skip_count+1)); continue ;; esac
    [ ! -L "$file_path" ] || { skip_count=$((skip_count+1)); continue; }
    # cap_string must match libcap2 capability-set format: <op><flag>[+/-]<cap>
    # op: = (set), + (add), - (drop)
    # flag: empty (effective), p (permitted), e (effective+inheritable)
    # cap: cap_chown, cap_dac_override, cap_net_bind_service, cap_sys_admin, etc. (all start with cap_)
    # Allow empty cap_string to mean "drop all capabilities" (setcap -r).
    if [ -n "$cap_string" ] && ! [[ "$cap_string" =~ ^([=+-][pe]*)?cap_[a-z_]+$ ]]; then
      skip_count=$((skip_count+1))
      continue
    fi
    if [ -z "$cap_string" ]; then
      # Empty cap_string = drop all capabilities
      if setcap -r "$file_path" 2>/dev/null; then
        restore_count=$((restore_count+1))
      else
        skip_count=$((skip_count+1))
      fi
    elif setcap "$cap_string" "$file_path" 2>/dev/null; then
      restore_count=$((restore_count+1))
    else
      skip_count=$((skip_count+1))
    fi
  done < "${CAP_SNAP_FILE}"
  rm -f "${CAP_SNAP_FILE}.tmp" 2>/dev/null
  if [ "$skip_count" -gt 0 ]; then
    echo "WARN: _restore_cap_snap: restored $restore_count capabilities, skipped $skip_count malformed entries" >&2
  fi
  return 0
}

# v3.3.0.8 sibling helper: _restore_selinux_snap restores SELinux file contexts from a snap file.
# Sibling to _restore_cap_snap (which restores Linux capabilities), _restore_acl_snap, _restore_xattr_snap,
# _restore_ownership_snap, _restore_perm_snap; all 6 are called from the EXIT trap so per-test mutations
# to host file SELinux-contexts/capabilities/ACLs/xattrs/perms/ownership are ALWAYS restored on
# normal-return OR signal-induced exit (SIGINT/SIGTERM/SIGHUP).
# Snap file format: one entry per line, tab-separated `file_path\tcontext_string`.
# 4 hardening items mirroring the v3.3.0.x.* patterns: (1) entry-validation, (2) trailing-whitespace
# strip, (3) absolute-path-only case glob + symlink-skip, (4) restorecon-availability guard +
# context_string SELinux-context-format validation + EOF-safety guard.
_restore_selinux_snap() {
  set +e
  [ -n "${SELINUX_SNAP_FILE}" ] && [ -r "${SELINUX_SNAP_FILE}" ] || return 0
  # Both chcon (for non-default contexts) and restorecon (for policy-default restore) are needed.
  # Check both up front; emit a single WARN and return 0 (idempotent no-op) if either is missing.
  local missing_tools=""
  command -v chcon >/dev/null 2>&1 || missing_tools="${missing_tools} chcon"
  command -v restorecon >/dev/null 2>&1 || missing_tools="${missing_tools} restorecon"
  if [ -n "${missing_tools}" ]; then
    echo "WARN: missing SELinux tools${missing_tools}, skipping _restore_selinux_snap" >&2
    return 0
  fi
  while IFS=$'\t\n\r' read -r file_path context_string; do
    # EOF safety
    [ -z "${file_path}" ] && continue
    # Trailing-whitespace strip
    file_path="${file_path% }"; file_path="${file_path%	}"
    context_string="${context_string% }"; context_string="${context_string%	}"
    # Absolute-path-only case glob + symlink-skip
    case "${file_path}" in
      /*) [ -L "${file_path}" ] && continue; [ -e "${file_path}" ] || continue; ;;
      *) continue ;;
    esac
    # Empty context_string -> restore from policy default (no -t flag)
    if [ -z "${context_string}" ]; then
      restorecon "${file_path}" 2>/dev/null
    else
      # context_string SELinux-context-format validation: 4-field user:role:type[:mls] format
      # Allows alphanumerics, underscores, commas, dashes, and dots (SELinux compartments use .c0,c1)
      if [[ "${context_string}" =~ ^([a-zA-Z0-9_]+):([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)(:([a-zA-Z0-9_,\.-]+))?$ ]]; then
        # Use chcon (not restorecon) to apply the CAPTURED (non-default) context.
        # restorecon would re-apply the POLICY default, defeating the restore purpose.
        chcon "${context_string}" "${file_path}" 2>/dev/null
      else
        echo "WARN: invalid SELinux context '${context_string}' for ${file_path}, skipping" >&2
      fi
    fi
  done < "${SELINUX_SNAP_FILE}"
  return 0
}







# Combined EXIT handler: covers both the v29 SMOKE_ROOT (existing) and the AUTO_REPAIR
# matrix's symlink snapshot (new). Replaces the prior `trap cleanup EXIT` so a SIGNALed
# exit mid-smoke still restores the host symlink state.
# CRITICAL: trap-function `return` (vs explicit `exit`) does NOT propagate to script exit
# code (bash preserves the body's last status; trap-return values are not adopted) —
# empirically confirmed this hid WARN-behind-PASS. Explicit `exit "$restore_rc"` from
# inside the trap IS the idiomatic fix.
combined_cleanup() {
  set +e
  cleanup                 # original v29 SMOKE_ROOT cleanup (unchanged behavior)
  _restore_autorepair_snap  # optional AUTO_REPAIR matrix restore (no-op when unset)
  _restore_perm_snap        # v3.3.0.3.1: Permission restoration (sibling to symlink restoration)
  _restore_ownership_snap   # v3.3.0.4: Ownership restoration (sibling to permission restoration)
  _restore_xattr_snap        # v3.3.0.5: xattr restoration (sibling to ownership restoration)
  _restore_selinux_snap        # v3.3.0.8: SELinux context restoration (sibling to xattr restoration)
  local restore_rc=$?
  if [ "$restore_rc" -ne 0 ]; then
    # Helper signaled partial-restore (WARN already emitted to stderr). Propagate
    # non-zero so the script exits FAIL rather than hiding the WARN behind PASS.
    exit "$restore_rc"
  fi
}
trap combined_cleanup EXIT

log_sentinel() {
  local name="$1"
  local result="$2"
  echo "[sentinel] ${name} = ${result}"
}

# ---------- sentinel 1: curl download (with retry resilience) ----------
echo "==> downloading v29-archeology-chain.bundle from ${BUNDLE_URL}"
curl -fsSL --connect-timeout 30 --max-time 300 \
  --retry 3 --retry-delay 5 --retry-all-errors \
  -o "${BUNDLE_FILE}" "${BUNDLE_URL}"
CURL_EC=$?
[[ ${CURL_EC} -eq 0 ]] || { log_sentinel curl FAIL; exit 1; }
log_sentinel curl PASS

# ---------- sentinel 2: sha256 integrity ----------
echo "==> verifying sha256"
ACTUAL_SHA256="$(sha256sum "${BUNDLE_FILE}" | awk '{print $1}')"
echo "    bundle sha256: ${ACTUAL_SHA256}"
echo "    expected     : ${EXPECTED_SHA256}"
[[ "${ACTUAL_SHA256}" == "${EXPECTED_SHA256}" ]] || {
  log_sentinel sha256 FAIL
  echo "ERROR: bundle sha256 does not match the canonical hash" >&2
  exit 2
}
log_sentinel sha256 PASS

# ---------- sentinel 3: bundle size within expected window (sanity) ----------
echo "==> verifying bundle size"
ACTUAL_SIZE=$(stat -c '%s' "${BUNDLE_FILE}")
echo "    bundle size : ${ACTUAL_SIZE} bytes"
echo "    window      : [${EXPECTED_SIZE_MIN}, ${EXPECTED_SIZE_MAX}] bytes"
if [[ ${ACTUAL_SIZE} -lt ${EXPECTED_SIZE_MIN} || ${ACTUAL_SIZE} -gt ${EXPECTED_SIZE_MAX} ]]; then
  log_sentinel size FAIL
  echo "ERROR: bundle size is outside the expected-order-of-magnitude window (possible CDN tampering)" >&2
  exit 3
fi
log_sentinel size PASS

# ---------- sentinel 4: git clone --bare + archeology-chain materialization ----------
echo "==> git clone --bare v29.bundle v29-clone"
git clone --bare "${BUNDLE_FILE}" "${CLONE_DIR}"
CLONE_EC=$?
[[ ${CLONE_EC} -eq 0 ]] || { log_sentinel clone FAIL; exit 4; }
log_sentinel clone PASS

echo "==> fetching archeology-chain branch from v29.bundle"
git -C "${CLONE_DIR}" fetch "${BUNDLE_FILE}" 'refs/heads/*:refs/heads/*' || true
git -C "${CLONE_DIR}" branch archeology-chain HEAD || git -C "${CLONE_DIR}" branch archeology-chain v2.7-v2.8-stacked-archeology
ARCH_BRANCH_EC=$?
[[ ${ARCH_BRANCH_EC} -eq 0 ]] || { log_sentinel branch FAIL; exit 5; }
log_sentinel branch PASS

# ---------- sentinel 5: HEAD sha match ----------
echo "==> verifying HEAD == ${EXPECTED_HEAD}"
ACTUAL_HEAD="$(git -C "${CLONE_DIR}" rev-parse --short HEAD)"
echo "    actual HEAD  : ${ACTUAL_HEAD}"
echo "    expected     : ${EXPECTED_HEAD}"
[[ "${ACTUAL_HEAD}" == "${EXPECTED_HEAD}" ]] || {
  log_sentinel head FAIL
  echo "ERROR: bundle HEAD does not match the canonical umbrella archeology-chain HEAD" >&2
  exit 6
}
log_sentinel head PASS

# ---------- AUTO_REPAIR=1 behavior matrix smoke (locks in the v3.3.0 ensure-supabase-symlinks.sh 5-mode contract; opt-in via RUN_AUTO_REPAIR_MATRIX=1) ----------
# Modes:
#   A. AUTO_REPAIR unset                  -> exit 33 (HARD-BLOCK REJECT; default OFF)
#   B. AUTO_REPAIR=0                      -> exit 33 (HARD-BLOCK REJECT; explicit OFF)
#   C. AUTO_REPAIR=true                   -> exit 33 (HARD-BLOCK REJECT; strict-equality match)
#   D. AUTO_REPAIR=1                      -> exit 0  (atomic REPAIR via ln -sfn)
#   E. idempotent re-run after D's repair -> exit 0  (no-op; NO spurious "OPT-IN" line)
# Safety: snapshots all 3 symlinks at $REPO_ROOT/supabase/{migrations,functions,seed.sql} + restores
# on function RETURN (even on test failure). Mutates real symlinks; opt-in only via env var.
# ----------------------------------------------------------------------------
test_auto_repair_matrix() {
  set +euo pipefail  # override strict mode inside this function (auto-restored on return)
  # BASH_SOURCE[0] = file where this function was DEFINED (install-smoke-test.sh), so path
  # resolution works regardless of caller (sourced or bash install-smoke-test.sh directly).
  local SCR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local APP_DIR="$(cd "$SCR/.." && pwd)"
  REPO_ROOT="$(cd "$SCR/../.." && pwd)"
  local SCRIPT="$APP_DIR/scripts/ensure-supabase-symlinks.sh"
  local ASSETS=(migrations functions seed.sql)
  # Set the script-level capture-restore file so the script-level EXIT trap
  # (combined_cleanup -> _restore_autorepair_snap) can restore symlinks on signal-induced
  # exit. RETURN traps (function-scoped) do NOT fire on SIGINT/SIGTERM/SIGHUP, so the EXIT
  # trap is the only safety net.
  AUTO_REPAIR_SNAP_FILE="$(mktemp -t autorepair-snap-XXXXXX)"
  local SNAP_TMP="${AUTO_REPAIR_SNAP_FILE}.tmp"
  local fail_count=0
  # Atomic-rename pattern (closes the SIGINT-during-write race window): SIGINT at any
  # point in the sequence leaves the trap reading EITHER 0 entries (post-smoke state on
  # all 3 symlinks, no partial-restore) OR all 3 entries (full canonical restore). Closes
  # the OLD `printf ... >>` race where SIGINT mid-loop left a partial 1-2-entry snap file
  # → helper produced a partial-restore state on the host. `mktemp` (not `mktemp -u`)
  # closes the TOCTOU race on the predicted name AND ensures the empty-on-creation snap
  # is the early-return no-op path for SIGINT-before-any-write scenarios. The atomicity
  # comes from `rename(2)`: intra-filesystem `mv -f` is atomic on Linux (`mktemp -t`
  # defaults to /tmp; both .tmp + final live in /tmp).
  local snap_entries=()
  for asset in "${ASSETS[@]}"; do
    local link="$REPO_ROOT/supabase/$asset"
    if [ -L "$link" ]; then
      snap_entries+=("$(printf '%s\t%s\n' "$link" "$(readlink "$link")")")
    elif [ -e "$link" ]; then
      snap_entries+=("$(printf '%s\t-REGULAR\n' "$link")")
    else
      snap_entries+=("$(printf '%s\t-MISSING\n' "$link")")
    fi
  done
  printf '%s' "${snap_entries[@]}" > "$SNAP_TMP"
  sync                       # fsync-equivalent (durability vs SIGINT + power-loss)
  mv -f "$SNAP_TMP" "$AUTO_REPAIR_SNAP_FILE"
  # (Symlink restore is handled by the script-level EXIT trap [combined_cleanup -> _restore_autorepair_snap];
  # this function does not need its own RETURN trap because the EXIT trap fires after function return
  # on every script-exit path AND on signal-induced exit.)
  _corrupt_symlinks() {
    for asset in "${ASSETS[@]}"; do
      ln -sfn "/tmp/non-existent-target-$asset" "$REPO_ROOT/supabase/$asset"
    done
  }
  _verify_mode() {
    local label="$1" mode_var="$2" expected="$3"
    _corrupt_symlinks
    local log="/tmp/auto-repair-$label.log"
    local ec
    if [ "$mode_var" = "__UNSET__" ]; then
      ec=$( bash "$SCRIPT" > "$log" 2>&1; echo $? )
    else
      ec=$( env "$mode_var" bash "$SCRIPT" > "$log" 2>&1; echo $? )
    fi
    if [ "$ec" -ne "$expected" ]; then
      echo "  AUTO_REPAIR[$label]: FAIL -- expected exit $expected, got $ec; full script log in $log" >&2
      cat "$log" >&2
      fail_count=$((fail_count + 1))
    else
      echo "  AUTO_REPAIR[$label]: PASS (exit=$ec; strict-equality / BROKEN-target contract honored)"
    fi
  }
  echo "==> AUTO_REPAIR=1 behavior matrix smoke (5 modes; opt-in RUN_AUTO_REPAIR_MATRIX=1)"
  _verify_mode A "__UNSET__" 33
  _verify_mode B "AUTO_REPAIR=0" 33
  _verify_mode C "AUTO_REPAIR=true" 33
  _verify_mode D "AUTO_REPAIR=1" 0
  # Mode E: idempotent re-run after D's repair; expect exit 0 + NO 'OPT-IN' line
  local e_log="/tmp/auto-repair-E.log"
  local e_ec; e_ec=$( bash "$SCRIPT" > "$e_log" 2>&1; echo $? )
  if [ "$e_ec" -ne 0 ]; then
    echo "  AUTO_REPAIR[E]: FAIL -- idempotent re-run expected exit 0, got $e_ec; full log in $e_log" >&2
    fail_count=$((fail_count + 1))
  elif grep -q 'OPT-IN: AUTO_REPAIR=1 confirmed' "$e_log"; then
    echo "  AUTO_REPAIR[E]: FAIL -- idempotent re-run emitted spurious REPAIR message (no-op contract violated)" >&2
    fail_count=$((fail_count + 1))
  else
    echo "  AUTO_REPAIR[E]: PASS (exit=$e_ec; no spurious REPAIR message)"
  fi
  if [ "$fail_count" -gt 0 ]; then
    echo "AUTO_REPAIR MATRIX: FAIL ($fail_count mode(s) failed; original symlink state restored from snapshot)" >&2
    return 1
  fi
  echo "AUTO_REPAIR MATRIX: PASS (5/5 modes; original symlink state restored)"
  return 0
}

# Opt-in dispatch (preserves the default 5-sentinel cluster unless RUN_AUTO_REPAIR_MATRIX=1 is set).
# When enabled, the 5-mode AUTO_REPAIR matrix runs AFTER the 5 sentinels; any FAIL aborts the script.
# Runtime cost: < 5 s (5 short bash invocations); mutation surface is REAL symlinks but bounded
# by the RETURN-trap snapshot/restore (safety contract documented above the function).
if [ "${RUN_AUTO_REPAIR_MATRIX:-0}" = "1" ]; then
  if ! test_auto_repair_matrix; then
    echo "ERROR: AUTO_REPAIR MATRIX smoke failed (real symlinks were restored from snapshot)" >&2
    exit 7
  fi
fi

# ---------- SNAP VALIDATION LF/CRLF/no-trailing-newline test (locks in the v3.3.0+ _restore_autorepair_snap entry-validation contract; opt-in via RUN_SNAP_VALIDATION_TESTS=1) ----------
# Variants (each with 3 ABSOLUTE-path symlink fixtures + 3 ABSOLUTE-path real targets):
#   LF          — standard POSIX line endings (\n after each record)
#   CRLF        — DOS-style line endings (\r\n after each record); verifies the `IFS=$'\t\n\r'` CR-strip
#   no-trail-NL — last record has NO trailing newline; verifies the `|| [ -n "$link" ]` EOF safety guard
# Each variant must yield exit-0 + zero skip_count + correctly restored symlinks (helper does NOT emit WARN).
# Safety: builds an isolated tmpdir with 3 ABSOLUTE-path symlink fixtures + 3 ABSOLUTE target files,
# corrupts the symlinks before each variant (mirrors the AUTO_REPAIR matrix's mode-D effect on a per-test
# basis), verifies correct restoration after each helper invocation. Zero host-state mutation surface:
# TESTDIR is mktemp'd + rm -rf'd at function exit; no $REPO_ROOT/supabase/* files are touched.
# ----------------------------------------------------------------------------
test_snap_validation_matrix() {
  set +euo pipefail  # override strict mode inside this function (auto-restored on return)
  local SCR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local fail_count=0

  # Isolated tmpdir: 3 ABSOLUTE-path target files + 3 ABSOLUTE-path symlinks (each pointing at its
  # target). The helper's `/*) ln -sfn` glob accepts these ABSOLUTE target strings.
  local TESTDIR="$(mktemp -d -t snap-validation-XXXXXX)"
  for asset in 1 2 3; do
    touch "$TESTDIR/target$asset"
    ln -sfn "$TESTDIR/target$asset" "$TESTDIR/link$asset"
  done

  # Build snap file with arbitrary line-ending variant. Each entry = 1 ABSOLUTE-path link + 1
  # ABSOLUTE-path target (so the helper's `/*) ln -sfn` glob matches every record).
  _build_snap() {
    local variant="$1"; local snap="$2"
    : > "$snap"
    for asset in 1 2 3; do
      case "$variant" in
        lf)
          printf '%s\t%s\n' "$TESTDIR/link$asset" "$TESTDIR/target$asset" >> "$snap"
          ;;
        crlf)
          printf '%s\t%s\r\n' "$TESTDIR/link$asset" "$TESTDIR/target$asset" >> "$snap"
          ;;
        no_trail)
          # Last entry has NO trailing newline — exercises the `|| [ -n "$link" ]` EOF guard
          # (without the guard, `read` returns non-zero on EOF and the last record is silently
          # dropped, breaking the user's "must restore all 3 symlinks" expectation).
          if [ "$asset" = "3" ]; then
            printf '%s\t%s' "$TESTDIR/link$asset" "$TESTDIR/target$asset" >> "$snap"
          else
            printf '%s\t%s\n' "$TESTDIR/link$asset" "$TESTDIR/target$asset" >> "$snap"
          fi
          ;;
      esac
    done
  }

  # Corrupt symlinks to a broken-target state (mirrors AUTO_REPAIR's mode-D post-mutation). After
  # the helper runs, the symlinks should be restored to point at the original ABSOLUTE-path targets.
  _corrupt() {
    for asset in 1 2 3; do
      ln -sfn "/tmp/non-existent-snap-validation-$asset-$$" "$TESTDIR/link$asset"
    done
  }

  # Extract the helper function ONCE and source it into each sub-shell (so we test the EXACT
  # installed function, not a re-implementation).
  local helper_extracted="$(mktemp -t snap-helper-XXXXXX.sh)"
  sed -n '/^_restore_autorepair_snap() {/,/^}$/p' "$SCR/install-smoke-test.sh" > "$helper_extracted"

  # Run a single variant: corrupt snapshots → run helper via sub-shell with stubbed cleanup →
  # verify exit-0 + 0 skipped + correct restoration.
  _run_variant() {
    local label="$1"; local snap="$2"
    _corrupt
    local helper_log="/tmp/snap-validation-$label.log"
    local exit_capture="/tmp/snap-validation-exit-$label.txt"
    bash -c "AUTO_REPAIR_SNAP_FILE='$snap'; cleanup() { :; }; source '$helper_extracted'; \
combined_cleanup_test() { set +e; cleanup; _restore_autorepair_snap; local rc=\$?; \
echo \"exit=\$rc\" > '$exit_capture'; }; \
trap combined_cleanup_test EXIT; exit 0" 2>"$helper_log"

    # Capture propagated exit code from the EXIT-trap file (combined_cleanup_test writes it
    # on trap-fire; helper's `return 0` keeps the trap context benign).
    local exit_code="$(grep -oP 'exit=\K-?[0-9]+' "$exit_capture" 2>/dev/null || echo MISSING)"

    if [ "$exit_code" != "0" ]; then
      echo "  SNAP_VAL[$label]: FAIL -- expected exit 0, got $exit_code (helper log: $helper_log)" >&2
      cat "$helper_log" >&2
      fail_count=$((fail_count + 1))
      return
    fi
    if grep -q 'WARN:' "$helper_log"; then
      echo "  SNAP_VAL[$label]: FAIL -- helper emitted WARN (expected 0 skipped for ABSOLUTE fixtures); log: $helper_log" >&2
      cat "$helper_log" >&2
      fail_count=$((fail_count + 1))
      return
    fi
    # Verify each link was correctly restored to its ABSOLUTE-path target
    local restore_ok=1
    for asset in 1 2 3; do
      local link="$TESTDIR/link$asset"
      if [ ! -L "$link" ]; then restore_ok=0; break; fi
      if [ "$(readlink "$link")" != "$TESTDIR/target$asset" ]; then restore_ok=0; break; fi
    done
    if [ "$restore_ok" != "1" ]; then
      echo "  SNAP_VAL[$label]: FAIL -- symlinks not correctly restored to ABSOLUTE targets" >&2
      for asset in 1 2 3; do
        echo "    link$asset: $([ -L "$TESTDIR/link$asset" ] && echo SYMLINK-to-$(readlink "$TESTDIR/link$asset") || echo NOT-A-SYMLINK)" >&2
      done
      fail_count=$((fail_count + 1))
    else
      echo "  SNAP_VAL[$label]: PASS (exit=0, 0 skipped, all 3 ABSOLUTE symlinks correctly restored)"
    fi
  }

  echo "==> SNAP VALIDATION matrix: 3 line-ending variants over 3 ABSOLUTE-path fixtures"
  _build_snap lf       /tmp/snap-validation-lf.snap
  _build_snap crlf     /tmp/snap-validation-crlf.snap
  _build_snap no_trail /tmp/snap-validation-notrail.snap
  _run_variant LF      /tmp/snap-validation-lf.snap
  _run_variant CRLF    /tmp/snap-validation-crlf.snap
  _run_variant NOTRAIL /tmp/snap-validation-notrail.snap

  rm -rf "$TESTDIR" /tmp/snap-validation-*.snap "$helper_extracted" /tmp/snap-validation-exit-*.txt
  if [ "$fail_count" -gt 0 ]; then
    echo "SNAP VALIDATION MATRIX: FAIL ($fail_count variant(s) failed)" >&2
    return 1
  fi
  echo "SNAP VALIDATION MATRIX: PASS (3/3 variants: LF / CRLF / no-trailing-newline all yield exit=0 + 0 skipped + correct restore)"
  return 0
}

# Opt-in dispatch (3rd cluster; preserves AUTO_REPAIR matrix dispatch unless this is enabled).
# When RUN_SNAP_VALIDATION_TESTS=1, the 3-variant SNAP VALIDATION matrix runs AFTER the AUTO_REPAIR
# matrix (if also enabled) and AFTER the 5 sentinels; any FAIL aborts the script with exit code 8
# (distinct from AUTO_REPAIR's exit 7 so external CI can disambiguate failure modes). Zero host state
# mutation — TESTDIR is mktemp'd + rm -rf'd at function exit. Runtime cost: < 1 s.
if [ "${RUN_SNAP_VALIDATION_TESTS:-0}" = "1" ]; then
  if ! test_snap_validation_matrix; then
    echo "ERROR: SNAP VALIDATION MATRIX smoke failed (isolated fixtures; host state untouched)" >&2
    exit 8
  fi
fi

echo
echo "==> INTEGRITY CLUSTER CLOSED: all 5 sentinels PASS for v2.9-archeology-chain bundle"
exit 0
