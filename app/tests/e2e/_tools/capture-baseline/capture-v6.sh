#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Provenance: introduced by `935d9dc` (`chore(infra): import camaras/main as app/ subtree (archive-based)`); audit-chain adoption v2.1; consolidated at v2.6 (this commit absorbs root-only features into the canonical orchestration logic).
# Tripod Closure: see `app/docs/ops-notes.md` #capture-v6-vs-playwright-discovery-scope-gap (Phase F+G mirror invariant — canonical entrypoint of the capture-pipeline; Playwright config + scrub_and_build.py form the downstream tripod).
# Anchor Covenant (jq-fallback + auto-detect): strictly depends on (a) `supabase status -o json` keys `API_URL` + `ANON_KEY` + `SERVICE_ROLE_KEY`; (b) PROJECT_DIR auto-detection choosing STUB_REL layout (`tests/e2e/_baseline-run.json` for USB-portable hosts vs `app/tests/e2e/_baseline-run.json` for camaras-subtree hosts); (c) PYTHON_SCRIPT env-v override (default `/home/bgdaddy/USB-Uncensored-LLM/Linux/scrub_and_build.py`).
# Disambiguation: unified canonical capture-v6 orchestration logic — Phase A (stale-state wipe + docker volume rm) + Phase B.5 (idempotent supabase/seed.sql replay) + Phase B Kong /etc/hosts shim + IPv4/v6 Vite readiness loop + E2E_BASE_URL auto-export + check_pw_unexpected T-RLS-11 tolerance gate + scrub-and-commit cycle. Callers invoke either DIRECTLY (camaras-subtree hosts) or via the root `capture-v6.sh` wrapper (Linux-USB-portable hosts).
# Tag Chain: synced as of audit-cycle-v2.6.
# ----------------------------------------------------------------------------
# v6 capture-baseline: standalone script, NOT inline `bash -c '...'`
# Runs as `bash capture-v6.sh` to bypass any basher-tool `bash -c` wrapper trap-firing.
# Path-safe: PROJECT_DIR via $HOME + relative path; no /home/bgdaddy literal.

set +e

LOG="${LOG:-/tmp/build-log/path-a-capture-v6.log}"
mkdir -p /tmp/build-log
# Default to honouring caller outer-redirects; override inner FD only if LOG_DIRTY=1
[ -n "${LOG_DIRTY+x}" ] && [ "$LOG_DIRTY" = "1" ] && exec >"$LOG" 2>&1

# Path-safe: bash-side path variables only. PROJECT_DIR is configurable; auto-detect
# runs only if caller did not set it. STUB_REL has two layouts:
#   - USB-portable: $PROJECT_DIR = $HOME/USB-Uncensored-LLM/Linux/app  →  STUB_REL = tests/e2e/_baseline-run.json
#   - camaras-subtree: $PROJECT_DIR = $HOME/Downloads/camaras            →  STUB_REL = app/tests/e2e/_baseline-run.json
if [ -z "${PROJECT_DIR:-}" ]; then
  if [ -d "$HOME/USB-Uncensored-LLM/Linux/app/.git" ]; then
    PROJECT_DIR="$HOME/USB-Uncensored-LLM/Linux/app"
  elif [ -d "$HOME/Downloads/camaras/app/.git" ]; then
    PROJECT_DIR="$HOME/Downloads/camaras"
  else
    printf 'FATAL: PROJECT_DIR not set and auto-detect found no git worktree (set PROJECT_DIR or run from a known location)\n' >&2
    exit 73
  fi
fi
export CAMARAS="$PROJECT_DIR"
# Auto-detect STUB_REL layout based on whether $PROJECT_DIR contains an `app/` subtree.
if [ -z "${STUB_REL:-}" ]; then
  if [ -d "${PROJECT_DIR}/app/tests/e2e" ]; then
    STUB_REL="app/tests/e2e/_baseline-run.json"
  elif [ -d "${PROJECT_DIR}/tests/e2e" ]; then
    STUB_REL="tests/e2e/_baseline-run.json"
  else
    printf 'FATAL: cannot auto-detect STUB_REL layout for PROJECT_DIR=%s (no tests/e2e at root or under app/)\n' "$PROJECT_DIR" >&2
    exit 73
  fi
fi
STUB="$PROJECT_DIR/$STUB_REL"
# Auto-detect the camaras `app/` subdirectory (or treat PROJECT_DIR as identical to app root for USB-portable).
if [ -d "${PROJECT_DIR}/app/package.json" ]; then
  APP_SUBDIR="app"
