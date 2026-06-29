#!/usr/bin/env bash
# capture-tsc-baseline.sh
#
# Idempotent re-capture of the TypeScript regression baseline.
# Overwrites app/docs/tsc-baseline.txt with verbatim stdout/stderr of `tsc --noEmit`.
#
# Context: Provides a forward-durable archeology artifact to prove the clean-baseline
# signal persists across capture cycles + downstream type widenings. The zero-byte
# form is the canonical clean signal (tsc exit=0 + zero errors → empty stdout/stderr).
# Cites: app/docs/ops-notes.md § TS2345 baseline followup + § Post-co-mingle
# re-verification (commit d99f7e0); see also the audit chain cited there
# (4b10cf1 → 809e411 → dac0f47).
#
# Exit codes:
#   0  = Clean capture (tsc exit 0)
#   31 = tsc completed but found errors (exit != 0)
#   32 = Prerequisite missing (npx not found on PATH)
#   33 = Initialization / write logic failure (cd failure, mkdir failure)

set -euo pipefail

DRY_RUN=0
for arg in "$@"; do
  if [ "$arg" = "--dry-run" ]; then DRY_RUN=1; fi
done

# Project-anchoring: find `app/` relative to script location, robust against
# arbitrary invocation cwd. Mirrors the convention used elsewhere in this repo
# (e.g. the path-safe $PROJECT_DIR bootstrap in capture-v6.sh); defends against
# the /home/bagdaddy/ intermittent-absence quirk documented in ops-notes.md.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_FILE="docs/tsc-baseline.txt"

if ! command -v npx >/dev/null 2>&1; then
  echo "FATAL: npx command not found on PATH (exit 32)" >&2
  exit 32
fi

cd "$APP_DIR" || { echo "FATAL: could not cd to $APP_DIR (exit 33)" >&2; exit 33; }

if [ "$DRY_RUN" = "1" ]; then
  echo "[dry-run] Would re-capture $APP_DIR/$OUT_FILE via:"
  echo "[dry-run]   cd $APP_DIR && npx --no-install tsc --noEmit -p tsconfig.app.json > $OUT_FILE 2>&1"
  echo "[dry-run] Running tsc interactively for preview (output lands on terminal, NOT in $OUT_FILE)..."
  TSC_EC=0
  npx --no-install tsc --noEmit -p tsconfig.app.json || TSC_EC=$?
  if [ "$TSC_EC" != "0" ]; then
    echo "[dry-run] FATAL: tsc found errors, exited with $TSC_EC (exit 31)" >&2
    exit 31
  fi
  echo "[dry-run] SUCCESS: tsc clean (file NOT modified)."
  exit 0
fi

echo "==> Capturing tsc baseline to $APP_DIR/$OUT_FILE ..."
mkdir -p "$(dirname "$OUT_FILE")"

T0=$(date +%s)
TSC_EC=0
npx --no-install tsc --noEmit -p tsconfig.app.json > "$OUT_FILE" 2>&1 || TSC_EC=$?
T1=$(date +%s)
printf '    tsc exit=%s elapsed=%ss\n' "$TSC_EC" "$((T1-T0))"

if [ "$TSC_EC" != "0" ]; then
  echo "FATAL: tsc failed with exit code $TSC_EC; see $OUT_FILE for the verbatim error output (exit 31)" >&2
  exit 31
fi

# Load-bearing Zero-Byte Signal Check
if [ -s "$OUT_FILE" ]; then
  echo "WARN: Post-capture baseline is NOT zero-byte; the forward-archeology chain is dirtied." >&2
  echo "WARN: Inspect $OUT_FILE (first 10 lines below) and re-capture after the regression resolves:" >&2
  head -10 "$OUT_FILE" >&2
  echo "WARN: Script exit=0 (advisory only); the next archeologist sees a non-canonical baseline." >&2
else
  echo "SUCCESS: Baseline is zero-byte (canonical clean signal preserved across the chain)."
fi

exit 0
