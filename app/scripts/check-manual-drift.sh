#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Provenance: introduced by `THIS_COMMIT` (audit-chain adoption v3.1.5.3).
# Tripod Closure: see `../../docs/ops-notes.md` ## Operational notes + ## Adopted: archeology-cycle meta-extension (v3.1.5).
# Anchor Covenant: drift-sensitive anchor registry (label|regex) below; each anchor is a `git grep`-resolvable token that
# spans BOTH `audit_script.sh` L3 chain narrative AND the script body itself; the drift detector extracts the SET of values
# matching each anchor's regex from `HEAD:audit_script.sh` and from the working-tree `audit_script.sh`, then set-compares;
# any non-equal SET emits a DRIFT marker (the gate mode decides whether to fail).
# Disambiguation: validation tool (3-mode drift-gate) — pure-bash + grep + sort -u + mktemp
# + minimal POSIX sed (NO awk state machine, NO dependency on audit-script-internal no_state_max sentinel);
# MODE=pre-commit   — emits drift warning to stdout; exits 0 (informational; dev may not have finalized spec yet);
# MODE=commit-msg   — receives commit-msg file path as $2; if drift detected AND anchor label not in commit msg, exits 1
#                     (forces dev to either revert the drift OR document the anchor label in the commit msg);
# MODE=ci           — pure drift-vs-HEAD check; if drift detected, exits 1 (post-merge gate);
#                       invoked after the user's commit has landed + a followup PR is opened;
#                       compares working-tree audit_script.sh to the merge-base HEAD (the prior accepted spec).
# Bypass: `--no-verify` (git-side, NOT script-side) skips BOTH pre-commit AND commit-msg hooks; CI layer is not bypassable.
# Tag Chain: synced with audit-cycle tag chain.
# ----------------------------------------------------------------------------
set -euo pipefail

# Input files: env vars override defaults
CURRENT_FILE="${CURRENT_FILE:-}"    # working-tree version (path or '' for auto-detect)
COMMIT_MSG_FILE="${COMMIT_MSG_FILE:-}"  # commit-msg-file (commit-msg mode only)
MODE="${MODE:-pre-commit}"          # pre-commit | commit-msg | ci

# Auto-detect working-tree path
if [ -z "$CURRENT_FILE" ]; then
  CURRENT_FILE="$(git rev-parse --show-toplevel 2>/dev/null)/audit_script.sh"
fi
if [ ! -f "$CURRENT_FILE" ]; then
  echo "FATAL: CURRENT_FILE [$CURRENT_FILE] not found" >&2
  exit 2
fi

# Resolve SPEC_FILE: caller-provided path OR extract HEAD:audit_script.sh to a temp file (always-cleaned).
SPEC_TMP=""
if [ -n "${SPEC_FILE:-}" ] && [ -f "$SPEC_FILE" ]; then
  : # caller-managed temp file, caller cleans up
else
  SPEC_TMP=$(mktemp -p "${TMPDIR:-/tmp}" -t audit-spec-XXXXXX.sh)
  git show HEAD:audit_script.sh > "$SPEC_TMP" 2>/dev/null || { echo "FATAL: cannot extract HEAD:audit_script.sh" >&2; rm -f "$SPEC_TMP"; exit 2; }
  trap 'rm -f "$SPEC_TMP"' EXIT
  SPEC_FILE="$SPEC_TMP"
fi