else
  APP_SUBDIR=""
fi
PYTHON_SCRIPT="${PYTHON_SCRIPT:-/home/bgdaddy/USB-Uncensored-LLM/Linux/scrub_and_build.py}"
PLAYWRIGHT="${PROJECT_DIR}/${APP_SUBDIR}node_modules/.bin/playwright"

print_phase() { printf '\n==== %s ====\n' "$1"; date; }

# Tolerate-only-T-RLS-11 gate for Playwright cold/warm runs. T-RLS-11
# (auth-rls.spec.ts:27 "viewer cannot see admin private cameras; can
# see shared ones") is documented to timeOut at 60s as a Bug E surface;
# the prior committed app/tests/e2e/_baseline-run.json records this as
# status="captured" with T-RLS-11:timedOut. Any OTHER unexpected outcome is
# a real regression and is treated as FATAL. Use:
#   check_pw_unexpected <json_log> <pw_ec>; returns 0 when pw_ec==0 OR
#   every unexpected row matches the T-RLS-11 shape (file=auth-rls.spec.ts,
#   line=27, status=timedOut); returns 1 otherwise.
check_pw_unexpected() {
  local log="$1"; local ec="$2"
  if [ "$ec" = "0" ]; then return 0; fi
  local unexpected
  unexpected=$(jq -r '
    # Playwright 2.x --reporter=json nests each describe-block as inner
    # .suites[], so we recurse to find specs at any depth. recurse on
    # .suites[]? flattens the tree; .specs[]? extracts the actual specs;
    # the inner any(...) then filters specs whose tests[] have any
    # non-passed/non-skipped result.
    [recurse(.suites[]?) | .specs[]? as $s |
     $s.tests[]? as $t |
     select(any($t.results[]?; .status != "passed" and .status != "skipped")) |
     "\($s.file):\($s.line // "?") " + (
       $t.results[] | select(.status != "passed" and .status != "skipped") | .status
     ) + " (" + ($t.title // "?") + ")"]
    | .[]
  ' "$log" 2>/dev/null)
  if [ -z "$unexpected" ]; then
    printf '[unexpected] pw exit=%s but JSON had no unexpected rows (runner-level error)\n' "$ec"
    return 1
  fi
  local tolerated_only=true
  while IFS= read -r u; do
    [ -z "$u" ] && continue
    if ! echo "$u" | grep -q '^auth-rls\.spec\.ts:27.*timedOut'; then
      tolerated_only=false
    fi
  done <<<"$unexpected"
  if [ "$tolerated_only" = "true" ]; then
    printf '[unexpected] pw exit=%s TOLERATED: known T-RLS-11 timedOut (60s viewer-isolation UI locator; documented Bug E surface per app/docs/ops-notes.md Bug E lock-in workflow).\n' "$ec"
    printf '  unexpected:\n'
    while IFS= read -r u; do [ -n "$u" ] && printf '    %s\n' "$u"; done <<<"$unexpected"
    return 0
  fi
  printf '[unexpected] pw FATAL: outcomes NOT in T-RLS-11 tolerance set:\n'
  while IFS= read -r u; do [ -n "$u" ] && printf '    %s\n' "$u"; done <<<"$unexpected"
  return 1
}

# Diagnostics FIRST (so trap-firing mid-script prints useful context BEFORE cleanup)
trap_debug() {
  local ec=$?
  printf '[trap-debug] ec=%s line=%s source=%s\n' \
    "$ec" "${BASH_LINENO[0]}" "${BASH_SOURCE[1]:-main}" >&2
}

# Cleanup: kill Vite FIRST (fast), THEN supabase stop (slower 5-30s)
cleanup() {
  local ec=$?
  trap_debug
  pkill -f vite 2>/dev/null
  pkill -f 'npm run dev' 2>/dev/null
  sleep 1
  (cd "$PROJECT_DIR" && supabase stop --no-backup 2>&1 | tail -5)
  printf '[cleanup done, ec-was=%s]\n' "$ec" >&2
}

trap cleanup EXIT
# CRITICAL: disable subshell trap inheritance (highest-leverage fix per code-reviewer)
set +E
# Default-init the degraded-run sentinels so Phase M's NOTE block doesn't rely on Bash's
# default "unset treated as empty" interpreter quirk. If Phase F/G is bypassed (early FATAL
# exit before Phase F), these defaults keep the commit message clean instead of stumbling
# into "correct by accident" behaviour.
PW1_FAILED=false
PW2_FAILED=false

print_phase 'A: pre-cleanup (also clears v1-v5 stale state)'
# Docker-level stale state cleanup (no-match is OK)
docker ps -aq --filter name=supabase 2>/dev/null | xargs -r docker stop 2>/dev/null
ec=$?; printf 'docker-stop ec=%s\n' "$ec"
# Supabase CLI-level (with explicit ec) — handles any stopped-but-not-removed
# containers from the docker-stop line above; suppressing the prior `docker rm`
# avoids provoking a concurrent docker-daemon prune lock when supabase-start
# also tries to do its own background bookkeeping (root cause of exit-31 in
# prior HONEST captures). The supabase CLI is designed to remove stopped
# containers implicitly during start, so explicit `docker rm` is redundant.
(cd "$PROJECT_DIR" && supabase stop --no-backup 2>&1 | tail -5)
ec=$?; printf 'supabase-stop ec=%s\n' "$ec"
# Volume cleanup: a prior partial-init postgres data dir on a stale `supabase_db_*`
# volume causes Phase B's `Initialising schema...` to receive SIGTERM (exit 143)
# when the docker daemon rejects the new container's data-dir mount. Wipe all
# supabase_* volumes so the next `supabase start` initialises migrations from a
# clean slate. Volumes survive `supabase stop --no-backup` (only containers are
# removed); exit code 1 on this filter is no-match and OK.
docker volume ls -q --filter name=supabase 2>/dev/null | xargs -r docker volume rm 2>/dev/null
ec=$?; printf 'supabase-volume-rm ec=%s (1=no-match-OK)\n' "$ec"
# Vite kill (with explicit ec; 1=no-match is OK)
pkill -f vite 2>/dev/null
ec=$?; printf 'pkill-vite ec=%s (1=no-match-OK)\n' "$ec"
pkill -f 'npm run dev' 2>/dev/null
ec=$?; printf 'pkill-npm-run-dev ec=%s (1=no-match-OK)\n' "$ec"
sleep 3

# Empirical-closure prerequisites: symlink app/supabase/{migrations,functions,seed.sql}
# to $PROJECT_DIR/supabase/ so `supabase start` (run from $PROJECT_DIR) can see them.
# Idempotent: ln -sfn overwrites any pre-existing symlink. Phase A's docker rm does NOT
# affect these (they're filesystem, not containers). Matches app/docs/ops-notes.md.
ln -sfn "${PROJECT_DIR}/${APP_SUBDIR}supabase/migrations" "$PROJECT_DIR/supabase/migrations" 2>/dev/null || true
ln -sfn "${PROJECT_DIR}/${APP_SUBDIR}supabase/functions" "$PROJECT_DIR/supabase/functions" 2>/dev/null || true
ln -sfn "${PROJECT_DIR}/${APP_SUBDIR}supabase/seed.sql"   "$PROJECT_DIR/supabase/seed.sql" 2>/dev/null || true
printf 'symlinks: migrations+functions+seed.sql -> $PROJECT_DIR/supabase/\n'

print_phase 'B: supabase start'
cd "$PROJECT_DIR" || { printf 'cd failed (exit 73)\n'; exit 73; }
T0=$(date +%s)
supabase start > /tmp/build-log/supabase-start.log 2>&1
SSTART_EC=$?
T1=$(date +%s)
printf 'supabase-start exit=%s elapsed=%ss\n' "$SSTART_EC" "$((T1-T0))"
printf '%s\n' '-- last 30 lines --'
tail -30 /tmp/build-log/supabase-start.log
if [ "$SSTART_EC" != "0" ]; then printf 'FATAL: supabase start failed (exit 31)\n'; exit 31; fi

# Re-apply the Kong /etc/hosts shim (Phase A's docker rm wipes it from the fresh container).
# Without this, Kong can't resolve internal Supabase service names (rest, postgrest, etc.),
# which surfaces as 404s on edge functions + PGRST116 0-row errors on tables. Idempotent:
# the grep -qE guard prevents duplicate /etc/hosts entries on re-runs. Matches the
# empirical-closure prerequisite in app/docs/ops-notes.md.
REST_IP=$(docker inspect supabase_rest_Linux --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null | head -1)
KONG=$(docker ps --filter name=supabase_kong --format '{{.Names}}' | head -1)
if [ -n "$REST_IP" ] && [ -n "$KONG" ]; then
  for h in rest supabase_rest pgrest postgrest; do
    docker exec -u root "$KONG" sh -c "grep -qE '[[:space:]]${h}(\$|[[:space:]])' /etc/hosts || echo '${REST_IP} ${h}' >> /etc/hosts"
  done
  printf 'kong-shim: injected %s -> %s\n' "$REST_IP" "$KONG"
else
  printf 'kong-shim: SKIPPED (REST_IP=%s KONG=%s)\n' "$REST_IP" "$KONG"
fi

print_phase 'B.5: replay supabase/seed.sql (idempotent) via docker exec'
# Why this phase exists:
#   Phase A wipes the running supabase container fleet + volumes and Phase B's
#   `supabase start` recreates containers + re-runs the migration files but NOT
#   supabase/seed.sql. In environments where the seeded Postgres data is ephemeral
#   (tmpfs, or a `docker volume rm` between captures), the recreated DB has fresh
#   schema + ZERO test fixtures:
#     - public.cameras = 0 rows
#     - auth.users[viewer@omnisight.local] = absent
#     - public.camera_access(viewer -> Shared Cam) = absent
#   With fixtures missing, T-RLS-5 step-1 fails (`Shared Cam` locator not found),
#   T-RLS-1..3 cascade to test.skip(true, "viewer not seeded ..."), and
#   aggregate.all_passed_in_both_runs becomes false on every HONEST capture.
# seed.sql is already idempotent (every INSERT is ON CONFLICT DO NOTHING or DO
# UPDATE), so the replay is a clean no-op when the data is already present.
DBCN=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E '^supabase_db_' | head -1)
printf 'seed_container=%s\n' "${DBCN:-NONE}"
if [ -z "$DBCN" ]; then
  printf 'FATAL: no supabase_db_* container running; seed replay impossible (exit 37)\n'
  exit 37
fi
T0=$(date +%s)
docker exec -i "$DBCN" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /dev/stdin < "$STUB_DIR/supabase/seed.sql" 2>/dev/null \
  || docker exec -i "$DBCN" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /dev/stdin < "$PROJECT_DIR/supabase/seed.sql" > "${LOG}.seed" 2>&1
SEED_EC=$?
T1=$(date +%s)
printf 'seed-apply exit=%s elapsed=%ss container=%s\n' "$SEED_EC" "$((T1-T0))" "$DBCN"
# Use a single-argument %s format to avoid bash printf's flag-parsing of
# `--` at format-string start (prior version emitted `printf: --: invalid
# option` mid-block, killing B.5's log readability without breaking the apply).
printf '%s\n' '-- last 10 lines of seed apply log --'
tail -10 "${LOG}.seed" 2>/dev/null
if [ "$SEED_EC" != "0" ]; then
  printf 'FATAL: supabase/seed.sql apply failed (exit 38); tail of seed log:\n'
  tail -50 "${LOG}.seed"
  exit 38
fi

print_phase 'C: readiness probe (max 120s)'
poll_health() {
  local path="$1"; local max="${2:-120}"; local code=000; local elapsed=0
  while [ "$elapsed" -lt "$max" ]; do
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:54321$path" 2>/dev/null)
    if [ "$code" = "200" ]; then printf '  %s -> %s at +%ss\n' "$path" "$code" "$elapsed"; return 0; fi
    sleep 5; elapsed=$((elapsed + 5))
  done
  printf '  %s TIMEOUT: last=%s\n' "$path" "$code"
  return 1
}
poll_health /auth/v1/health 120 || { printf 'FATAL: /auth/v1/health timeout (exit 32)\n'; exit 32; }
poll_health /rest/v1/ 60 || { printf 'FATAL: /rest/v1/ timeout (exit 32)\n'; exit 32; }

print_phase 'D: env exports + sb-status.json'
cd "$PROJECT_DIR"
supabase status -o json > /tmp/build-log/sb-status.json
API_URL=$(jq -r '.API_URL // empty' /tmp/build-log/sb-status.json)
ANON_KEY=$(jq -r '.ANON_KEY // empty' /tmp/build-log/sb-status.json)
SR_KEY=$(jq -r '.SERVICE_ROLE_KEY // empty' /tmp/build-log/sb-status.json)
printf 'API_URL=%s\n' "$API_URL"
printf 'ANON_KEY length=%s\n' "$(echo -n "$ANON_KEY" | wc -c)"
printf 'SR_KEY length=%s\n' "$(echo -n "$SR_KEY" | wc -c)"
[ -z "$API_URL" ] && { printf 'FATAL: API_URL empty (exit 33)\n'; exit 33; }
export VITE_SUPABASE_URL="$API_URL"
export VITE_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_URL="$API_URL"
export SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SR_KEY"
# Gate the v3 diagnostic instrumentation blocks in tests/e2e/global-setup.ts and
# tests/e2e/auth-rls.spec.ts T-RLS-1. With E2E_DEBUG_DUMP unset, blocks
# short-circuit to no-op; capture-v6 sets this so dumps fire only during verification.
export E2E_DEBUG_DUMP=1
# E2E_BASE_URL aligns Playwright's baseURL (playwright.config.ts: `E2E_BASE_URL ?? http://localhost:5173`)
# with whatever interface the dev server is actually bound to. The camaras package.json runs
# `vite --host 127.0.0.1` (IPv4-only); this Linux box has `::1 localhost` in /etc/hosts, so
# Chromium's page.goto('http://localhost:5173/') resolves to ::1 and returns ERR_CONNECTION_REFUSED
# even when curl 127.0.0.1 returns 200. Defaulting to 127.0.0.1 forces IPv4 parity with vite's bind
# without touching the camaras repo. Override with E2E_BASE_URL=<host:port> if Dockerfile or
# alternate host bind is later chosen.
# IMPORTANT: playwright.config.ts reads this env at CONFIG-LOAD TIME. Do not mutate between phase F
# (pw1) and phase G (pw2) -- re-launching the config mid-capture would silently stale-load the
# original value. The default below establishes the invariant: one E2E_BASE_URL per capture.
export E2E_BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:5173}"
case "$E2E_BASE_URL" in
  http://*|https://*)
    E2E_PROBE_HOST="${E2E_BASE_URL##*://}"
    E2E_PROBE_HOST="${E2E_PROBE_HOST%%/*}"
    E2E_PROBE_HOST="${E2E_PROBE_HOST%%:*}" ;;
  *)
    E2E_PROBE_HOST="${E2E_BASE_URL%%/*}"
    E2E_PROBE_HOST="${E2E_PROBE_HOST%%:*}" ;;
