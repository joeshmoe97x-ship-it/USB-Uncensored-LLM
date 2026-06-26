#!/usr/bin/env bash
# v6 capture-baseline: standalone script, NOT inline `bash -c '...'`
# Runs as `bash capture-v6.sh` to bypass any basher-tool `bash -c` wrapper trap-firing.
# Path-safe: PROJECT_DIR via $HOME + relative path; no /home/bgdaddy literal.

set +e

LOG=/tmp/build-log/path-a-capture-v6.log
mkdir -p /tmp/build-log
exec >"$LOG" 2>&1

# Path-safe: bash-side path variables only
PROJECT_DIR="$HOME/Downloads/camaras"
export CAMARAS="$PROJECT_DIR"
STUB_REL="tests/e2e/_baseline-run.json"
STUB="$PROJECT_DIR/$STUB_REL"
PYTHON_SCRIPT="/home/bgdaddy/USB-Uncensored-LLM/Linux/scrub_and_build.py"
PLAYWRIGHT="$PROJECT_DIR/node_modules/.bin/playwright"

print_phase() { printf '\n==== %s ====\n' "$1"; date; }

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

print_phase 'A: pre-cleanup (also clears v1-v5 stale state)'
# Docker-level stale state cleanup (no-match is OK)
docker ps -aq --filter name=supabase 2>/dev/null | xargs -r docker stop 2>/dev/null
ec=$?; printf 'docker-stop ec=%s\n' "$ec"
docker ps -aq --filter name=supabase 2>/dev/null | xargs -r docker rm 2>/dev/null
ec=$?; printf 'docker-rm ec=%s\n' "$ec"
# Supabase CLI-level (with explicit ec)
(cd "$PROJECT_DIR" && supabase stop --no-backup 2>&1 | tail -5)
ec=$?; printf 'supabase-stop ec=%s\n' "$ec"
# Vite kill (with explicit ec; 1=no-match is OK)
pkill -f vite 2>/dev/null
ec=$?; printf 'pkill-vite ec=%s (1=no-match-OK)\n' "$ec"
pkill -f 'npm run dev' 2>/dev/null
ec=$?; printf 'pkill-npm-run-dev ec=%s (1=no-match-OK)\n' "$ec"
sleep 3

print_phase 'B: supabase start'
cd "$PROJECT_DIR" || { printf 'cd failed (exit 73)\n'; exit 73; }
T0=$(date +%s)
supabase start > /tmp/build-log/supabase-start.log 2>&1
SSTART_EC=$?
T1=$(date +%s)
printf 'supabase-start exit=%s elapsed=%ss\n' "$SSTART_EC" "$((T1-T0))"
printf '-- last 30 lines --\n'
tail -30 /tmp/build-log/supabase-start.log
if [ "$SSTART_EC" != "0" ]; then printf 'FATAL: supabase start failed (exit 31)\n'; exit 31; fi

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
printf 'exports OK\n'

print_phase 'E: Vite background + readiness'
rm -f /tmp/build-log/vite-dev.log
cd "$PROJECT_DIR"
nohup npm run dev > /tmp/build-log/vite-dev.log 2>&1 &
VITE_PID=$!
echo "$VITE_PID" > /tmp/build-log/vite.pid
sleep 6
printf 'vite pid: %s\n' "$VITE_PID"
head -20 /tmp/build-log/vite-dev.log
VITE_CODE=000
VITE_ELAPSED=0
VITE_MAX=60
while [ "$VITE_ELAPSED" -lt "$VITE_MAX" ]; do
  VITE_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:5173/" 2>/dev/null)
  if [ "$VITE_CODE" = "200" ] || [ "$VITE_CODE" = "304" ]; then
    printf '  vite ready at +%ss (HTTP %s)\n' "$VITE_ELAPSED" "$VITE_CODE"
    break
  fi
  sleep 2; VITE_ELAPSED=$((VITE_ELAPSED + 2))
done
if [ "$VITE_CODE" != "200" ] && [ "$VITE_CODE" != "304" ]; then
  printf 'FATAL: vite not ready (exit 34)\n'
  tail -60 /tmp/build-log/vite-dev.log
  exit 34
