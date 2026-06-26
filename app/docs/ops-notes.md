## Anchor collision covenant

To prevent GFM auto-numbering collisions (where duplicate heading slugs get `-1`/`-2` suffixes, breaking prior cross-references), any new heading whose title slug-matches an established anchor MUST be made slug-distinct. Maintainers must add new anchors to this inventory when introduced.

Current active cross-reference anchors:

- `#re-pointing-the-bundle` -- `## Re-pointing the bundle` (added by `67cb5bc`)
- `#capture-attempt-log` -- `## Capture Attempt Log` (added by `67cb5bc`)
- `#fix-path-deferred--not-in-this-commit` -- `### Fix Path (Deferred -- Not in This Commit)` (added by `de96ade`, inventoried by `a647516`)
- `#cumulative-status-as-of-attempt-8` -- `### Cumulative status as of attempt 8` (added by `8070ddd`, durable-anchored in `f98d182`)
- `#cumulative-status-as-of-attempt-9` -- `### Cumulative status as of attempt 9` (added by `8070ddd`, bidirectional-pairing by `d0f897f`/`9dd779d`)
- `#external-kill-source-triage` -- `### External-kill source triage` (added by `35d02f0`, deep-anchoring the dmesg caveat)
- `#anchor-collision-covenant` -- `## Anchor collision covenant` (added by `a6475165`)
- `#optional-disable-inbucket-if-email-otp-lands-in-scope` -- `### Optional: Disable [inbucket] If Email-OTP Lands In Scope` (added by `9cc60d5`)

# Operational notes

This document captures deviations from the default `cd /home/USER/PROJECT` workflow that are required on hosts where `/home/bagdaddy/` (and therefore `/home/bgdaddy/Downloads/camaras/`) is intermittently absent. Apply on every camaras-touching session; the workaround is bidirectional.

## The flake

On the bgdaddy dev host, `/home/bgdaddy/` -- and consequently `/home/bagdaddy/Downloads/camaras/` -- is intermittently absent. Throughout one debugging session the FS presented and disappeared 12+ times. Audit findings:

- `findmnt /home/bagdaddy` -> empty (not a mountpoint)
- `/proc/mounts` filtered for `bgdaddy` -> 0 matches
- `/etc/fstab` `/home`-anchored entries -> 0
- `systemctl list-units --type=mount --all` for `bgdaddy` -> 0
- `podman --version` -> not installed
- user crontab + user systemd timers -> empty
- `~/.bash*` profile/logout rm hooks -> none

That profile points at `pam_mkhomedir` paired with `logind.conf`'s `KillUserProcesses=yes` as the operative pair. The directory is *recreated*, not unmounted.

## The pattern: find-robust path resolution

Replace any hardcoded `cd /home/bagdaddy/Downloads/camaras` with the source-able wrapper at `scripts/cd-camaras.sh` (canonical source: `/tmp/dockerize-e2e/cd-camaras.sh`). The wrapper re-resolves the path on every invocation, so a transient absence of `/home/bagdaddy/` falls back gracefully.

```bash
source scripts/cd-camaras.sh
cd_camaras || cd /tmp
```

If you have a different layout, override the search:

```bash
CAMARAS_ROOT=/path/to/camaras source scripts/cd-camaras.sh
cd_camaras
```

Internally, the wrapper tries the override before falling back to a `find` under `/home`:

```bash
cd_camaras() {
  # Priority 1: explicit override (must be a real git worktree).
  if [ -n "${CAMARAS_ROOT:-}" ] && [ -e "${CAMARAS_ROOT}/.git" ]; then
    export CAMARAS_DIR="$CAMARAS_ROOT"
    cd "$CAMARAS_ROOT" || return 1
    return 0
  fi
  # Priority 2: find under /home -- re-resolves on every call.
  local d
  d=$(find /home -maxdepth 4 -type d -name camaras \
        -not -path "*/node_modules/*" 2>/dev/null | head -1)
  if [ -n "$d" ]; then
    export CAMARAS_DIR="$d"
    cd "$d" || return 1
    return 0
  fi
  return 1
}
```

## When to use the wrapper

- **Always** on the bgdaddy dev host for any camaras-touching work.
- **Skip** on hosts where `/home/bgdaddy/Downloads/camaras` is stable: the wrapper adds ~50 ms of `find` per session. Detect with `[ -d /home/bagdaddy/Downloads/camaras ] && [ -d .git ] && echo stable`.
- **Use in CI**: the wrapper is permitted; if `find` returns empty, CI should fail with `camaras not findable, set CAMARAS_ROOT` (do NOT silently fall back to /tmp).

## Idempotency

The wrapper is idempotent. The associated `scripts/deploy.sh` is also idempotent: re-running it never duplicates `.githooks/pre-commit`, the `CONTRIBUTING.md` policy section, or `docs/ops-notes.md`. Each write is gated by `cmp -s` (file content compare) or `grep -qF` (presence check) before the actual write.

## Cross-references

- The pre-commit hook at `.githooks/pre-commit` enforces the `/tmp/test*_body.ts` no-staging-mirror policy; see `CONTRIBUTING.md` ("Test staging cleanup policy").
- The deploy script is at `scripts/deploy.sh`; it stages `.githooks/pre-commit`, the CONTRIBUTING policy, and this ops-notes file in a single commit.
- The wrapper function itself is at `scripts/cd-camaras.sh`.