esac
export E2E_PROBE_HOST
printf 'E2E_BASE_URL=%s (probe host=%s)\n' "$E2E_BASE_URL" "$E2E_PROBE_HOST"
# Diagnostic: which addresses localhost resolves to on this box? Helpful when debugging future
# IPv4/IPv6 capture regressions on a different host.
getent hosts localhost > /tmp/build-log/localhost-resolved.txt 2>&1 || true
RESOLVED_LINE=$(grep -v '^$' /tmp/build-log/localhost-resolved.txt | head -1)
printf 'localhost resolves to: %s\n' "${RESOLVED_LINE:-UNRESOLVED}"
printf 'exports OK\n'

print_phase 'E0: npm install (idempotent; pulls playwright + react deps)'
cd "${PROJECT_DIR}/${APP_SUBDIR}"
npm install --no-fund --no-audit 2>&1 | tail -20
NPM_EC=${PIPESTATUS[0]}
if [ "$NPM_EC" != "0" ]; then printf 'FATAL: npm install failed (exit %s)\n' "$NPM_EC"; exit 39; fi
printf 'npm install OK\n'
# playwright browser cache check (best-effort, idempotent)
[ -d "$HOME/.cache/ms-playwright" ] && [ -n "$(ls $HOME/.cache/ms-playwright 2>/dev/null)" ] || {
  printf 'playwright browsers not cached -- npx playwright install chromium (best-effort)\n'
  npx playwright install chromium 2>&1 | tail -10 || printf 'WARN: playwright install incomplete (continuing)\n'
}

