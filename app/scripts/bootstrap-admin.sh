#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Provenance: introduced by `935d9dc` (single-commit file, audit-chain adoption v1.8).
# Tripod Closure: see `docs/bug-diagnoses.md` #bug-c (admin profile.role trigger race on capture-v6 cold-start).
# Anchor Covenant (CLI): depends on `supabase status --json` keys `API_URL` + `SERVICE_ROLE_KEY`.
# Disambiguation: canonical execution path defaults to admin@omnisight.local; v3.2.0 added the
#   `ALLOW_INSECURE_DEFAULT=1` opt-in variant for local dev / CI bypass of the production-safety
#   guard (refuses to bootstrap if ADMIN_PASSWORD is unset / empty / on the leaked-defaults trio
#   admin123|password|changeme, exits 5). Without the opt-in, production deployers MUST set the
#   ADMIN_PASSWORD env var explicitly. Treat `ALLOW_INSECURE_DEFAULT=1` as local-dev/CI-only.
# Tag Chain: synced as of audit-cycle-v3.2.0 (security-only sub-cycle, replaces v1.8).
# ----------------------------------------------------------------------------
# Bootstrap the first admin user for the local Supabase stack.
# Reads API_URL + SERVICE_ROLE_KEY from `supabase status --output json`.
# Service-role key NEVER echoed. Safe to gitignore the .env it sources from.
set -euo pipefail

export PATH="$HOME/bin:$PATH"

# Prefer .env if the user already put keys there; otherwise fall back to supabase status.
ENV_FILE="${ENV_FILE:-.env}"
URL=""; KEY=""

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; . "$ENV_FILE"; set +a
  URL="${VITE_SUPABASE_URL:-${SUPABASE_URL:-}}"
fi

if [ -z "${URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  if ! command -v supabase >/dev/null 2>&1; then
    echo "[bootstrap] supabase CLI not found on PATH; set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in $ENV_FILE first." >&2
    exit 2
  fi
  JSON=$(supabase status --output json 2>/dev/null || true)
  URL="${URL:-$(echo "$JSON" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("API_URL",""))' 2>/dev/null || true)}"
  KEY="${SUPABASE_SERVICE_ROLE_KEY:-$(echo "$JSON" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("SERVICE_ROLE_KEY",""))' 2>/dev/null || true)}"
fi

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "[bootstrap] Could not determine API_URL or SUPABASE_SERVICE_ROLE_KEY. Run `supabase start` first or set them in $ENV_FILE." >&2
  exit 3
fi

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@omnisight.local}"
# v3.2.0: production-safety guard. Refuse to bootstrap if ADMIN_PASSWORD is
# (a) unset, (b) empty, OR (c) literal-equals one of the leaked-defaults trio.
# Bypass opt-in via `ALLOW_INSECURE_DEFAULT=1` for local dev / CI (where the
# default is convention and intentional) — explicit non-leaked env-var still
# works without the opt-in. Defense in depth: do NOT weaken the local-dev
# default; force production deployers to set a real password.
# v3.2.0 hotfix: previous guard used `[ -z "${ADMIN_PASSWORD+x}" ]` which
# catches ONLY unset — an explicit `ADMIN_PASSWORD=""` slipped through to
# create_user with an empty password, which Supabase Auth accepts in some
# configurations. Tightened to `${ADMIN_PASSWORD:+set}` which reports the
# actual set-state via '+set' (vs. empty string for unset), then evaluates
# `[ -z "$ADMIN_PASSWORD" ]` for the empty-string case. Same logic applies
# to leaked-defaults literal-match.
if [ -z "${ADMIN_PASSWORD:+set}" ] || [ -z "$ADMIN_PASSWORD" ]; then
  if [ "${ALLOW_INSECURE_DEFAULT:-0}" != "1" ]; then
    echo "[bootstrap] ADMIN_PASSWORD is unset or empty and would default to the leaked 'admin123' string. Refusing. Set ADMIN_PASSWORD=<your-prod-password>, or set ALLOW_INSECURE_DEFAULT=1 for local dev / CI." >&2
    exit 5
  fi
  ADMIN_PASSWORD="admin123"
elif [ "$ADMIN_PASSWORD" = "admin123" ] || [ "$ADMIN_PASSWORD" = "password" ] || [ "$ADMIN_PASSWORD" = "changeme" ]; then
  if [ "${ALLOW_INSECURE_DEFAULT:-0}" != "1" ]; then
    echo "[bootstrap] ADMIN_PASSWORD='$ADMIN_PASSWORD' is on the leaked-defaults list. Refusing. Set a real password or ALLOW_INSECURE_DEFAULT=1." >&2
    exit 5
  fi
fi
ADMIN_NAME="${ADMIN_NAME:-System Admin}"

create_admin() {
  curl -sS -o /tmp/.create_admin_resp.json -w "%{http_code}"     -X POST "$URL/auth/v1/admin/users"     -H "apikey: $KEY" \
    -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"email_confirm\":true,\"user_metadata\":{\"display_name\":\"$ADMIN_NAME\",\"role\":\"admin\"}}"
}
HTTP=$(create_admin)
if [ "$HTTP" = "201" ]; then
  echo "[bootstrap] Admin created: $ADMIN_EMAIL"
elif [ "$HTTP" = "422" ]; then
  echo "[bootstrap] Admin already exists: $ADMIN_EMAIL"
else
  echo "[bootstrap] Unexpected response code: $HTTP" >&2
  cat /tmp/.create_admin_resp.json >&2 || true
  exit 4
fi

# Refresh key from supabase status so it reflects any rotation, then seed sample cameras
# using the admin that just got created.
JSON=$(supabase status --output json 2>/dev/null || true)
ADMIN_ID=$(curl -sS "$URL/auth/v1/admin/users?per_page=1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);u=d.get("users",[])[0] if isinstance(d,dict) else (d[0] if d else {});print(u.get("id",""))' 2>/dev/null || true)
if [ -z "$ADMIN_ID" ]; then
  echo "[bootstrap] Could not resolve admin id; camera seeding skipped." >&2
  exit 0
fi

curl -sS -o /dev/null -w "" -X POST "$URL/rest/v1/cameras" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "[{\"owner_id\":\"$ADMIN_ID\",\"name\":\"Front Lobby\",\"brand\":\"Hikvision\",\"model\":\"DS-2CD2143\",\"ip\":\"10.0.1.21\",\"location\":\"Lobby\",\"status\":\"online\",\"stream_url\":\"rtsp://10.0.1.21:554/stream\",\"codec\":\"H.265\",\"resolution\":\"4K\",\"fps\":30},{\"owner_id\":\"$ADMIN_ID\",\"name\":\"Server Room\",\"brand\":\"Axis\",\"model\":\"M3066\",\"ip\":\"10.0.2.5\",\"location\":\"Server Room\",\"status\":\"online\",\"stream_url\":\"rtsp://10.0.2.5:554/stream\",\"codec\":\"H.264\",\"resolution\":\"1080p\",\"fps\":25},{\"owner_id\":\"$ADMIN_ID\",\"name\":\"Loading Dock\",\"brand\":\"Bosch\",\"model\":\"FLEXIDOME\",\"ip\":\"10.0.3.7\",\"location\":\"Dock\",\"status\":\"degraded\",\"stream_url\":\"rtsp://10.0.3.7:554/stream\",\"codec\":\"H.265\",\"resolution\":\"4K\",\"fps\":15}]"

echo "[bootstrap] Sample cameras seeded for admin. Sign in at the app with $ADMIN_EMAIL / $ADMIN_PASSWORD."