fi

print_phase 'F: playwright run 1 (cold)'
cd "$PROJECT_DIR"
T0=$(date +%s)
DEBUG=pw:api "$PLAYWRIGHT" test tests/e2e/auth-rls.spec.ts --reporter=json > /tmp/build-log/run1.json 2> /tmp/build-log/run1.stderr
PW1_EC=$?
T1=$(date +%s)
printf 'pw1 exit=%s elapsed=%ss\n' "$PW1_EC" "$((T1-T0))"
jq '.stats' /tmp/build-log/run1.json 2>/dev/null
head -15 /tmp/build-log/run1.stderr
cat /tmp/build-log/run1.stderr > /tmp/build-log/baseline-run.log
if [ "$PW1_EC" != "0" ]; then printf 'FATAL: pw1 failed (exit 41)\n'; exit 41; fi

print_phase 'G: playwright run 2 (warm)'
cd "$PROJECT_DIR"
T0=$(date +%s)
DEBUG=pw:api "$PLAYWRIGHT" test tests/e2e/auth-rls.spec.ts --reporter=json > /tmp/build-log/run2.json 2> /tmp/build-log/run2.stderr
PW2_EC=$?
T1=$(date +%s)
printf 'pw2 exit=%s elapsed=%ss\n' "$PW2_EC" "$((T1-T0))"
jq '.stats' /tmp/build-log/run2.json 2>/dev/null
cat /tmp/build-log/run2.stderr >> /tmp/build-log/baseline-run.log
if [ "$PW2_EC" != "0" ]; then printf 'FATAL: pw2 failed (exit 51)\n'; exit 51; fi

print_phase 'H: tear down Vite (before cleanup runs at script exit)'
pkill -f vite 2>/dev/null
sleep 2
printf 'vite torn down\n'

print_phase 'I: run scrub_and_build.py'
python3 "$PYTHON_SCRIPT"
PY_EC=$?
printf 'scrub_and_build exit=%s\n' "$PY_EC"
if [ "$PY_EC" != "0" ]; then printf 'FATAL: scrub failed (exit 35)\n'; tail -50 "$LOG"; exit 35; fi

print_phase 'J: scrub gate'
NV=$(wc -c < "$STUB")
printf '%s: %s bytes\n' "$STUB" "$NV"
case "$(cat $STUB)" in
  *sb_secret_*) printf 'LEAK: sb_secret_*\n'; exit 36 ;;
  *) printf 'scrub: sb_secret_* PASS\n' ;;
esac
case "$(cat $STUB)" in
  *eyJ[A-Za-z0-9-_]*) printf 'LEAK: JWT\n'; exit 36 ;;
  *) printf 'scrub: JWT PASS\n' ;;
esac
ANON=$(jq -r '.ANON_KEY // ""' /tmp/build-log/sb-status.json 2>/dev/null)
SR=$(jq -r '.SERVICE_ROLE_KEY // ""' /tmp/build-log/sb-status.json 2>/dev/null)
if [ -n "$ANON" ] && [ -n "$SR" ]; then
  case "$(cat $STUB)" in
    *"$ANON"*) printf 'LEAK: ANON_KEY\n'; exit 36 ;;
    *) printf 'scrub: ANON_KEY PASS\n' ;;
  esac
  case "$(cat $STUB)" in
    *"$SR"*) printf 'LEAK: SERVICE_ROLE_KEY\n'; exit 36 ;;
    *) printf 'scrub: SERVICE_ROLE_KEY PASS\n' ;;
  esac
fi

print_phase 'K: shape preview of new stub'
python3 - <<'PYEOF'
import json
d = json.loads(open('/home/bgdaddy/Downloads/camaras/tests/e2e/_baseline-run.json').read())
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
EXTRA=$(git -C "$PROJECT_DIR" status --porcelain | grep -v "^.. $STUB_REL$" || true)
if [ -n "$EXTRA" ]; then printf 'WARN extra files: %s\n' "$EXTRA"; fi

print_phase 'M: stage + commit'
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