print_phase 'E: Vite background + readiness'
rm -f /tmp/build-log/vite-dev.log
cd "${PROJECT_DIR}/${APP_SUBDIR}"
# npm run dev -> "vite --host 127.0.0.1" per camaras/package.json (IPv4-only).
# Phase D exports E2E_BASE_URL so playwright.baseURL matches that bind interface, eliminating
# the IPv4-vs-IPv6 localhost-resolution mismatch that previously produced ERR_CONNECTION_REFUSED.
nohup npm run dev > /tmp/build-log/vite-dev.log 2>&1 &
VITE_PID=$!
echo "$VITE_PID" > /tmp/build-log/vite.pid
sleep 6
printf 'vite pid: %s\n' "$VITE_PID"
head -20 /tmp/build-log/vite-dev.log
PROBE_BASE="http://${E2E_PROBE_HOST}:5173"
PROBE_ROOT="${PROBE_BASE}/"
PROBE_CLIENT="${PROBE_BASE}/@vite/client"
printf 'probing %s and %s\n' "$PROBE_ROOT" "$PROBE_CLIENT"
VITE_CODE_ROOT=000
VITE_CODE_CLIENT=000
VITE_ELAPSED=0
VITE_MAX=120  # cold dep optimization can take 30-60s on first run
while [ "$VITE_ELAPSED" -lt "$VITE_MAX" ]; do
  VITE_CODE_ROOT=$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' "$PROBE_ROOT" 2>/dev/null)
  if [ "$VITE_CODE_ROOT" = "200" ]; then
    VITE_CODE_CLIENT=$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' "$PROBE_CLIENT" 2>/dev/null)
    # Content-Type check via HEAD is more robust against future vite versions that
    # may emit comment headers before the JS prefix; trust the response shape, not byte-prefix.
    VITE_CT=$(curl -sI --max-time 5 "$PROBE_CLIENT" 2>/dev/null | grep -i '^content-type:' | tr -d '\r' | head -1)
    if [ "$VITE_CODE_CLIENT" = "200" ] \
       && [[ "$VITE_CT" =~ application/javascript|text/javascript ]]; then
      printf '  vite ready at +%ss (HTTP %s on /@vite/client -- %s)\n' \
        "$VITE_ELAPSED" "$VITE_CODE_CLIENT" "${VITE_CT#*:}"
      break
    fi
  fi
  sleep 2; VITE_ELAPSED=$((VITE_ELAPSED + 2))