# Drift-sensitive anchor registry: label | regex
# (regex is bash-escaped literal for use inside `grep -oE $regex $file`)
DRIFT_ANCHORS=(
  "sentinel_path_leaf|audit-v3151-fail\\.txt"
  "sentinel_content_v3_1_5_1|v3\\.1\\.5\\.1-FAIL"
  "sentinel_content_v3_1_5_2|v3\\.1\\.5\\.2-FAIL"
  "no_state_max_threshold|no_state_max=[0-9]+"
  "inventory_count_range|\\[16, *[0-9]+\\]:"
  "validator_v3_1_5_1_regex|v3\\.1\\.5\\.[0-9]+"
  "validator_v3_1_5_2_regex|v3\\.1\\.5\\.2\\(.[0-9]+\\)?"
  "validator_v3_3_regex|v3\\.3\\.[0-9]+"
  "sentinel_path_leaf_v3_3|audit-v3151-fail\\.txt"
  "sentinel_content_v3_3|v3\\.3\\.0-FAIL"
  "parent_h3_v3_3|### Adopted: auto-symlink-helper \\(v3\\.3\\.0\\)"
  "post_tee_gate_dynamic_reader|cat.*audit-v3151-fail\\.txt"
  "validator_v3_3_0_x_regex|v3\\.3\\.0\\.[0-9]+"
  "sentinel_content_v3_3_0_x|v3\\.3\\.0\\.x-FAIL"
  "sentinel_content_v3_3_0_x_x_x|v3\\.3\\.0\\.x\\.x\\.x-FAIL"
  "validator_v3_3_0_x_x_x_regex|v3\\.3\\.0\\.[0-9]+\\.[0-9]+\\.[0-9]+"
  "validator_v3_3_0_x_x_x_x_regex|v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"
  "validator_v3_3_0_x_x_x_x_x_regex|v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"
  "validator_v3_3_0_x_x_x_x_x_x_regex|v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"
  "validator_v3_3_0_x_x_x_x_x_x_x_regex|v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"
  "validator_v3_3_0_x_x_x_x_x_x_x_x_regex|v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"
  "validator_v3_3_0_x_x_x_x_x_x_x_x_x_regex|v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"
  "validator_v3_3_0_x_x_x_x_x_x_x_x_x_x_regex|v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"
  "sentinel_content_v3_3_0_x_x_x_x_x_x_x_x_x_x|v3\.3\.0\.x\.x\.x\.x\.x\.x\.x\.x\.x\.x-FAIL"
  "sentinel_content_v3_3_0_x_x_x_x_x_x_x_x_x|v3\.3\.0\.x\.x\.x\.x\.x\.x\.x\.x\.x-FAIL"
  "sentinel_content_v3_3_0_x_x_x_x_x_x_x_x|v3\.3\.0\.x\.x\.x\.x\.x\.x\.x\.x-FAIL"
  "sentinel_content_v3_3_0_x_x_x_x_x_x_x|v3\.3\.0\.x\.x\.x\.x\.x\.x\.x-FAIL"
  "sentinel_content_v3_3_0_x_x_x_x_x_x|v3\.3\.0\.x\.x\.x\.x\.x\.x-FAIL"
  "sentinel_content_v3_3_0_x_x_x_x_x|v3\.3\.0\.x\.x\.x\.x\.x-FAIL"
  "sentinel_content_v3_3_0_x_x_x_x|v3\.3\.0\.x\.x\.x\.x-FAIL"
  "sentinel_content_v3_3_0_x_x|v3\\.3\\.0\\.x\\.x-FAIL"
  "validator_v3_3_0_x_x_regex|v3\\.3\\.0\\.[0-9]+\\.[0-9]+"
)

# Helper: extract unique-sorted set of regex matches from a file (null-safe)
extract_anchor_set() {
  local file="$1" regex="$2"
  # Use grep -hoE for max portability: -h = no filename, -o = match-only, -E = ERE
  grep -hoE "$regex" "$file" 2>/dev/null | sort -u | paste -sd '|' -
}

# Drift detection: emit count + drift report (0 = clean, 1 = drift detected)
DRIFT_REPORT=""
DRIFT_LABELS=()
DRIFT_COUNT=0
i=0
while [ $i -lt "${#DRIFT_ANCHORS[@]}" ]; do
  entry="${DRIFT_ANCHORS[$i]}"
  label="${entry%%|*}"
  regex="${entry#*|}"
  # v3.3.0 self-fix: tolerate empty spec_set / current_set (which is expected behavior on
  # initial adoption of NEW anchor entries whose regex has no matches in HEAD's
  # audit_script.sh yet). Without the `|| true`, `grep` exit=1 (no matches) propagates
  # through `pipefail` and triggers `set -e` abort BEFORE the loop body runs, masking the
  # iteration over subsequent anchors and returning exit=1 from the script regardless of
  # MODE (pre-commit / commit-msg / ci all exit 1 even when drift == 0). With `|| true`,
  # the function returns 0 and the empty SET is pipe-pastable to the rest of the loop;
  # this preserves the original contract (drift-vs-HEAD detection) while honoring the
  # v3.1.5 INAUGURAL anchor-addition pattern (each NEW anchor starts as drift by design
  # because spec_set is empty until the committing commit lands in HEAD).
  spec_set=$(extract_anchor_set "$SPEC_FILE" "$regex" || true)
  current_set=$(extract_anchor_set "$CURRENT_FILE" "$regex" || true)
  if [ "$spec_set" != "$current_set" ]; then
    DRIFT_COUNT=$((DRIFT_COUNT + 1))
    DRIFT_LABELS+=("$label")
    DRIFT_REPORT="${DRIFT_REPORT}  DRIFT[$label]: spec=[$spec_set] current=[$current_set]
