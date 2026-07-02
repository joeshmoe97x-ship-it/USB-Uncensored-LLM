#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Provenance: introduced by `THIS_COMMIT` (audit-chain adoption v3.3.0 — inaugural v3.3.x sub-cycle applying the v3.1.5 forward-extension-surface convention to a NEW parent cycle; closes the L534 STATE OPEN audit-note deferred from the v3.2.0 followup track).
# Tripod Closure: see `../../docs/ops-notes.md` #adopted-auto-symlink-helper-v3-3-0 Adopted H3.
# Anchor Covenant (CLI): depends on root `.gitignore` bounds `/supabase/{functions,migrations,seed.sql}` (3 gitignored paths whose canonical source-of-truth lives at `app/supabase/{functions,migrations,seed.sql}`); never operates on `/supabase/config.toml` (NOT gitignored, duplicated by design — see `app/supabase/config.toml` for the canonical copy and `supabase/config.toml` for the host-bootstrap copy).
# Disambiguation: host-bootstrap symlink utility for Supabase CLI parity on fresh checkouts; INDEPENDENT of `install.sh` + `start.sh` (the Ollama-oriented USB delivery pipeline); idempotent `ln -sfn` atomic-overwrite of stale/wrong/broken symlinks (gated on `AUTO_REPAIR=1` opt-in env var — default OFF; STRICT-EQUALITY match (literal `1`, no whitespace, no quoting; `AUTO_REPAIR=0`/empty/true/yes/no/`' 1'`/`'1 '` all REJECT) — without explicit opt-in the script HARD-BLOCKS exit 33 on WRONG/BROKEN-target symlinks so silent path rewrites are confirmable per-host, NOT immediate — protects hosts where the existing symlink target points at a non-`$APP_DIR` canonical (e.g. /home/bgdaddy/Downloads/camaras/... on a bagdaddy-distro clone host) from unintended re-resolve); HARD-BLOCK on regular-file/dir blocker (no destructive clobber, exit 31); HARD-BLOCK on missing canonical source (exit 32); companion audit-script `v3.3.x` sibling validator at `audit_script.sh` Phase C enforces parent H3 membership of any `[audit-note: ... v3.3.<digit> ...]` marker against SLUG `#adopted-auto-symlink-helper-v3-3-0` per the v3.1.5 forward-extension-surface contract (the validator REGISTRAR role, not the helper-EXECUTION role — this script is purely host-side state, never modifies the audit-script's regex).
# Tag Chain: synced as of audit-cycle-v3.3.0.
# ----------------------------------------------------------------------------
# Idempotent state machine for each of the 3 gitignored assets:
#   - symlink, target == canonical (resolved via readlink -f)  -> no-op (silent pass)
#   - symlink, target != canonical (wrong OR broken)         -> HARD-BLOCK exit 33 (strict-equality AUTO_REPAIR opt-in required); OR atomic REPAIR via `ln -sfn` IF `AUTO_REPAIR=1` env var is set (literal `1`, no whitespace, no quoting)
#   - non-symlink regular file/dir blocker                    -> HARD-BLOCK exit 31 (no clobber)
#   - none                                                   -> CREATE via `ln -s`
#   - canonical source missing                                -> HARD-BLOCK exit 32 (signals manual remediation needed)
# All 3 assets share the canonical location `$APP_DIR/supabase/<asset>`. Re-runnable
# any number of times across hosts (idempotent end-to-end). ONE env-var input:
#   `AUTO_REPAIR=1` -- explicit per-host confirmation that an existing WRONG/BROKEN
#   symlink may be silently overwritten via atomic `ln -sfn` to point at `$APP_DIR/supabase/<asset>`.
#   STRICT-EQUALITY: literal `1` required. `AUTO_REPAIR=0`/unset/empty/`true`/`yes`/`no`/`' 1'`/`'1 '`
#   ALL REJECT through exit 33 with an actionable stderr message naming the detected target + expected
#   canonical + opt-in command + diagnostic commands.
#   DEFAULT-OFF (unset OR !=1 reroute through exit 33); opt-in is required because on hosts
#   where the existing symlink target differs from `$APP_DIR/supabase/<asset>` (e.g. a
#   bagdaddy-distro clone whose symlinks point at `/home/bgdaddy/Downloads/camaras/...`
#   upstream of the USB-delivery cache) the REPAIR rewrites the resolver path; per-host
#   confirmation prevents accidental path drifts. Resolves `$APP_DIR` + `$REPO_ROOT` from the
#   script's own BASH_SOURCE path (matches sibling `bootstrap-admin.sh` + `check-manual-drift.sh`
#   self-resolution pattern).
# Exit-code ladder: 0 = OK, 31 = regular-file blocker (HARD-BLOCK no clobber), 32 = canonical-missing
#   blocker (signals manual remediation), 33 = WRONG/BROKEN-target with opt-in required (auto-REPAIR
#   gated on AUTO_REPAIR=1). Callers can branch on the specific exit code for distinct remediation
#   workflows (33 -> re-run with AUTO_REPAIR=1; 31/32 -> manual operator intervention).
# Companion to: `audit_script.sh` v3.3.x validator + `app/scripts/check-manual-drift.sh`
#               registry anchor additions.
# ----------------------------------------------------------------------------
set -euo pipefail

