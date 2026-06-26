# E2E Debug — Reading CI Failure Artifacts

When `.github/workflows/e2e.yml` fails on a PR, two artifacts are uploaded:

| Artifact            | Path                                     | Retention |
|---------------------|------------------------------------------|-----------|
| `playwright-html`   | `playwright-report/index.html`           | 7 days    |
| `playwright-traces` | `*.zip` under `playwright-report/data/`  | 14 days   |

## 1. Open the HTML report

Download `playwright-html`, unzip locally, then either run `npx playwright
show-report` in the dir or open `playwright-report/index.html` directly in a
browser. Sidebar → failing test → Console + Network tabs show the
`captureConsoleAndNetwork()` output from `tests/e2e/log-stream.ts`.

## 2. Open a trace (timeline replay)

```bash
tar -xzf playwright-report/data/<test>.zip -C /tmp/trace-r$$
cd /tmp/trace-r$$ && npx playwright show-trace trace.zip
```

Each step shows a frozen DOM snapshot + network log + console around it.

## 3. Common failures

- **"Login email input not found"** — A UI change broke `login-email-input`. Update `LoginScreen.tsx` and re-run.
- **"camera-card count: 0"** — RLS rejected the admin query. Check `supabase/seed.sql` ran on `db reset`; inspect Supabase API logs in the workflow run.
- **"expected admin-users to reject viewer; status=200"** — RLS hole. **DO NOT MERGE.** Audit `supabase/migrations/*admin-users*`.

## 4. Reproduce locally

```bash
cd /home/bgdaddy/Downloads/camaras
npm run test:e2e:install
npm run test:e2e:bash
```

Bump the `timeout: 20_000` constants in `auth-rls.spec.ts` if the report
shows >20s waits — usually a slow Supabase cold start.