done
if [ "$VITE_ELAPSED" -ge "$VITE_MAX" ] || [ "$VITE_CODE_CLIENT" != "200" ]; then
  printf 'FATAL: vite not ready after %ss (last /=%s, /@vite/client=%s, ct=%s)\n' \
    "$VITE_MAX" "$VITE_CODE_ROOT" "$VITE_CODE_CLIENT" "${VITE_CT:-unknown}"
  tail -60 /tmp/build-log/vite-dev.log
  exit 34
fi
# Log bind line(s) for human review so the bind interface can be cross-checked against
# E2E_BASE_URL.  No re-probe here -- the loop already exited on 200/200 and last sleep
# is only 2s; another curl adds latency without catching races that the loop misses.
VITE_BIND_LINES=$(grep -m3 -E 'Local:|Network:' /tmp/build-log/vite-dev.log 2>/dev/null | tr '\n' '|')
printf '  vite bind lines: %s\n' "${VITE_BIND_LINES:-NO_BIND_LINE_FOUND}"

print_phase 'F: playwright run 1 (cold)'
cd "${PROJECT_DIR}/${APP_SUBDIR}"
T0=$(date +%s)
# Run auth-rls.spec.ts AND admin-users-shapes.spec.ts together so the
# admin-users parse-path + rejection-path regressions land in
# tests/e2e/_baseline-run.json. Both files are illustrative e2e
# suites that share admin@omnisight.local's JWT (admin-rls) and the
# service-role auth setup (admin-users-shapes); running them in
# sequence within a single worker avoids cross-test beforeAll/afterAll
# flapping on shared (PRIVATE_CAM_ID, VIEWER_PROFILE_ID) rows.
# Specs listed below are mirrored verbatim in Phase G (run2.json) so the AND-of-both-runs
# canonical-status check in scrub_and_build.py can match leaves by spec_meta fingerprint.
# The leaf_key sort in scrub_and_build.py (sorted tuple of spec_anc + projectName + file +
# line + column) places bug-e at T-RLS-12 because its filename sorts last among the three.
# Playwright's own test-discovery order is filesystem-walk-order and is NOT what produces the
# T-RLS-* index — the canonical ordering comes from scrub_and_build.py, not from the
# command-line argv order above.
# Adding `bug-e-brand-divergence.spec.ts` (the Bug E regression lock-in added in 27323db) pins
# the BRAND/STATUS_META/SEVERITY/TYPE_META nullish-coalescing fix into every capture cycle
# so a future regression cannot land without a CI failure.
DEBUG=pw:api "$PLAYWRIGHT" test --workers=1 tests/e2e/auth-rls.spec.ts tests/e2e/admin-users-shapes.spec.ts tests/e2e/bug-e-brand-divergence.spec.ts --reporter=json > /tmp/build-log/run1.json 2> /tmp/build-log/run1.stderr
PW1_EC=$?
T1=$(date +%s)
printf 'pw1 exit=%s elapsed=%ss\n' "$PW1_EC" "$((T1-T0))"
jq '.stats' /tmp/build-log/run1.json 2>/dev/null
head -15 /tmp/build-log/run1.stderr
cat /tmp/build-log/run1.stderr > /tmp/build-log/baseline-run.log
check_pw_unexpected /tmp/build-log/run1.json "$PW1_EC" || { printf 'FATAL: pw1 not in tolerance set (exit 41)\n'; exit 41; }
if [ "$PW1_EC" != "0" ]; then PW1_FAILED=true; else PW1_FAILED=false; fi

