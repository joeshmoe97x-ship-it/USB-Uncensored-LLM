#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Provenance: introduced by `3a52e32` (`chore(infra): persist capture-v6.sh + scrub_and_build.py + audit_script.sh + supabase config`); audit-chain adoption v2.1; consolidated at v2.6 as a thin wrapper delegating to canonical in-app capture-v6 script.
# Tripod Closure: see `app/docs/ops-notes.md` #capture-v6-vs-playwright-discovery-scope-gap (the wrapper delegates to canonical in-app capture-v6; the tripod closure is owned by the canonical script — this wrapper has zero orchestration logic of its own).
# Anchor Covenant (USB-portable-default): the wrapper sets PROJECT_DIR to Linux-USB-portable layout ($HOME/USB-Uncensored-LLM/Linux/app) when not set by caller, and forwards PYTHON_SCRIPT + LOG_DIRTY env-v to the canonical in-app script. The canonical anchor surface (jq-fallback to supabase status keys + auto-detect of STUB_REL layout) lives in the canonical in-app script — the wrapper does not duplicate it.
# Disambiguation: legacy USB-portable thin wrapper — sets PROJECT_DIR to the Linux-USB-portable layout (a) when no caller env override is present, then delegates to canonical in-app capture-v6 script via exec; captures no orchestration logic of its own (intentionally ~15 lines including SPDX); the underlying canonical is the v2.6 unified orchestration logic.
# Tag Chain: synced as of audit-cycle-v2.6.
# ----------------------------------------------------------------------------
# Thin wrapper: capture-pipeline orchestration logic lives in
#   app/tests/e2e/_tools/capture-baseline/capture-v6.sh
# (the v2.6-unified canonical). This wrapper sets Linux-USB-portable PROJECT_DIR
# defaults and delegates via exec. Direct invocation from camaras-subtree hosts
# (i.e., callers that have set PROJECT_DIR=$HOME/Downloads/camaras explicitly)
# bypasses this wrapper and runs the canonical directly.
set -e
export PROJECT_DIR="${PROJECT_DIR:-$HOME/USB-Uncensored-LLM/Linux/app}"
# STUB_REL auto-detected in canonical; default Linux-USB-portable = in-dir layout (no `app/` prefix).
# Override per-deployment if camaras-subtree layout is in use.
export STUB_REL="${STUB_REL:-tests/e2e/_baseline-run.json}"
# PYTHON_SCRIPT forwarded with the v2.6 default; callers may override.
export PYTHON_SCRIPT="${PYTHON_SCRIPT:-/home/bgdaddy/USB-Uncensored-LLM/Linux/scrub_and_build.py}"
# LOG_DIRTY forwarded: when 1, the canonical script redirects stdout/stderr inner-FD
# (overrides caller outer-redirects). Useful for scripted capture cycles that want the
# log on disk AND in tmux/terminal — caller decides.
export LOG_DIRTY="${LOG_DIRTY:-0}"
# Forward all caller args verbatim to the canonical. exec replaces this shell process.
exec "${PROJECT_DIR}/app/tests/e2e/_tools/capture-baseline/capture-v6.sh" "$@"