# Self-resolve paths from BASH_SOURCE so the script is callable from any CWD
# (mirrors `bootstrap-admin.sh` raw CWD semantics + `check-manual-drift.sh` path-resolution pattern).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/.." && pwd)"

CANONICAL_BASE="$APP_DIR/supabase"
EPHEMERAL_BASE="$REPO_ROOT/supabase"

# asset_ephermal_root_component | asset_canonical_app_relative_path
ASSETS=(
  "migrations|$CANONICAL_BASE/migrations"
  "functions|$CANONICAL_BASE/functions"
  "seed.sql|$CANONICAL_BASE/seed.sql"
)

ensure_link() {
  local ephem_name="$1"
  local canonical="$2"
  local ephem="$EPHEMERAL_BASE/$ephem_name"
  local abs_canonical

  # Pre-flight: canonical source must exist; otherwise we can't safely point any link at it.
  if [ ! -e "$canonical" ]; then
    echo "[ensure-supabase-symlinks] HARD-BLOCK: canonical source not found: $canonical" >&2
    echo "    (expected at \$APP_DIR/supabase/$ephem_name, i.e. <repo-root>/app/supabase/$ephem_name)" >&2
    echo "    Refusing to create a dangling symlink. Restore the canonical file/dir and re-run." >&2
    return 32
  fi

  # Compute absolute canonical path so readlink -f comparisons are CWD-independent
  # (a relative path would compare against the literal stored target, not the resolved one,
  # and would false-positive on every run when the script is invoked from a different CWD).
  abs_canonical="$(cd "$(dirname "$canonical")" && pwd)/$(basename "$canonical")"

  # State 1: symlink already present (whether dangling or pointing somewhere).
  if [ -L "$ephem" ]; then
    local current_target
    current_target="$(readlink -f "$ephem" 2>/dev/null || true)"
    if [ "$current_target" = "$abs_canonical" ]; then
      echo "[ensure-supabase-symlinks] OK (symlink correct): $ephem -> $abs_canonical"
      return 0
    fi
    # Wrong or broken target: opt-in to atomic REPAIR. Default-OFF per Disambiguation
    # contract (protects hosts with non-$APP_DIR canonical from silent path rewrites).
    local label
    if [ -z "$current_target" ]; then
      label="BROKEN (target missing)"
    else
      label="WRONG target: $current_target"
    fi
    echo "[ensure-supabase-symlinks] DETECT: $ephem -- $label (expected: $abs_canonical)" >&2
    # AUTO_REPAIR opt-in: env var `AUTO_REPAIR=1` confirms per-host intent to REPAIR silently.
    # Anything else (unset, empty, !=1) routes through HARD-BLOCK exit 33 with explicit
    # opt-in-instruction so the operator can dry-run-via-stdout BEFORE committing to the path
    # rewrite. Exit-code-33 ladder sits above the regular-file blocker (31) and missing-source
    # blocker (32) so callers can distinguish DRIFT-WANTS-OPT-IN vs DATA-MUST-BE-PRESERVED.
    if [ "${AUTO_REPAIR:-0}" != "1" ]; then
      # Centralize the reject exit code in one local so printf-prefix + return can NOT
      # drift (single source-of-truth). Deriving from the caller's `$rc` would be wrong:
      # that var is only set in the caller's `|| { rc=$?; ... }` fallback block, not in
      # this function -- reading it here would hit `set -u` and bail with exit 1.
      local reject_exit=33
      printf >&2 '[ensure-supabase-symlinks] exit %d: AUTO_REPAIR not set to 1; refusing silent symlink REPAIR.\n' "$reject_exit"
      cat >&2 <<EOF
    Detected: $ephem points at: $label
    Expected:  $abs_canonical
    To opt in to silent atomic REPAIR (atomic ln -sfn; never clobbers real data; only
    rewrites the resolver path of the symlink ITSELF, never the symlink target's contents),
    re-run with AUTO_REPAIR=1 (strict-equality match; see script header for full contract):
      AUTO_REPAIR=1 bash app/scripts/ensure-supabase-symlinks.sh

    Diagnostic commands (run these in a SEPARATE shell to inspect before deciding; not part of this script's payload):
      ls -la $ephem
      readlink -f $ephem
EOF
      return "$reject_exit"
    fi
    # Opt-in confirmed: atomic REPAIR (ln -sfn replaces the link itself, never the target).
    echo "[ensure-supabase-symlinks] OPT-IN: AUTO_REPAIR=1 confirmed; performing atomic REPAIR $ephem -> $abs_canonical"
    ln -sfn "$abs_canonical" "$ephem"
    return 0
  fi

  # State 2: non-symlink regular entry blocker. HARD-BLOCK, never clobber: the user's
  # actual data or tracked config lives here and an unconscious `rm + ln -s` would be
  # data loss. Operator must remove manually if they want the symlink semantics.
  if [ -e "$ephem" ]; then
    echo "[ensure-supabase-symlinks] HARD-BLOCK: $ephem is a non-symlink regular entry" >&2
    echo "    (refusing to clobber — operator must `rm -f $ephem` manually if intentional)" >&2
    return 31
  fi

  # State 3: target absent. Create fresh symlink.
  echo "[ensure-supabase-symlinks] CREATE: $ephem -> $abs_canonical"
  ln -s "$abs_canonical" "$ephem"
  return 0
}

# Iterate assets. CRITICAL invariant: pre-capture rc via the `|| `${rc=$?; ...}` pattern.
# `set -e` is active above. The `|| { ... }` form is the documented bash exception that
# prevents set -e from aborting when ensure_link returns non-zero (so we can read the real
# exit code into `$rc` instead of the script just dying silently). Reading `$?` AFTER
# `if ! ensure_link` would be wrong: the `!` operator inverts the function's exit to its
# own `$?` (0 iff function returned non-zero), masking real exit codes like 33 (defeats
# the exit-code ladder that distinguishes 31/32/33 for distinct remediation workflows).
# Behavior: ABORT-on-first-fail identical to original intent -- break via `exit` inside the
# fallback block. If you want to upgrade to "process all 3 + report all failures + exit
# non-zero if any", refactor to accumulate rc values across iterations and emit a summary
# row at the end; preserve `exit "${highest_rc}"` semantics for distinct remediation.
echo "[ensure-supabase-symlinks] resolving repo root via BASH_SOURCE (canonical=$CANONICAL_BASE; ephemeral=$EPHEMERAL_BASE)"
for entry in "${ASSETS[@]}"; do
  ephem_name="${entry%%|*}"
  canonical="${entry#*|}"
  ensure_link "$ephem_name" "$canonical" || {
    # CRITICAL invariant: `rc=$?` MUST be the FIRST statement in this block.
    # `$?` reflects ensure_link's exit code (33 on REJECT, 31 on regular-file blocker,
    # 32 on missing source). ANY command before `rc=$?` resets `$?` to 0 (its success
    # status) and masks the real exit code, defeating the 0/31/32/33 ladder contract.
    # If you need to log before capturing rc, write `rc=$?` AS the first statement,
    # then echo/log afterward using `$rc` not `$?`.
    rc=$?
    echo "[ensure-supabase-symlinks] ABORT: $ephem_name failed (exit $rc); remaining assets skipped" >&2
    exit "$rc"
  }
done

echo "[ensure-supabase-symlinks] DONE — all 3 gitignored Supabase assets point at canonical app/supabase location"
exit 0