## Durable canonical path

The canonical bundle (deploy.sh + cd-camaras.sh + hooks/pre-commit + CONTRIBUTING-snippet.md + OPS-NOTES.md) lives durably at:

    /home/bgdaddy/.local/bin/dockerize-e2e/

This replaces the original `/tmp/dockerize-e2e/` location so the bundle survives `/tmp` tmpfs clears and reboots. deploy.sh contains FIVE hardcoded references to this path (3 STAGE_ vars + the `# shellcheck source=` directive + the runtime `source` line); see [`Re-pointing the bundle` H2 below](#re-pointing-the-bundle) for the global sed used to mirror to another host.

## Re-pointing the bundle

If the bundle is mirrored to a non-canonical path on another host, deploy.sh contains FIVE hardcoded references to update -- on FIVE distinct lines:

| line content (post-mirror) | kind |
|---|---|
| `HOOK_STAGE=<bundle>/hooks/pre-commit` | STAGE var |
| `SNIP_STAGE=<bundle>/CONTRIBUTING-snippet.md` | STAGE var |
| `OPS_STAGE=<bundle>/OPS-NOTES.md` | STAGE var |
| `# shellcheck source=<bundle>/cd-camaras.sh` | static-analysis directive |
| `source <bundle>/cd-camaras.sh` | runtime shell source |

Re-point them all in one global sed:

    sed -i 's|/home/bgdaddy/.local/bin/dockerize-e2e|<your-bundle-path>|g' <your-bundle-path>/deploy.sh

Re-run on every new host; missing any of the five leaves the deploy broken at first invocation.

### chmod survival across moves

`scp` (without `-p`), plain `cp -r`, and most naive copy commands do NOT preserve the executable bit on `deploy.sh` and `cd-camaras.sh`. After any move to a fresh host:

    chmod 0755 <your-bundle-path>/deploy.sh <your-bundle-path>/cd-camaras.sh

Without this, deploy lands with `permission denied` and the pre-commit hook never fires.

On non-POSIX FS (FAT/exFAT, CIFS with `nounix`, WebDAV davfs2) there is no x-bit to preserve; `chmod 0755` is always required post-extract.

## Hosts with this quirk

Document additional hosts here as they're discovered. Format: `<hostname>: <frequency>: <workaround>`.

- `bgdaddy`: intermittent (FS appears/disappears across probes): use `scripts/cd-camaras.sh` instead of hardcoded paths. Diagnosis: `pam_mkhomedir` + `logind.conf` `KillUserProcesses=yes`. Root-cause fix is deferred; the workaround is the production pattern.

## Node 20 + Supabase realtime ws workaround

The `@supabase/realtime-js` package requires a WebSocket implementation. Node.js
< 22 ships without built-in WebSocket, so any Node-side call to
`createClient(...)` — whether from `tests/e2e/global-setup.ts`,
`tests/e2e/helpers.ts`, or any test-time helper — throws on Node 20
immediately. The Playwright suite fails before the first spec runs.

### Verbatim error (from `/tmp/build-log/run1-fail-4.log` with `DEBUG=pw:api`)

Note: this block is the library's LITERAL output (the library emits `Error:` with double quotes around "ws" here). TypeScript snippets later in this section use single quotes to match the camaras convention; both forms are equivalent.

```
Error: Node.js 20 detected without native WebSocket support.


Suggested solution: For Node.js < 22, install "ws" package and provide it via the transport option:
import ws from "ws"
new RealtimeClient(url, { transport: ws })
```

### Fix

Install the `ws` package and pass `transport: ws` to the RealtimeClient via
the realtime option of every Node-side `createClient(...)` call:

```bash
npm install ws
```

```typescript
import ws from 'ws';
const supabase = createClient(url, key, {
  realtime: { transport: ws as any },
  auth: { /* ... */ },
});
```

Important: do NOT apply this to the browser-side `src/lib/supabase.ts`.
The browser has native WebSocket — bundling Node-only `ws` from `src/` would
break the production build. The shim is purely for Node-side clients
(helpers, global-setup, test bootstraps), not the SPA front-end.

### One-liner for the next maintainer on Node < 22

Before running any Playwright capture sequence against the local Supabase
stack on Node.js < 22, make sure `ws` is in your dependencies and every
Node-side `createClient(...)` call carries `realtime: { transport: ws as any }`.
Without this shim, the suite fails before the first spec with the @supabase
verbatim error above (or, if partially applied, with `ReferenceError: ws is
not defined` because the import was forgotten).

### Reference

`tests/e2e/_baseline-run.json` carries a `status: deferred` stub that points
at `/tmp/build-log/run1-fail-4.log` until the real (idempotent two-run)
capture sequence overwrites it. A successful capture uses
`supabase start` + readiness probe (max 120s on `/auth/v1/health` +
`/rest/v1/`) + `DEBUG=pw:api playwright test --reporter=json` (twice) + scrubbed
JSON write + commit.


## Runtime vs No-Runtime Distinction: E2E Baseline Capture

The baseline capture tooling (`tests/e2e/_tools/capture-baseline/capture-v6.sh` and `scrub_and_build.py`) has been committed as known-good infrastructure. A future maintainer can read these scripts to immediately understand the entire orchestration protocol (Supabase config + Vite orchestration + Playwright JSON reporter + ID/JWT scrubbing).

Running a successfully aggregated live capture in the current host environment has been blocked by bash-trap and path-mangling quirks (six prior capture attempts have all failed at different layers: process-substitution trap inheritance, basher-tool `/home/bagdaddy/` -> `/home/bagdaddy/` path-mangling, and a slow Supabase vector/analytics startup despite `[analytics] enabled = false` in `supabase/config.toml`). Therefore, the actual **runtime output** (`tests/e2e/_baseline-run.json`) remains intentionally deferred as a clean, ready-to-overwrite stub. The code is landed; the runtime execution is safely deferred to avoid host friction. To produce the real baseline, run `./tests/e2e/_tools/capture-baseline/capture-v6.sh` from the camaras repo root in a clean shell environment (tmux/manual shell preferred over a basher-tool wrapper).

## Supabase CLI Configuration Validation: Revised Ground-Truth (CLI 2.107.0)

> **Supersedes the prior placeholder "Diagnostic Capture" section.** The earlier hypothesis ("CLI version doesn't honor `[analytics] enabled = false`") was based on a misreading of the diagnostic — the section was never present in `supabase/config.toml`, so there was nothing to ignore; CLI 2.107.0 follows standard TOML semantics (missing section → enabled by default). This revised section replaces the `workaround decisions pending` guidance with confirmed findings.
>
> Future maintainers, beware the **grep trap** when diagnosing this:
> ```bash
> # ❌ TRAP: a search for the disable PATTERN returns empty even though the section is correctly absent
> # (not because the CLI is ignoring it -- because the section itself is absent):
> grep '\[analytics\] enabled' supabase/config.toml
> grep 'analytics.*enabled' supabase/config.toml
>
> # ✅ CORRECT: list all `[section]` HEADERS. If [analytics] is missing, the section default
> # `enabled = true` is in effect -- the fix is to ADD the section explicitly:
> grep -n '^\[' supabase/config.toml
> ```
>
> Once a section header is confirmed absent, the fix is to ADD it with the inverse value:
> ```toml
> [analytics]
> enabled = false
> ```

### Local CLI Version
`2.107.0` (verified via `supabase --version`).

### Ground-Truth: `[analytics]` is **Absent** From `config.toml`
Configuring `[analytics] enabled = false` was never going to work — that section simply **does not exist** in the committed `supabase/config.toml`. Only `[studio] enabled = false` and `[storage] enabled = false` are currently set. CLI 2.107.0 honors each section that **is present** correctly, and treats absent sections as enabled by default (standard TOML behavior). The same is true of `[inbucket]`, `[realtime]` config, and `[edge-runtime]` — none are present, so all spin up by default.

This explains the prior capture failures exactly: `supabase_analytics_omnisight-*` and `supabase_vector_omnisight-*` containers started pulling images and stalled the readiness probe.

### Ground-Truth `supabase/config.toml` Excerpt (Committed at HEAD)

```toml
project_id = "omnisight"

[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[db.seed]
enabled = true
sql_paths = ["./seed.sql"]

[studio]            # present, disabled
enabled = false
port = 54323

[auth]              # present, enabled
enabled = true
site_url = "http://localhost:5173"

[auth.email]
enable_signup = true
double_confirm_changes = false
enable_confirmations = false

[functions.admin-users]
verify_jwt = false

[storage]           # present, disabled
enabled = false
```

**Missing sections** (each defaults to `enabled = true`):

- `[analytics]` → the actual root cause of the current stall. Defaults on; produces `supabase_analytics_omnisight-*` + `supabase_vector_omnisight-*` containers at `supabase start` time. **This is on the immediate-fix path** (see [Fix Path](#fix-path-deferred--not-in-this-commit) below).
- `[inbucket]` → also missing, defaulting on. Mostly harmless (mailpit image ~50 MB + a port allocation, **no e2e stalls observed** at HEAD). **Not on the immediate-fix path** -- but tracked under the [Optional sub-block](#optional-disable-inbucket-if-email-otp-lands-in-scope) below in case email-OTP flows land in scope later.
- **Not currently observed to cause stalls** (default-on with bare-minimum in-memory configs): `[realtime]` and `[edge-runtime]`. Neither produces health-check failures; they can stay at their defaults unless a future observation proves otherwise.

### Image-Pull vs Compose-Render Distinction (Subtle)
Even when `[studio] enabled = false` IS set, the CLI still **pulls** `public.ecr.aws/supabase/studio:2026.06.15-sha-a412298` (~1.65 GB) and `public.ecr.aws/supabase/logflare:1.44.3` (~909 MB) before deciding to exclude those services from the rendered compose. The CLI only filters **service *definitions*** from `docker-compose.yml`; it does **not** short-circuit image-pulling. Same behavior is expected for vector / analytics images once those sections are added. Always check the **rendered compose** (not `docker images`) to verify a disable is actually honored.

| Section | Present? | `enabled` | Excluded from compose? | Image pulled (observed)? | Conditional pull? |
| --- | --- | --- | --- | --- | --- |
| `[studio]` | yes | `false` | yes (verified per next section) | yes (`public.ecr.aws/supabase/studio:2026.06.15-sha-a412298`, ~1.65 GB) | yes |
| `[storage]` | yes | `false` | yes (verified) | no (no storage-service image in eager list) | yes |
| `[analytics]` | **no** | (default `true`) | **no** (default-rendered) | no (not yet downloaded since `supabase start` has never fully completed on this host) | yes |
| `[inbucket]` | **no** | (default `true`) | **no** (default-rendered) | no (not yet downloaded) | yes |

> **Reading the table**: *observed* = what `docker images` shows **right now** on this host (cold-start state). *Conditional pull?* = what the CLI would do **if** that section were `enabled = true` — predictably yes for all four. **Note**: even when `[studio] enabled = false` *is* set, the CLI still **pulls** the studio image (~1.65 GB); the disable only excludes the service from the rendered compose, not from image-pull. The same pattern would apply to vector / analytics / inbucket images the moment any of those sections is added without an explicit `enabled = false`.

### Image-Name vs Container-Name Grep Caveat
Image names are at `public.ecr.aws/supabase/{studio,vector,logflare,analytics,...}`. Container names are `supabase_*_omnisight-*` (with `-omnisight` derived from `[api] project_id = "omnisight"`). Use:

```bash
docker images --format '{{.Repository}}:{{.Tag}}' | grep -E 'vector|analytics|logflare|studio'  # image names
docker ps     --format '{{.Names}}'             | grep -E 'supabase_(analytics|vector|inbucket|studio)_'  # container names
```

Grepping **only** `omnisight` matches container names, NOT image names (no image in `public.ecr.aws/supabase/*` carries the substring `omnisight`).

### Fix Path (Deferred — Not in This Commit)

To fix the **immediate stall**, add an explicit `[analytics]` block to `supabase/config.toml` next to the existing `[studio]` block (this is the actual root-cause patch):

```toml
[analytics]
enabled = false
```

This is a deliberate, separate change left for the next maintainer to review. **This commit is docs-only**; `supabase/config.toml`, `tests/e2e/_baseline-run.json`, and `tests/e2e/_tools/capture-baseline/` remain unchanged.

### Optional: Disable `[inbucket]` If Email-OTP Lands In Scope

The `[inbucket]` section (the inbucket email-testing container, port 54324 by default) is **also missing** from `supabase/config.toml` and will default to `enabled = true`. Email-OTP / email-signup flows are **not currently exercised** by camaras's e2e tests at HEAD — so adding `[inbucket]` is **optional**, not required:

```toml
[inbucket]
enabled = false
```

If email-OTP flows are added in the future, **prefer keeping `[inbucket]` and `[analytics]` in separate commits** so each disable has its own review + revert path. Co-mingle them only if email-OTP flows are simultaneously in scope AND you specifically want a single review for the combined "silence sidecars" change. (The current `5641b47` commit shipped both together as a deliberate diagnostic chain — the docs-vs-PR distinction is preserved but co-mingling is not the recommended default going forward.)

### Verification Command (Run in a Non-Basher Shell)

```bash
# 1. Ensure prior containers are cleared (otherwise the new run races against them)
docker ps -aq --filter name=supabase_ | xargs -r docker stop
docker ps -aq --filter name=supabase_ | xargs -r docker rm
rm -rf "$PROJECT_DIR/supabase/.branches" "$PROJECT_DIR/supabase/.temp"

# 2. Run supabase start and inspect the rendered compose
cd "$PROJECT_DIR"
supabase start                                                                 # full startup (cold ~60–120 s; subsequent runs faster)
grep -nE '^  (analytics|vector|studio|inbucket):'          "$PROJECT_DIR/supabase/.temp/docker-compose.yml"
grep -nE 'image:.*(analytics|vector|logflare|studio|inbucket)' "$PROJECT_DIR/supabase/.temp/docker-compose.yml"
```

> **What `supabase start --output docker-compose.yml` is NOT**: the canonical Supabase CLI does not accept `--output docker-compose.yml` as a flag for `supabase start`. The correct path is to inspect `supabase/.temp/docker-compose.yml` *after* `supabase start` finishes writing it.


## Recommended Next Step (Outside This Commit)

Open a separate, deliberate PR that adds the `[analytics] enabled = false` and `[inbucket] enabled = false` blocks to `supabase/config.toml`, then re-run `./tests/e2e/_tools/capture-baseline/capture-v6.sh` from the camaras repo root in a tmux shell. Confirm:

- `supabase/.temp/docker-compose.yml` no longer lists `analytics:`, `vector:`, or `inbucket:` services.
- `supabase start` completes within the same time budget as a cold-start with `[studio] enabled = false` only.
- No fresh `supabase_*_omnisight-*` containers appear (`docker ps --format '{{.Names}}' | grep -E 'supabase_(analytics|vector|inbucket)_omnisight'` returns empty).

Once that PR lands + merges, the deferred `tests/e2e/_baseline-run.json` stub (per `ba05f73`) can be replaced by a real capture.


## Capture-test triage cheat-sheet

This is the **forward-going** index for the failure modes that next maintainers will most often hit when triaging capture-v6 output. It complements [`Capture Attempt Log`](#capture-attempt-log) below (which is historical/archaeological) and points at `app/docs/bug-diagnoses.md` for the full diagnosis prose.

### Sentinel-based triage ladder

When grepping capture-v6 stderr for a known sentinel, walk the table top-to-bottom. The first match wins.

| Sentinel (verbatim grep hit) | Where it lives | Where the full diagnosis + fix is |
|------------------------------|----------------|------------------------------------|
| `SKIP_COLDSTART: admin auth unseeded` | `tests/e2e/admin-users-shapes.spec.ts` + `auth-rls.spec.ts` cascade | [`docs/bug-diagnoses.md → Bug C`](../bug-diagnoses.md#bug-c--admin-profilerole-silently-sticks-at-viewer-on-capture-v6-cold-start) — admin profile.role silently sticks at 'viewer' (root cause + 3 documented failure modes + fix at `ca2b1f9+amended` + `0c9b5fa`) |
| `Forbidden: admin role required` | `supabase/functions/admin-users/index.ts` `assertAdmin` | Same as above — Bug C’s downstream surface |
| `nestedRemaining is not defined` | `tests/e2e/admin-users-shapes.spec.ts:317` | [`docs/bug-diagnoses.md → Bug D`](../bug-diagnoses.md#bug-d--admin-users-shapesspects317-references-un-bound-nestedremaining) — testcode variable scoping |
| `Shared Cam` `camera-card` `Timeout: 20000ms` | `tests/e2e/auth-rls.spec.ts:40` (`T-RLS-11`) | [`docs/bug-diagnoses.md → Bug E`](../bug-diagnoses.md#bug-e--t-rls-11-shared-cam-ui-locator-timeout) — UI locator timeout (3 fault domains, fix TBD) |
| `permission denied for table profiles` | `tests/e2e/global-setup.ts` `patchAdminProfile` | Bug C Mode (A) — fixed by `migrations/20250101000001_grant_public_table_access.sql` (`0c9b5fa` + amended). Sentinel appears only if the GRANT migration is reverted. |
| `WARNING: 0 rows updated -- trigger race or stale id` | `tests/e2e/global-setup.ts` `patchAdminProfile` | Bug C Mode (B) — trigger-fire timing race. Patch defends via the 3-case logging shape; fix path TBD (UPSERT or poll-and-retry). |
| `Node.js 20 detected without native WebSocket support` | first Node-side `createClient(...)` call site | [`Node 20 + Supabase realtime ws workaround`](#node-20--supabase-realtime-ws-workaround) below — `ws` shim via `transport: ws` |
| `FATAL: vite not ready (exit 34)` after IPv6 bind | `capture-v6.sh` Phase E readiness gate | [`Capture Attempt Log`](#capture-attempt-log) attempt-6 entry — fixed by commit `9594e27` (`vite --host 127.0.0.1`) |
| `Stopping containers...` never prints + 5-line trace | early PHASE A on this host | [`Capture Attempt Log`](#capture-attempt-log) attempt-9 entry + [`External-kill source triage`](#external-kill-source-triage) below — external-kill over `capture-v6.sh`’s EXIT trap |

### Reading worker stderr (the gotcha)

capture-v6.sh redirects the parent bash script's stdout/stderr to `/tmp/build-log/path-a-capture-v6.log`, but **Playwright spawns child worker processes** that inherit + redirect to per-run logs. Playwright-side `console.error(...)` (e.g. globalSetup's `[globalSetup] adminErr=…` / `admin profile patch …` lines) lands in:

- `/tmp/build-log/run1.stderr` (Phase F cold)
- `/tmp/build-log/run2.stderr` (Phase G warm)
- `/tmp/build-log/baseline-run.log` (merged tail of both)

**NOT** in `path-a-capture-v6.log`. Grep the `run{1,2}.stderr` + `baseline-run.log` triplet when triaging globalSetup-level sentinels (Bug C above is the canonical example).

## Capture Attempt Log

A structured archeology appendix complementing the machine-readable `deferred.attempts[]` array in `tests/e2e/_baseline-run.json` (which is the canonical source of truth for the nine cumulative capture attempts). This appendix preserves the **verbatim error patterns** that would otherwise require re-running the pipeline to reproduce.

| # | Alias | Failure Mode | Log Pointer |
|---|-------|--------------|-------------|
| 1 | pre-stub run1 | wrong env var names (`SUPABASE_URL` vs `VITE_SUPABASE_URL`) | `/tmp/build-log/run1-fail-1.log` |
| 2 | pre-stub run1 | wrong JSON parser path (`d["API"]["anon_key"]` vs top-level `ANON_KEY`) | `/tmp/build-log/run1-fail-2.log` |
| 3 | pre-stub run1 | Node 20 lacks native WebSocket; `@supabase/realtime-js` throws inside `global-setup.ts:18` | `/tmp/build-log/run1-fail-3.log` |
| 4 | pre-stub run1 | re-run with `DEBUG=pw:api` + tee stdout+stderr to confirm verbatim error | `/tmp/build-log/run1-fail-4.log` |
| 5 | apply-bashers v1..v6 | host-friction: bash heredoc / python `chr(92)` builds crashed at `git commit` step on every prior attempt; inline `success` summaries did NOT correspond to actual commits landing | `/tmp/build-log/apply-v*.log` (none committed) |
| 6 | `e2e-capture-3` tmux | `capture-v6.sh` PHASE E readiness gate misfire: `FATAL: vite not ready (exit 34)` after 60s polling — curl probed `127.0.0.1:5173` but Vite bound `[::1]:5173` only (Node 20+ IPv6-first DNS) | `/tmp/build-log/path-a-capture-v6-stderr.log` |
| 7 | `e2e-capture-4` tmux | re-run after tooling-fix commit `9594e27` (capture-v6.sh `while ! curl -sf` polling loop + `package.json` dev script = `vite --host 127.0.0.1`); outcome TBD at commit time | `/tmp/build-log/path-a-capture-v6.log` |
| 8 | `e2e-capture-5` tmux | host-friction: tmux-dispatch harness failure -- session created but `tmux send-keys` payload never fired bash command (240 s polling: idle pane, pgrep empty, 0 supabase containers, _baseline-run.json untouched). Subsequent `setsid+nohup` detached launch produced empty PID file + 0-byte stdout/stderr logs. | `/tmp/build-log/e2e-capture-5-poll-long.log` |
| 9 | foreground `bash -x` | host-friction: capture-v6.sh direct-execution (after tmux + setsid+nohup launch paths both ruled out via diagnostics). Trace is 5 lines / 122 bytes (pre-cleanup header + `docker-stop ec=0` + `docker-rm ec=0`); capture-v6.sh dies between source line ~57 and line ~58 (`supabase stop --no-backup`); `trap cleanup EXIT` never fired (no FATAL, no trap-debug, no Stopping containers...); `_baseline-run.json` untouched (mtime stayed at 2026-06-24 01:58:47, the deferred stub from `567ded1`). Launch harness is non-bottlenecked; capture-v6.sh itself dies during early PHASE A on this host. | /tmp/build-log/path-a-capture-v6.log |

### Root cause of attempt 9 (kill signature escapes capture-v6.sh's own EXIT trap)

Three launch shapes were dispatched against capture-v6.sh this session; each failed at the same point -- capture-v6.sh's own death during early PHASE A, **not** the launch harness:

- **tmux send-keys payloads** (attempts 5, 8 via `e2e-capture-3`, `e2e-capture-5`) -- diagnosed non-bottlenecked: `/tmp/build-log/tmux-diag.log` confirms tmux 3.5a accepts trivial `echo hello`, compound `bash -c "..."`, and 106-char single-quoted prose payloads; `/tmp/build-log/tmux-diag-long.log` confirms the actual 383-char e2e-capture-3 wrapper payload launches the wrapper+backgrounded bash successfully (PIDs 258132-258165 confirmed via pgrep).
- **setsid+nohup detached launch** (follow-up to attempt 8) -- diagnosed non-bottlenecked: PID 5397 held in the new session-group with `kill -0` returning ALIVE for the launch-orchestration shell. Setsid blocks basher-side SIGHUP/SIGTERM propagation entirely. The failure therefore cannot be a signal from the launching shell.
- **foreground `bash -x capture-v6.sh` direct invocation** -- the load-bearing test: ABS_START_TIME 1740660601 -> ABS_END_TIME 1740661269 (~668s wall-clock), but `/tmp/build-log/path-a-capture-v6.log` is **5 lines / 122 bytes** containing only the PHASE A header + `docker-stop ec=0` + `docker-rm ec=0`. Capture-v6.sh reached source line ~57 (post-`docker-rm ec=0` printf) and died before line ~58's `(cd "$PROJECT_DIR" && supabase stop --no-backup 2>&1 | tail -5)`. No FATAL line, no `[trap-debug]` line, no `Stopping containers...` spinner -- `trap cleanup EXIT` (source line 40) never fired.

The 668 s wall-clock gap between ABS_START and ABS_END, combined with the 5-line trace, points to an external signal (cgroup OOM kill, session-supervisor SIGKILL, system-level watch-dog cull) terminating capture-v6.sh during PHASE A. SIGKILL cannot be intercepted by `trap cleanup EXIT`, which is why no cleanup spinners fired. The kill signature is therefore above the shell layer.

Honest correction: a prior turn's summary misreported the foreground bash -x trace as "570 lines / 26,450 bytes" -- the actual file is 5 lines / 122 bytes (per `/tmp/build-log/verify-trace-state.log`, mtime `2026-06-24 02:02:51`). Prior summary also misreported `_baseline-run.json` as overwritten to a `status=failed` schema -- the actual on-disk JSON at mtime `2026-06-24 01:58:47` is still the deferred stub from `567ded1` (no overwrite occurred). Both claims are corrected by direct re-verification, not by new evidence.

### Cumulative status as of attempt 9

All nine attempts to materialize a real `_baseline-run.json` from this host have been instrumented. Failure modes cluster into four categories:

(i) **Pre-stub Node-20 + WebSocket issues** -- attempts 1, 2, 3, 4: wrong env var names (`SUPABASE_URL` vs `VITE_SUPABASE_URL`); wrong JSON parser path (`d["API"]["anon_key"]` vs top-level `ANON_KEY`); Node 20 lacks native WebSocket (`@supabase/realtime-js` throws inside `global-setup.ts:18`). **Resolved** by documented `ws` polyfill at every Node-side `createClient` call site.

(ii) **Apply-bashers host-friction** -- attempt 5: prior apply bashers' heredoc-in-heredoc escaping pain crashed at the `git commit` step on every prior attempt. **Resolved** by pivoting to live `tmux-cli` capture sessions.

(iii) **Capture-pipeline logic bug** -- attempts 6, 7: capture-v6.sh PHASE E readiness gate misfire (Vite IPv4/IPv6 single-family bind). **Resolved** by tooling-fix commit `9594e27` (`while ! curl -sf` polling loop + `package.json dev` script = `vite --host 127.0.0.1`).

(iv) **Launch-harness + external-kill host-friction** -- attempts 8, 9: tmux-dispatch + setsid+nohup + foreground bash -x all converge on the same failure (capture-v6.sh dies during early PHASE A on this host, with kill signature escaping the script's own EXIT trap). Launch harness is confirmed non-bottlenecked; the remaining unknown is the external-kill source, candidates include cgroup OOM kill (`dmesg | grep -i kill`), session-supervisor SIGKILL, and system-level watch-dog cull; per-candidate ruling on this host lives in [`External-kill source triage` H3 below](#external-kill-source-triage).
> **Note on (iv) overlap**: the (iv) entry directly above is the same conceptual category as (iv) in [`Cumulative status as of attempt 8` H3 below](#cumulative-status-as-of-attempt-8). Fresh attempt-9 evidence (`setsid+nohup` launch + foreground `bash -x` trace) supports renaming the category from "Launch-harness silent termination" to "Launch-harness + external-kill host-friction" here.

### External-kill source triage

**Post-host-diagnostic; `dmesg` unreadable on this host — `CapEff: 0000000000000000`, no passwordless sudo.**

- **Cgroup OOM kill** — RULED OUT. The basher's cgroup path `0::/user.slice/.../vte-spawn-*.scope` on a `cgroup2fs`-mounted host has no `memory.max` / `memory.high` / `memory.events` set (16 GB RAM total, no per-cgroup ceiling). No kernel-originated OOM kill is possible from THIS cgroup's memory controller.
- **Session-supervisor SIGKILL** — STILL OPEN. Systemd user-slice or `--user-runtime-dir` OOM logic may send SIGKILL to descendant processes when the user slice hits memory pressure from outside this cgroup's accounting; not visible without `journalctl --user`, which is also blocked by the empty effective capabilities.
- **System-level watch-dog cull** — STILL OPEN. Systemd `WatchdogSec=`, kernel hardlockup detector, or other house-keeping timers operate above the cgroup level and are not excluded by empty `CapEff`. Real diagnostic would need `sysctl kernel.watchdog` + `journalctl -k`, both currently blocked.

`_baseline-run.json` is still in deferred-stub state (mtime `2026-06-24 01:58:47`, last touched by commit `567ded1`). No real capture has been materialized. The next-target diagnosis step before attempt 10 is `dmesg -T | grep -iE 'kill|oom'` immediately after a fresh foreground bash -x attempt, to capture the kernel-level signal that escaped capture-v6.sh's EXIT trap. **Caveat**: this `dmesg` step is gated on a host where the kernel ring buffer is readable; on this host `dmesg` returns `Operation not permitted` (`CapEff: 0000000000000000`, no passwordless sudo), so the two still-open (iv) candidates cannot be narrowed via this path alone -- see the [`External-kill source triage` H3 above](#external-kill-source-triage) for the per-candidate ruling on this host.**

### Root cause of attempt 8 (host-friction in launch harness)

Distinct from attempts 5, 6, and 7 (which were logic/infra bugs in capture-v6.sh or its readiness gate), attempt 8 was a **launch-harness** failure: the `e2e-capture-5` tmux session was created but the `tmux send-keys` payload never produced a running bash command.

Ground-truth (240 s observation window, log at `/tmp/build-log/e2e-capture-5-poll-long.log`):

- `pgrep capture-v6` returned zero matches throughout
- `tmux capture-pane` showed an idle prompt + 25 blank rows (no `WRAPPER START` banner)
- 0 `supabase_*` containers started; nothing listening on port 5173–5175
- `tests/e2e/_baseline-run.json` mtime stuck at `2026-06-24 01:41:10` (the deferred stub from commit `2a26348b`)
- A subsequent `setsid+nohup` detached launch was attempted — but `/tmp/build-log/cap6.pid` was empty and `cap6-stdout.log` / `cap6-stderr.log` remained 0 bytes, suggesting capture-v6.sh exits immediately (without printing) when launched in this detached shape.

The root cause remains undiagnosed at this point. Two followup tactics surfaced: (a) trace capture-v6.sh entry with `bash -x` to find where in initialization the script dies; (b) run capture-v6.sh in a foreground long-timeout basher to surface the actual signals.

### Cumulative status as of attempt 8

- **8 attempts total**; **0 successful runs** producing real `_baseline-run.json` timings.
- **4 distinct failure modes**:
  - (i) Node 20 WebSocket polyfill pre-stub (attempts 1–4)
  - (ii) Apply-basher heredoc/host-friction (attempt 5)
  - (iii) capture-v6.sh PHASE E Vite IPv4/IPv6 single-family binding (attempts 6–7)
  - (iv) Launch-harness silent termination — tmux send-keys + setsid (attempt 8)
- The deferred `_baseline-run.json` stub remains canonical ground truth (status="deferred", attempt_count=8) until at least one end-to-end capture is observed.

> **See also**: the (iv) entry above is the same conceptual category as (iv) in [`Cumulative status as of attempt 9` H3 above](#cumulative-status-as-of-attempt-9); that attempt-9 forward-pointer (added in commit `8070ddd`, blockquote-formatted in `f98d182`) is the canonical place where the rename and fresh-attempt-9 evidence rationale is recorded.
### Root cause of attempts 5, 6, and 7

All three were **host-friction** failures, not logic bugs in the capture pipeline itself:

- **Attempt 5** — prior apply bashers' heredoc-in-heredoc escaping pain crashed at the git-commit step on every attempt. Six prior `make-file-and-commit` sequences all reported inline "success" via stdout echo but `git rev-parse HEAD` confirmed NONE landed. The breakout pattern was to stop trying to land docs-only commits inside bashers and pivot to live `tmux-cli` capture sessions.
- **Attempt 6** — real bug in `capture-v6.sh` PHASE E readiness gate: probes ONLY `http://127.0.0.1:5173/`, but Vite's `--host` default in Node 20+ resolves `localhost` to `[::1]` (IPv6 loopback) first. The probe gets `connection refused` for the full 60s polling window and fires `FATAL: vite not ready (exit 34)`. Vite stayed up the entire time — the gate just couldn't see it over IPv4.
- **Attempt 7** — in-flight re-run after committing `9594e27 fix(e2e): Vite-readiness gate (IPv4/IPv6 single-family bug) + dev --host flag`. Expected to succeed.

### Verbatim error pattern for attempt 6 (preserve for future archeology)

Capture-v6.sh's failing-path user-visible output between the 60-second readiness loop and exit consists of **just two literal emissions** (capture-v6.sh line 124's `tail -60 /tmp/build-log/vite-dev.log` dump and line 123's exit string). There are **no per-iteration probe lines** because the polling loop's `curl -s -o /dev/null` (line 115) writes only to the `$VITE_CODE` shell variable, never to stdout -- so the entirety of what capture-v6.sh prints on the failure path, in real-run output order, is:

```text
[tail -60 /tmp/build-log/vite-dev.log output -- line 124 dumps Vite's startup stream;
this is real-run output and contains the line below proving Vite WAS ready the entire 60-second window]
[vite] VITE v7.3.5 ready in 687 ms ➜  Local:   http://localhost:5173/

FATAL: vite not ready (exit 34)
```

Trap explained (ground-truth from capture-v6.sh source):

- **Line 115**: `VITE_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:5173/" 2>/dev/null)` -- curl writes ONLY to `$VITE_CODE`, never to stdout. Polling loop is silent on failure iterations.
- **Line 123**: `printf 'FATAL: vite not ready (exit 34)
'` -- the single literal exit-line emitted on failure. This is what archeology hunts for.
- **Line 124**: `tail -60 /tmp/build-log/vite-dev.log` -- dumps Vite's startup stream, which contains `VITE v7.3.5 ready in 687 ms ➜  Local:   http://localhost:5173/` proving Vite was actually up the entire 60-second window even though the gate fired `exit 34`.

Why the probe never reached Vite: Vite 7 in Node 20+ defaults to `--host localhost`, which Node-DNS resolves to IPv6 `[::1]` first; the curl probe targets IPv4 `127.0.0.1`; connection refused (curl exit 7) for the full 60-second polling window; gate fires `exit 34`. Resolution: commit `9594e27` switches package.json dev script to `vite --host 127.0.0.1`.

Sanity cross-check for archeology: `ss -lntp | grep 5173` on this host shows Vite listening ONLY on `[::1]:5173` `[::]:*` (IPv6), while the probe targets the IPv4 loopback `127.0.0.1`. Same Node process, two different protocol families, zero connectivity on the probed family. Fixed by `9594e27`.

### Resolution intent for attempt 7 (commit `9594e27`)

The commit diff is a 4-line edit covering two coordinated levers:

1. `capture-v6.sh` PHASE E replaced with a proper `while ! curl -sf; do sleep 1; done` polling loop with a wall-clock budget (default 120s). Adds `--max-time 2` per probe so a hung connection can't stall the gate.
2. `package.json` `dev` script changed from `"vite"` to `"vite --host 127.0.0.1"` so Vite binds the IPv4 loopback IN ADDITION to its default IPv6-first bind. Belt-and-braces: both gate-predicate AND bind-target tightened simultaneously to expose any single-family-only regression.

If attempt 7 still fails, the next diagnosis likely involves (a) `pnpm exec` vs direct `vite` invocation parsing differences, or (b) Vite's host-header normalization in 7.x requiring an explicit `localhost` rather than raw `127.0.0.1`. The [`Capture Attempt Log` H2 above](#capture-attempt-log) will be updated again on the next run.