"
  fi
  i=$((i + 1))
done

case "$MODE" in
  pre-commit)
    if [ "$DRIFT_COUNT" -gt 0 ]; then
      echo "----------------------------------------------------------"
      echo "MANUALCHANGES-VS-USER-SPEC drift detected: $DRIFT_COUNT anchor(s) differ from HEAD's spec"
      echo "Anchor list (must be documented in your commit message OR the drift must be reverted):"
      printf '  - %s\n' "${DRIFT_LABELS[@]}"
      echo "Drift details:"
      printf '%s' "$DRIFT_REPORT"
      echo "----------------------------------------------------------"
      echo "  INFO: pre-commit mode does not FAIL on drift (use it as a check-loop). The hard gate"
      echo "        fires in commit-msg mode (this commit's message is checked), and CI mode"
      echo "        (post-merge, drift-vs-merge-base)."
      echo "        To bypass: git commit --no-verify (NOT recommended)."
      echo "----------------------------------------------------------"
    else
      echo "check-manual-drift.sh: clean (0 drift anchors differ from HEAD)"
    fi
    exit 0
    ;;

  commit-msg)
    if [ -z "$COMMIT_MSG_FILE" ] || [ ! -f "$COMMIT_MSG_FILE" ]; then
      echo "FATAL: commit-msg mode requires COMMIT_MSG_FILE=[path-to-commit-msg-file]" >&2
      exit 2
    fi
    if [ "$DRIFT_COUNT" -eq 0 ]; then
      echo "check-manual-drift.sh: clean (0 drift) — commit-msg mode PASS"
      exit 0
    fi
    # Drift detected — every drift label must appear in commit-msg
    missing_labels=()
    for label in "${DRIFT_LABELS[@]}"; do
      if ! grep -qF "$label" "$COMMIT_MSG_FILE"; then
        missing_labels+=("$label")
      fi
    done
    if [ "${#missing_labels[@]}" -gt 0 ]; then
      echo "----------------------------------------------------------" >&2
      echo "MANUALCHANGES-VS-USER-SPEC undocumented drift: ${#missing_labels[@]} anchor label(s) NOT in commit msg" >&2
      printf '  MISSING: %s\n' "${missing_labels[@]}" >&2
      echo "" >&2
      echo "Required: each drift anchor MUST be referenced by its literal label in commit msg body." >&2
      echo "Example commit msg lines (include ONE of these per drift label):" >&2
      for label in "${missing_labels[@]}"; do
        echo "  - $label: <reason for spec deviation>" >&2
      done
      echo "----------------------------------------------------------" >&2
      exit 1
    fi
    echo "check-manual-drift.sh: drift $DRIFT_COUNT anchor(s) found, ALL documented in commit msg — commit-msg mode PASS"
    exit 0
    ;;

  ci)
    if [ "$DRIFT_COUNT" -gt 0 ]; then
      echo "----------------------------------------------------------" >&2
      echo "MANUALCHANGES-VS-USER-SPEC drift detected in CI: $DRIFT_COUNT anchor(s) differ from HEAD" >&2
      printf '  - %s\n' "${DRIFT_LABELS[@]}" >&2
      echo "" >&2
      echo "Drift details:" >&2
      printf '%s' "$DRIFT_REPORT" >&2
      echo "" >&2
      echo "CI gate: hard-FAIL on any drift (no commit-msg justification accepted at CI layer)." >&2
      echo "         Revert the drift OR open an intentional PR + run the audit-script to verify." >&2
      echo "----------------------------------------------------------" >&2
      exit 1
    fi
    echo "check-manual-drift.sh: clean (0 drift) — CI mode PASS"
    exit 0
    ;;

  *)
    echo "FATAL: unknown MODE [$MODE] (expected: pre-commit | commit-msg | ci)" >&2
    exit 2
    ;;
esac
