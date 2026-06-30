# OmniSight Deployment

This is the production deployment checklist for **OmniSight** -- the multi-brand
camera monitoring platform (AI-overlaid live streams, evidence locker, wireless
threat detection, OSINT shield). Five-step roll-out from a clean clone to a
running, tested, deployable stack.

> *Companion to the in-app rendered `DeploymentGuide` tab in `app/src/components/DeploymentGuide.tsx`
> (admin-only, shortcut `6`). This Markdown file is the canonical operator-facing
> runbook; the React component is the canonical code-snippet source-of-truth.*

## Production rollout checklist

The five steps are run **in order**, from the `app/` directory. Each step's
output is the input contract for the next step. Do not skip.

### 1. Start the Supabase local development stack

This brings up the 6-service alive canonical surface
(`kong + auth/gotrue + rest/postgrest + realtime + db/postgres + edge-runtime`).
The four targeted sidecars (`[analytics] + [inbucket] + [studio] + [storage]`)
are filtered out by config; the formal Adopted status flip and the live-render
verify evidence are at the [Recommended Next Step][1] target in `ops-notes.md`.

```bash
supabase start
```

Wait for `Started supabase local development cluster.` and capture the
`API URL` + `anon key` + `service_role key` into a project-root `.env`
(see step 5).

> **Verify path under CLI 2.107.0:** `supabase/.temp/docker-compose.yml` is **not
> written to disk** by this CLI version -- the canonical visibility surface is
> `supabase status` (filterable by container name, e.g. `docker ps --filter
> name=supabase_analytics_omnisight` to assert a sidecar is absent). A future
> maintainer diagnosing a CLI-bump regression should diff against the stopped
> services list captured in commit `7dbd099`.

### 2. Start the Vite dev server bound to localhost

Do **not** bind to `0.0.0.0` on a shared host: the dev server has no auth gate
unless wrapped by an upstream reverse-proxy with basic-auth.

```bash
cd app
npm run dev -- --host 127.0.0.1
```

App boots at `http://127.0.0.1:5173` (or whatever Vite picks if 5173 is held).
The login screen reads the env-var surface configured in step 5 and warns
explicitly if either `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing.

### 3. Run the Playwright e2e baseline

The 13-test baseline (`app/tests/e2e/auth-rls.spec.ts` + per-camera share-grant
+ Bug E Brand-divergence regression lock-in) is the minimum signal that the SPA
+ Supabase surface is wired correctly. All 13 must pass before step 4.

```bash
cd app
npm run test:e2e
```

Recorded timings JSON lives at `app/tests/e2e/_baseline-run.json` (live capture
is the **deferred stub** surfaced in `### Cumulative status as of attempt N`
cross-references in `ops-notes.md`; ship-blocker for production sign-off).

### 4. Build the OmniSight deployable images

Two tiers:

- **SPA tier** -- `vite build` produces static assets, deployable to any CDN or
  behind any static-file reverse-proxy. Output: `app/dist/`.
- **Middleware tier** -- the Python ingestion + receiver + wireless-IDS layer
  that owns the `/events` and `/threats` endpoints. **The canonical source code
  snippets live in `app/src/components/DeploymentGuide.tsx`** (in the four
  sections: *Architecture* / *API Gateway* / *AI / NVR* / *Wireless IDS*).
  Copy or fork those snippets into your orchestration repo; this runbook does
  not duplicate them so the React component and your deployment cannot drift.

```bash
# SPA tier
cd app
npm run build

# Middleware tier: per DeploymentGuide.tsx -- FastAPI entrypoint + scapy sniffer
# runnable as a docker-compose stack (also maintained in DeploymentGuide.tsx
# "Architecture" section). For NVR integration, see https://frigate.video; for
# wireless IDS, see https://nzyme.org.
```

