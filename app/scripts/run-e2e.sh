#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Provenance: introduced by `935d9dc` (single-commit file, audit-chain adoption v1.9).
# Tripod Closure: see `../../docs/ops-notes.md` #capture-v6-vs-playwright-discovery-scope-gap (Capture-v6 orchestrator).
# Anchor Covenant (jq-fallback): keys `API URL` / `anon key` / `service_role key` from `supabase status --json` (with .api.* fallbacks).
# Disambiguation: 3-supabase-config-keys required; no script variants.
# Tag Chain: synced as of audit-cycle-v1.9.
# ----------------------------------------------------------------------------
# End-to-end smoke test orchestrator for Supabase auth + RLS path.
#
#   1. `supabase start`    — boot local Supabase stack under Docker.
#   2. `supabase db reset` — apply migrations + seed (admin@omnisight.local
#                            is promoted to admin by the auth trigger on its
#                            first signup, performed in tests/e2e/global-setup).
#   3. `supabase functions serve admin-users` in background.
#   4. Capture API URL + anon + service-role keys from `supabase status`.
#   5. Start Vite dev server (background) with local URL/anon in env.
#   6. Run `npx playwright test` with keys passed through.
# ----------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

echo "==> [1/6] supabase start"
supabase start

echo "==> [2/6] supabase db reset (applies migrations + seed.sql)"
supabase db reset

echo "==> [3/6] parsing local Supabase status"
STATUS_JSON="$(supabase status --json 2>/dev/null || supabase status --output json 2>/dev/null || true)"
if [[ -z "$STATUS_JSON" || "$STATUS_JSON" == "null" ]]; then
  echo "FATAL: could not capture supabase status JSON" >&2
  exit 1
fi

API_URL="$(printf '%s' "$STATUS_JSON"   | jq -r '.["API URL"]           // .api.url              // empty')"
ANON_KEY="$(printf '%s' "$STATUS_JSON"  | jq -r '.["anon key"]          // .api.anon_key         // empty')"
SERVICE_KEY="$(printf '%s' "$STATUS_JSON"| jq -r '.["service_role key"]  // .api.service_role_key// empty')"

if [[ -z "$API_URL" || -z "$ANON_KEY" || -z "$SERVICE_KEY" ]]; then
  echo "FATAL: missing API_URL/ANON_KEY/SERVICE_KEY from supabase status" >&2
  echo "$STATUS_JSON" >&2
  exit 1
fi
echo "    API_URL = $API_URL"

pkill -f "supabase functions serve" 2>/dev/null || true
echo "==> [4/6] serving admin-users (background)"
( supabase functions serve admin-users --no-verify-jwt ) >/tmp/supabase-fn.log 2>&1 &
FN_PID=$!

pkill -f "vite.*5173" 2>/dev/null || true
echo "==> [5/6] vite dev server (background)"
(
  cd "$ROOT"
  env VITE_SUPABASE_URL="$API_URL" VITE_SUPABASE_ANON_KEY="$ANON_KEY" \
    npm run dev -- --port 5173 --strictPort
) >/tmp/vite.log 2>&1 &
VITE_PID=$!

cleanup() {
  echo "==> cleaning up background processes"
  kill "$FN_PID" "$VITE_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "==> waiting for vite at http://localhost:5173"
for _ in $(seq 1 90); do
  if curl -sf http://localhost:5173 >/dev/null; then
    echo "    vite ready"
    break
  fi
  sleep 1
done

echo "==> [6/6] playwright test"
env \
  VITE_SUPABASE_URL="$API_URL" \
  VITE_SUPABASE_ANON_KEY="$ANON_KEY" \
  SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY" \
  npx playwright test "$@"