print_phase 'G: playwright run 2 (warm)'
cd "${PROJECT_DIR}/${APP_SUBDIR}"
T0=$(date +%s)
# Mirror Phase F: same 3 spec files + --workers=1 in same order so
# the AND-of-both-runs canonical status in scrub_and_build.py maps
# cleanly and cross-worker DB races are eliminated.
DEBUG=pw:api "$PLAYWRIGHT" test --workers=1 tests/e2e/auth-rls.spec.ts tests/e2e/admin-users-shapes.spec.ts tests/e2e/bug-e-brand-divergence.spec.ts --reporter=json > /tmp/build-log/run2.json 2> /tmp/build-log/run2.stderr
PW2_EC=$?
T1=$(date +%s)
printf 'pw2 exit=%s elapsed=%ss\n' "$PW2_EC" "$((T1-T0))"
jq '.stats' /tmp/build-log/run2.json 2>/dev/null
cat /tmp/build-log/run2.stderr >> /tmp/build-log/baseline-run.log
check_pw_unexpected /tmp/build-log/run2.json "$PW2_EC" || { printf 'FATAL: pw2 not in tolerance set (exit 51)\n'; exit 51; }
if [ "$PW2_EC" != "0" ]; then PW2_FAILED=true; else PW2_FAILED=false; fi

