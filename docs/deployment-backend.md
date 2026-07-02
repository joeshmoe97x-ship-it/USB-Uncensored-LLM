# Supabase backend production deploy

Walkthrough for promoting the local Supabase CLI 2.107.0 stack to a Supabase Cloud (or self-hosted Pro) project. Tested against `app/supabase/migrations/*.sql` (canonical git-tracked) + `supabase/seed.sql` (canonical seed) + `supabase/functions/admin-users/index.ts` (load-bearing function with assertAdmin JWT re-validation).

## Prerequisites

1. Install Supabase CLI 2.107.0+ (`brew install supabase/tap/supabase` or `npx supabase --version`)
2. `supabase login` -- one-time; stores token in `~/.supabase/access_token`
3. A Supabase Cloud project: `https://app.supabase.com/org/.../project/...`. Note the project reference ID (e.g. `abcdefghijklmnopqrst`); it appears in the URL of the project's API settings page.

## One-time link

```bash
cd app
supabase link --project-ref <REF>            # prompts for DB password (the one set at project create-time)
```

This writes `supabase/.temp/project_ref` (gitignored) + a stored access token (also gitignored, under `supabase/.temp/`).

## Push migrations + seed

```bash
cd app
supabase db push                              # apply git-tracked migrations/*.sql to remote DB
supabase db seed                              # apply supabase/seed.sql if not yet seeded
```

`supabase db push` is idempotent on the migration layer (each migration's idempotency-key tracks via the `_supabase_migrations` table). `supabase db seed` will WARN on re-run if the seed has already been applied; this is expected.

## Deploy edge functions

```bash
cd app
supabase functions deploy admin-users         # deploys from supabase/functions/admin-users/index.ts
                                              # NOTE: the deploy command does NOT pass --no-verify-jwt
                                              # because the function body has its own assertAdmin() + getUser()
                                              # defense-in-depth check (see the file's head comment for
                                              # the rationale).
```

`--no-verify-jwt` is intentionally absent (was a v3.0.0 legacy leftover dropped at v3.2.0 deploy-readiness). The function's internal `assertAdmin()` is the load-bearing auth gate, and the JWT is delegated to GOTRUE through the Supabase CLI's normal verification path.

## Set secrets (admin auth flow)

```bash
cd app
supabase secrets set ADMIN_BOOTSTRAP_EMAIL=admin@<your-domain>      # for scripts/bootstrap-admin.sh
supabase secrets set SMTP_HOST=<smtp.example.com>                   # optional: for email-OTP flows
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=apikey
supabase secrets set SMTP_PASSWORD=<secret>
# (replace the envsubst-based secret list per the
#  supabase/config.toml.production template -- TBD v3.3.x)
```

## Verify the deploy

```bash
cd app
supabase status -o env | grep API_URL          # confirm remote API URL
curl -fsS "$(supabase status -o env | grep API_URL | cut -d= -f2 | tr -d \"'\")/auth/v1/health" --max-time 5
echo 'auth health check returned 0 if you see no error above'
```

For the envsubst-based production config swap (a planned v3.3.x followup that swaps the local-dev `site_url = "http://127.0.0.1:3000"` line for a templated `$SITE_URL` with random nonce redirects), see the OPEN-marker in `supabase/config.toml` L13.

## Forward-extensibility

- Cloud parity deprecations: `auto_expose_new_tables = true` line + every migration's `grant execute on functions ... from anon, authenticated, service_role` revoke line will need rewiring on/after **2026-10-30** when the always-revoked behaviour becomes permanent. The inline comment in `supabase/config.toml` (deprecation timeline section, v3.2.x) tracks this.
- Email-OTP flows: `[inbucket]` section is absent from `supabase/config.toml` at HEAD; the default-on behaviour is suppressed in the runtime via `[inbucket] enabled = false` blocks where needed.