The `threat-receiver.py`-shaped service is the middleware tier's POST-opposite
-- the listener that receives both `SecurityEvent` (Frigate objects, motion,
tamper, intrusion) and `ThreatEvent` (deauth, rogue-AP, signal anomalies from
Kismet / nzyme / scapy) and re-broadcasts them to the OmniSight SPA via the
Realtime WS channel.

### 5. Env-var surface

- [ ] Press <kbd>6</kbd> in the OmniSight SPA (admin-only) to open the Deployment Guide tab.
- [ ] Cross-check the four code-snippet sections (Architecture / API Gateway / AI / NVR / Wireless IDS) against your orchestration repo before `docker compose up -d`.
- [ ] Run `kubectl apply -f docker-compose.yml --dry-run=client` to validate the rendered manifest locally, pausing here for the orchestrate-repo PR review to land before the live `docker compose up -d`.

Two Vite-side keys are required (consumed by `app/src/lib/supabase.ts` via
`import.meta.env`). One server-side key is required by the e2e harness only and
**must never be shipped to a public SPA bundle**.

```dotenv
# .env (project root -- sibling to app/)

# -- client (Vite bundler reads these at build/dev time) --
VITE_SUPABASE_URL="http://127.0.0.1:54321"      # from `supabase status` -> API URL
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."          # from `supabase status` -> anon key

# -- server-only (e2e harness; admin client; bypasses RLS) --
SUPABASE_SERVICE_ROLE_KEY="eyJ..."              # from `supabase status` -> service_role key
```

If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing at dev-server boot,
the SPA logs `[omnisight] Supabase env not configured.` and `LoginScreen.tsx`
displays a remediation hint.

> **Why two keys, not three:** only the anon key is safe to embed in client-side
> code. The `service_role` key bypasses RLS and would let any browser-issued
> query run as the admin; treat its leak as a full DB credential rotation event.

## Companion docs

- `app/docs/ops-notes.md` -- operational audit chain; every commit-log entry
  and v-cycle Adopted/Deferred H3 lives here. Anchored by `[Recommended Next Step][1]`.
- `app/docs/anchor-ledger.md` -- archeological ledger of every covenant-
  inventoried anchor (`#re-pointing-the-bundle` through
  `#sidecar-disable-config-adopted`).
- `app/docs/E2E-DEBUG.md` -- debug recipes for the Playwright harness and the
  capture-pipeline sidecars (`/tmp/build-log/*.log`).
- `app/src/components/DeploymentGuide.tsx` -- in-app rendered Deployment Guide
  tab (admin-only, `TabId` = `'deployment'`, shortcut `6`). Source-of-truth for
  the four production code snippets (compose / backend / Frigate / wireless).

## Reference links

> **Reference-style-link pitfall** (logged for future archeologists): `[Recommended Next Step][1]` here in step 1 + in the Companion docs section is a **forward-reference** to the `[1]: ./ops-notes.md#sidecar-disable-config-adopted` definition at the bottom of this doc -- NOT an inline link. The inline equivalent would be `[Recommended Next Step](./ops-notes.md#sidecar-disable-config-adopted)` which DOES NOT pick up the `title="..."` archeology-rationale attribute. Off-hand conversions to inline link syntax lose the bottom-registry convention's three archeology wins: readable step-by-step prose (no URL clutter), title-attributed SHA-cite chain (`f2d0744` + `935d9dc` + `7dbd099`), and forward-reference discoverability via `grep -nE '^\[\d+\]:' app/docs/DEPLOYMENT.md`.

This protects future maintainers from the same prose-vs-registry false-positive signal that prompted the v2.7 docs-cycle heritage (mirrors the regex-pitfall-blockquote in app/docs/ops-notes.md Anchor collision covenant).

[1]: ./ops-notes.md#sidecar-disable-config-adopted "## Sidecar-disable config (adopted) -- f2d0744 flips the stale Recommended Next Step deferral wording to formal Adopted status; the [analytics] enabled = false + [inbucket] enabled = false blocks were already-live in app/supabase/config.toml since the 935d9dc subtree import; the live-render verify evidence is in 7dbd099 chore commit."