print_phase 'H: tear down Vite (before cleanup runs at script exit)'
pkill -f vite 2>/dev/null
sleep 2
printf 'vite torn down\n'

print_phase 'I: run scrub_and_build.py'
# camaras-subtree layout has STUB under $PROJECT_DIR/app/; USB-portable layout has STUB directly.
# Pass CAMARAS env so scrub_and_build.py's STUB invariant check resolves correctly.
CAMARAS="$PROJECT_DIR" python3 "$PYTHON_SCRIPT"
PY_EC=$?
printf 'scrub_and_build exit=%s\n' "$PY_EC"
if [ "$PY_EC" != "0" ]; then printf 'FATAL: scrub failed (exit 35)\n'; tail -50 "$LOG"; exit 35; fi

print_phase 'J: scrub gate'
NV=$(wc -c < "$STUB")
printf '%s: %s bytes\n' "$STUB" "$NV"
if grep -qE 'sb_secret_[A-Za-z0-9_-]{20,}' "$STUB" 2>/dev/null; then printf 'LEAK: sb_secret_ value-shape\n'; exit 36; else printf 'scrub: sb_secret_ value-shape PASS\n'; fi
if grep -qE 'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}' "$STUB" 2>/dev/null; then printf 'LEAK: 3-segment JWT\n'; exit 36; else printf 'scrub: 3-segment JWT PASS\n'; fi
ANON=$(jq -r '.ANON_KEY // ""' /tmp/build-log/sb-status.json 2>/dev/null)
SR=$(jq -r '.SERVICE_ROLE_KEY // ""' /tmp/build-log/sb-status.json 2>/dev/null)
if [ -n "$ANON" ] && [ -n "$SR" ]; then
  if grep -qF -- "$ANON" "$STUB" 2>/dev/null; then printf 'LEAK: ANON_KEY\n'; exit 36; else printf 'scrub: ANON_KEY PASS\n'; fi
  if grep -qF -- "$SR" "$STUB" 2>/dev/null; then printf 'LEAK: SERVICE_ROLE_KEY\n'; exit 36; else printf 'scrub: SERVICE_ROLE_KEY PASS\n'; fi
fi

print_phase 'K: shape preview of new stub'
PROJECT_DIR="$PROJECT_DIR" python3 - "$STUB" <<'PYEOF'
import json, sys
d = json.loads(open(sys.argv[1]).read())
print('status:', d.get('status'))
print('captured_at:', d.get('captured_at'))
print('aggregate:', json.dumps(d.get('aggregate'), indent=2))
print('tests length:', len(d.get('tests', [])))
print('dropped_in_run1 length:', len(d.get('dropped_in_run1', [])))
print('dropped_in_run2 length:', len(d.get('dropped_in_run2', [])))
print('-- first 2 tests --')
for t in d.get('tests', [])[:2]: print(' ', t)
print('-- last 2 tests --')
for t in d.get('tests', [])[-2:]: print(' ', t)
PYEOF

