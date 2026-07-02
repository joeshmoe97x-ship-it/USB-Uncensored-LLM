# omnisight-dashboard (the SPA front-end of `USB-Uncensored-LLM/Linux`)

A Vite + React + TypeScript SPA wired to a Supabase backend. Builds to `app/dist/`. Reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` from `app/.env.production` at build time; see [`app/.env.production.example`](app/.env.production.example) for the track-safe template.

## Local dev

```bash
cd app
npm ci
# Set dev env vars (e.g. via .env.development.local):
echo 'VITE_SUPABASE_URL=http://127.0.0.1:54321' > .env.development.local
echo 'VITE_SUPABASE_ANON_KEY=<your-anon-key>'      >> .env.development.local
npm run dev                                        # vite --host 127.0.0.1 (IPv4 single-family bind)
```

## Production build + preview

```bash
cd app
# Stage production env vars (NEVER commit .env.production to git -- gitignored at `app/.gitignore`):
cp .env.production.example .env.production
$EDITOR .env.production         # replace [REDACTED: ...] placeholders
npm run build                   # outputs dist/
npm run preview                 # serves dist/ at http://127.0.0.1:4173/ for the deploy host wiring
```

For nginx/Caddyfile placeholder + reverse-proxy wiring, see [`app/docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Type safety + e2e

```bash
npx tsc --noEmit -p tsconfig.app.json            # type check (target: 0 errors)
bash scripts/install-smoke-test.sh                # bundle-smoke (CDN-stripped-tampered detector)
bash scripts/bootstrap-admin.sh                   # admin user bootstrap (production-safety hardened)
# Playwright e2e:
npm run e2e:quick       # vite preview + component-only smoke (sub-1-min; PR-gated)
npm run e2e             # full Supabase-backed e2e (heavier; main-branch gated)
```

## Project-specific notes

- `app/package.json` `name` is `omnisight-dashboard` -- the project-specific npm package name (was the Vite scaffold leftover `placeholder-model-2`; cleaned up at v3.2.0).
- The `app/.gitignore` carries `.env*.local` + `.env.production` (defensive; cross-checked against Vite's defaults).
- Bootstrapping an admin user requires explicit `ADMIN_PASSWORD` env-var input; the script refuses to bootstrap with the literal default `admin123`/`password`/`changeme` values unless `ALLOW_INSECURE_DEFAULT=1` is exported (production-safety hardened at v3.2.0).

## Sub-docs

- [`app/docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) -- production host wiring (nginx/Caddyfile)
- [`app/docs/ops-notes.md`](../docs/ops-notes.md) -- canonical operational notes (cross-doc anchor)
- [`app/scripts/bootstrap-admin.sh`](scripts/bootstrap-admin.sh) -- admin bootstrap script with production-safety guard