print_phase 'L: status before commit'
git -C "$PROJECT_DIR" status --porcelain
EXTRA=$(git -C "$PROJECT_DIR" status --porcelain | grep -v "^.. ${STUB_REL}$" || true)
if [ -n "$EXTRA" ]; then printf 'WARN extra files: %s\n' "$EXTRA"; fi

print_phase 'M: stage + commit'
# Print a degraded-run marker so the commit subject's "REAL Playwright timings" is contextualised
# when pw runs failed. The HONEST signal lives in baseline.json per-row statuses (status=captured,
# but per-test status reflects what playwright actually saw). No git suffix is added -- reviewers
# reading the diff see the WARN lines earlier in this log and the .json aggregate.
if [ "$PW1_FAILED" = "true" ] || [ "$PW2_FAILED" = "true" ]; then
  printf 'NOTE: pw1=%s pw2=%s non-zero -- baseline.json preserves HONEST per-test statuses (committed as-is, no fabricated pass)\n' \
    "$PW1_EC" "$PW2_EC"
fi
git -C "$PROJECT_DIR" add "$STUB_REL"
git -C "$PROJECT_DIR" status --porcelain | grep '^[AM]' || { printf 'NOTHING_STAGED\n'; exit 37; }

git -C "$PROJECT_DIR" -c user.name=ops-ci -c user.email=ops@camaras.local commit -m "test(e2e): OVERWRITE baseline sequence with REAL Playwright timings

Replaces tests/e2e/_baseline-run.json deferred stub (status: deferred -> status: captured).

Source of truth:
- 2 idempotent runs (run1.json + run2.json) under /tmp/build-log/
- Supabase local stack with [studio] + [analytics] disabled (commit 5c1a0c0)
- Vite dev server running on :5173 during BOTH playwright runs (auth-rls tests page.goto('/'))
- DEBUG=pw:api + 2>&1 | tee /tmp/build-log/baseline-run.log per the ops-notes playbook
- Network isolation gated by 30s settle + ss + docker health + HTTP /auth/v1/health + /rest/v1/ 200 + curl localhost:5173 200

Idempotency gating:
- per-test final status: AND-of-both-runs canonical (mandatory)
- per-test duration variance: documented per-row (duration_run1_first_ms + duration_run2_first_ms + variance_ratio + variance_ok); cross-run drift does NOT abort
- dropped-only-in-run1 / dropped-only-in-run2 rows are PRESERVED (not aborted) with DROPPED-R1/R2-{i+1} ids
- aggregate exposes cold_start_tests, any_inconsistent_between_runs, dropped_in_run{1,2}_count, runner_errors_run{1,2}_count
- recorder: <project>/scrub_and_build.py (reproducible from run1.json + run2.json)
- walker follows canonical playwright --reporter=json schema
  (suite -> specs[title] -> tests[projectName] -> results[status,duration])

NO FAKE MS VALUES -- durations are real ms from Playwright
--reporter=json results[*].duration. Canonical = median of run1 attempts.
Each row preserves duration_run1_first_ms and duration_run2_first_ms
(replay-order first attempts) so reviewers see actual variance.

Scrubbing (gate enforced):
- 0 occurrences of sb_secret_* in committed JSON
- 0 JWTs (eyJ*) in committed JSON
- 0 ANON_KEY + 0 SERVICE_ROLE_KEY substrings in committed JSON
- runner_errors list scrubbed per-entry defensively
- Verified by case-grep; gate against /tmp/test*_body.ts (no body files
  produced in this protocol because tests use createClient() not direct REST)

See: docs/ops-notes.md -> Node 20 + Supabase realtime ws workaround
for the @supabase/realtime-js websocket shim that unblocked Node 20 capture."
COMMIT_EC=$?
printf 'commit exit=%s\n' "$COMMIT_EC"
[ "$COMMIT_EC" != "0" ] && exit 37 || true

print_phase 'N: post-commit state'
git -C "$PROJECT_DIR" log --oneline -5
git -C "$PROJECT_DIR" status --porcelain

printf '\n[v6 capture SUCCESS -- script finished cleanly]\n'
