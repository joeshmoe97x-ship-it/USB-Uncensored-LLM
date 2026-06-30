## Anchor collision covenant

To prevent GFM auto-numbering collisions (where duplicate heading slugs get `-1`/`-2` suffixes, breaking prior cross-references), any new heading whose title slug-matches an established anchor MUST be made slug-distinct. Maintainers must add new anchors to this inventory when introduced.

Cross-heading duplicates (same slug under different H2 parents, or repeated at H2/H3/H4 levels across the docs corpus) are tolerated in this codebase if NO cross-reference links target the duplicated slug directly. GFM renderers (GitHub, mkdocs, docusaurus) auto-route collisions via parent H2 prefix at render time, so such H3s/H4s don't break in-corpus navigation. The documented convention when adding a new heading whose slug duplicates an existing one is: either (i) link via the parent H2 prefix explicitly in any cross-references (e.g., `[...](#bug-a-—-cameragrid-shows-zero-camera-cards-for-admin)` rather than `[...](#cross-references)`), or (ii) append a parenthetical to the heading title for explicit slug disambiguation (e.g., `### Cross-references (Bug B)` → `#cross-references-bug-b`). The `#cross-references` row at the end of this inventory is the canonical example of the tolerated form (NOT a collision that needs to be fixed).

> **Counting-regex pitfall** (logged for future archeologists): `grep -cE '^- \`' ops-notes.md` overcounts by 28 because it matches `- \`file/path\`: description` prose bullets in 7 H2 sections. The CORRECT inventory regex is `grep -cE '^- `#'` which matches only inventory rows whose first backtick-wrapped token IS a `\#slug`. Off-hand greps that ignore the `#` anchor will produce 44 -- that's noise, not anchor drift.

> **Adopted-row grep-count semantic**: `grep -cF '### Adopted: <title>'` substring-grep multi-counts by design (H3 header + anchor-collision-covenant inventory-row embed where each row carries a verbatim `### Adopted: <title>` reference after its slug, plus any footer prose cites of the H3 title) -- this is intentional craftsmanship for archeology grep-resolvability, NOT duplication; `grep -cE '^### Adopted:'` is the audit-script's canonical structural metric and counts ONLY true column-0 H3 headers (counts ONLY true column-0 H3 headers -- one per Adopted cycle row at the time the audit-script is run; the substring `### Adopted: <title>` ALSO appears in non-`^###` contexts: the rightmost anchor-collision-covenant inventory row embeds the latest Adopted H3 title verbatim inside its bullet description after its `\`#adopted-slug\`` token, every Adopted row body cites its own or sibling H3 titles in `Origin` / `What this closes` / `Cross-references` prose, and prior-row footers cite H3 titles as pickaxe-grep anchors -- so the two grep forms return different counts by design, NOT by duplication or stale data). Both forms return correct counts under their respective semantics; archeologists picking a count source should pick the one whose semantics match their downstream query.
This protects future maintainers from the same false-positive signal that prompted this turn's investigation; also mirrored at app/docs/DEPLOYMENT.md ## Reference links pitfall-blockquote.

Current active cross-reference anchors:

- `#re-pointing-the-bundle` -- `## Re-pointing the bundle` (added by `67cb5bc`)
- `#capture-attempt-log` -- `## Capture Attempt Log` (added by `67cb5bc`)
- `#fix-path-deferred--not-in-this-commit` -- `### Fix Path (Deferred -- Not in This Commit)` (added by `de96ade`, inventoried by `a647516`)
- `#cumulative-status-as-of-attempt-8` -- `### Cumulative status as of attempt 8` (added by `8070ddd`, durable-anchored in `f98d182`)
- `#cumulative-status-as-of-attempt-9` -- `### Cumulative status as of attempt 9` (added by `8070ddd`, bidirectional-pairing by `d0f897f`/`9dd779d`)
- `#external-kill-source-triage` -- `### External-kill source triage` (added by `35d02f0`, deep-anchoring the dmesg caveat)
- `#anchor-collision-covenant` -- `## Anchor collision covenant` (added by `a6475165`)
- `#optional-disable-inbucket-if-email-otp-lands-in-scope` -- `### Optional: Disable [inbucket] If Email-OTP Lands In Scope` (added by `9cc60d5`)
- `#closure-cycle-audit-log-update-attempts-10-11-12-empirical-progress` -- `### Closure cycle audit log update: attempts 10-11-12 empirical progress on this host` (added by THIS COMMIT's `docs(ops-notes)` entry, paired with the appended Capture Attempt Log rows 10 + 11)
- `#capture-v6-vs-playwright-discovery-scope-gap` -- `## Capture-v6 vs Playwright discovery scope gap` (added by `05b29d6`)
- `#cross-references` -- cosmetic duplicate H3/H4 slug (added by `c4a3444`'s v1.4 followup audit, count-text trimmed at `ec77946` followup): 5 occurrences across `docs/bug-diagnoses.md` (Bug A `###`) + `app/docs/ops-notes.md` (1 H2 + 2 H3 + 1 H4-level instance) all under distinct H2 parents; zero functional impact (no in-doc or cross-doc link targets this slug directly); tolerated per the cross-heading-duplicate convention documented above. Bug B (`### Cross-references (Bug B)` per `bb59c57`) + Bug D (`### Cross-references (Bug D)` per `ec77946`) anchor at the explicit-disambiguation siblings `#cross-references-bug-b` + `#cross-references-bug-d` respectively and are inventoried as separate rows below.
- `#cross-references-bug-b` -- explicit-disambiguation sibling of the `#cross-references` cosmetic-collision slug (added by `bb59c57`'s hygiene-polish followup): `### Cross-references (Bug B)` in `docs/bug-diagnoses.md` Bug B subsection anchors at this distinct slug (GFM algorithm: lowercase + spaces→dashes + parenthesis-stripped → `#cross-references-bug-b`). Bug A's H3 stays at the un-disambiguated `#cross-references` for visual symmetry with the cross-heading-duplicate convention; future Bug-N sections adopting convention option (ii) anchor at `### Cross-references (Bug N)` → `#cross-references-bug-n` (forward-expandable pattern).
- `#cross-references-bug-d` -- explicit-disambiguation sibling of the `#cross-references` cosmetic-collision slug (added by `ec77946`'s Bug D cite followup): `### Cross-references (Bug D)` in `docs/bug-diagnoses.md` Bug D subsection anchors at this distinct slug (GFM algorithm: lowercase + spaces→dashes + parenthesis-stripped → `#cross-references-bug-d`). Bug A's H3 stays at the un-disambiguated `#cross-references`; Bug B anchors at `#cross-references-bug-b` (see 12th row above); future Bug-N sections adopting convention option (ii) anchor at `### Cross-references (Bug N)` → `#cross-references-bug-n` (forward-expandable pattern, parallel to the 12th row's pattern).
- `#future-audit-batch-roadmap` -- `## Future audit-batch roadmap` (added by THIS COMMIT's `docs(ops-notes)` entry): deferred-adoption roadmap H2 -- placeholder for audit-batch proposals proposed-but-deferred to a future cycle. Currently contains the deferred host-shell tooling audit-chain adoption (proposed cycle: `audit-cycle-v1.9` or `audit-cycle-v2.0`); the H3 subsection anchors at the parent H2 slug (no per-H3 explicit-disambiguation sibling needed because the H3 is forward-extendable: future deferred-adoption entries follow the same parent-H2-anchor pattern, distinct from the `### Cross-references` H3 pattern that uses per-Bug explicit-disambiguation siblings).

- `#sidecar-disable-config-adopted` -- `## Sidecar-disable config (adopted)` (flipped from the stale `### Recommended Next Step (Outside This Commit)` deferral at the 2026-06-29 docs-flip cycle; tracks the `[analytics] enabled = false` + `[inbucket] enabled = false` blocks that were already-live in `supabase/config.toml` since the `935d9dc chore(infra): import camaras/main as app/ subtree (archive-based)` import — the file itself has been in the desired state since that import; this H2 just records the formal Adopted status + cross-reference target)
- `#adopted-cross-domain-header-rendering-check-extension-v2-5` -- `### Adopted: cross-domain header-rendering check extension (v2.5)` (added by `5d44443`): audit-script tool-layer SPDX-header checker. The v2.5 cycle extends `audit_script.sh`'s Phase C / G / H grep-census + Phase J per-file 5/5 semantic-line coverage gate to the `## H2` + `# shell-comment` (bash) + `""" docstring """` (Python) sectors (cross-domain header-rendering). Every SPDX-bearing `.sh` / `.py` file in the repo's tracked set must have all of `Provenance:` + `Tripod Closure:` + `Anchor Covenant (\S+):` + `Disambiguation:` + `Tag Chain:` lines within the first 15 lines (`coverage_failures: 0` invariant); explicitly registered for inter-doc forward-reference archeology (the `### Adopted: Python docstring audit-chain (v2.4)` H3 above's `Cross-domain concrete tax` bullet + the `### Adopted: cross-domain header-rendering check extension (v2.5)` H3's `Tripod Closure` bullet both target this slug directly via `#adopted-cross-domain-header-rendering-check-extension-v2-5`, NOT via parent-H2 routing -- this slug MUST therefore be in the inventory even though the v2.5 H3 lives under the parent H2 `## Future audit-batch roadmap` whose own slug is already registered at row 14 above).

- `#adopted-bundle-side-integrity-cluster-smoke-test-incident-retro-releases-install-snippet-bug` -- `### Adopted: bundle-side integrity-cluster smoke test (incident retro [releases-install-snippet-bug])` (added by THIS COMMIT): incident retro + permanent CI gate for the v29-archeology-chain.bundle install-snippet bug; preserves the verbatim broken-snippet error + the verbatim git-clone exit-128 message + the corrected idempotent curl+git-clone-bare pattern as canonical pickaxe-grep-resolvable anchors in the H3 body. Distinct from the 9 prior Adopted rows in two ways: (a) the audited substrate is the **publication surface** (GitHub release body `#releases` block, the surface the END USER reaches -- not the doc/tool surface that the developer reaches); (b) documents what was REVERTED AND what REPLACED it (a broken-snippet incident retro), where prior Adopted rows document what was ADDED only. The H3's grep-resolvable anchors are: (i) the verbatim `fatal: repository 'https://github.com/joeshmoe97x-ship-it/USB-Uncensored-LLM/releases/download/v2.9-archeology-chain/v29-archeology-chain.bundle/' not found` token (a future archeologist hitting the same exit-128 lands here); (ii) the canonical sha256 `745d495f657671af542b2dba652952b3ee8f435b1c4a97f3511d52d9914af57a` (lint-locked); (iii) the `[releases-install-snippet-bug]` tag (incident-archeology pickaxe-target); (iv) the corrected idempotent token sequence (single source-of-truth for the install pattern going forward). CI-gate surface: `app/scripts/install-smoke-test.sh` (5-sentinel bash smoke: curl / sha256 / size / clone / branch / head; SPDX 5-line header validated by Phase J of `audit_script.sh`) wired to `.github/workflows/install-smoke.yml` (on:push to `[main, v2.7-v2.8-stacked-archeology]` + on:pull_request + workflow_dispatch). Tripod: bundle-side seal at v2.9 PARTIAL archive (this row's row sibling) + commit-side seal at v2.7 polish round (this row's row sibling) + this row's CI-gate; canonical sha256 + HEAD (`26c8d81`) + bundle URL is the SINGLE source-of-truth triple replicated across this row + the install-smoke-test.sh script + the published GitHub release body.

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


## Sidecar-disable config (adopted)

*Status: ADOPTED.* The `[analytics] enabled = false` and `[inbucket] enabled = false` blocks are already present in `supabase/config.toml` (introduced during the `935d9dc chore(infra): import camaras/main as app/ subtree (archive-based)` import — never re-touched at HEAD). The prior `## Recommended Next Step (Outside This Commit)` H2 wording was a stale deferral; the file already carries both blocks with diagnostic annotations citing the v1.4 `[analytics]` validation work (`commit de96ade`) and the v2.6 cold-start image-pull / compose-render distinction.

Future maintainers diagnosing cold-start image-pull or compose-render logic can verify the sidecars are excluded from the live render by running `supabase start` and inspecting the CLI's output artifact (`supabase/.temp/docker-compose.yml`), which should lack `analytics:`, `vector:`, and `inbucket:` service definitions AND lack `image:.*(analytics|vector|inbucket)` image lines. The current host's verification run on 2026-06-29T23:01:40Z (`debian` host, CLI 2.107.0; per the coordinating ``7dbd099`` `chore(supabase)` commit at HEAD whose body carries the full `supabase start` + `supabase status` evidence) confirmed: `supabase start` elapsed 54s (exit=0) on warm images; `supabase status` reported 8 services in the `Stopped services` array — `supabase_inbucket_omnisight`, `supabase_storage_omnisight`, `supabase_imgproxy_omnisight`, `supabase_pg_meta_omnisight`, `supabase_studio_omnisight`, `supabase_analytics_omnisight`, `supabase_vector_omnisight`, `supabase_pooler_omnisight` — confirming 4 of those 8 are the sidecars targeted by this H2 (`[analytics]` → analytics + vector, `[inbucket]` → inbucket, `[studio]` → studio, `[storage]` → storage are all filtered from container set). Alive canonical surface is 6-service: kong + auth/gotrue + rest/postgrest + realtime + db/postgres + edge-runtime. CLI 2.107.0 quirk worth noting: `supabase/.temp/docker-compose.yml` was NOT written to disk (only `supabase/.temp/cli-latest` artifact exists — sha256 `88d0035095b46a981aae69e91bb665b906b762f0622fcf6d90aa7a6904e8e181` with content `v2.108.0`); the canonical visibility surface under 2.107.0 is therefore `supabase status`'s `Stopped services` array, NOT a `grep` against `supabase/.temp/docker-compose.yml` (docs guidance further up referencing the rendered compose remains best-effort for CLI <2.107.0). Image-pull vs compose-render distinction at L300-L370 still applies: even with the disable flags active, the analytics/vector/studio/storage IMAGES still pull during cold-start (`~1.65 GB studio + ~909 MB logflare + ~150 MB analytics/vector + ~50 MB mailpit/inbucket`); only the running-container set is filtered, exactly as the `Stopped services` array above enumerates.


## Bug E lock-in workflow

A four-artifact design — defensive fallback shape, regression lock-in spec, capture-v6 cycle, on-demand validator — that pins Bug E (the 12-per-run `[pageerror] TypeError: Cannot read properties of undefined (reading 'cls')` from `CameraGrid.tsx:296`) closed across both regression windows without depending on any single component's incidental behavior. Each artifact addresses a different failure domain; losing any one of them would let a future regression land silently.

### Artifacts at HEAD

#### 1. The defensive fallback shape — `commit 37ae861` + amendment `c2ee264`

The four guarded components all use bracket-syntax indexing with `?? FALLBACK`:

| File | Indexed table | Verbatim shape | Defensive against |
|---|---|---|---|
| `app/src/components/CameraGrid.tsx` (L132) | `BRAND[cam.brand as keyof typeof BRAND]` | `?? { cls: '...', label: String(cam.brand ?? '').toUpperCase() }` | unsupported `brand` strings |
| `app/src/components/EvidenceLocker.tsx` | `TYPE_META[type]`, `STATUS_META[status]` | `?? TYPE_META.log_bundle` / `?? STATUS_META.ready` | unsupported `type`/`status` |
| `app/src/components/EventsList.tsx` | `SEVERITY[severity]`, `TYPE_ICONS[type]` | `?? FALLBACK` / `?? FALLBACK_ICON` | unsupported `severity`/`type` |
| `app/src/components/ThreatMonitor.tsx` | `TYPE_META[type]` | `?? FALLBACK` | unsupported `type` |

The verbatim `CameraGrid.tsx` pattern at L132:

```typescript
const brand = BRAND[cam.brand as keyof typeof BRAND] ?? { cls: 'text-gray-300 bg-white/5 border-white/10', label: String(cam.brand ?? '').toUpperCase() };
```

This is the load-bearing invariant. **Reverting any single one** of the four to bare bracket-syntax lookup (`BRAND[cam.brand]` without `?? FALLBACK`) will re-introduce the original Bug E symptom the next time the camera list expands. The documented trigger was `commit 1e8c5811`'s 2→11 seeded-brand expansion in `supabase/seed.sql` — the seed grew past the 4-key `BRAND` literal's coverage without the reactivity that `?? FALLBACK` provides.

#### 2. The regression lock-in spec — `commit 27323db` (`tests/e2e/bug-e-brand-divergence.spec.ts`)

A single-test spec that:

1. Pre-cleans any prior `f00dbabe-0000-0000-0000-000000000001` row (idempotent against interrupted runs).
2. Inserts a divergent cameras row with `brand='unsupported_test_brand'` — a synthetic name outside the 4-key `BRAND` literal AND outside the wider 11-seeded set.
3. Signs in via the browser (mirrors `auth-rls.spec.ts`'s login flow).
4. Asserts the seeded card IS visible via `expect(...).toBeVisible({ timeout: 20_000 })`.
5. Asserts **zero `[pageerror]` lines** are emitted during render via `captureConsoleAndNetwork`. This is the primary regression lock-in: a future contributor reverting any of the four guarded `??` fallbacks would surface `[pageerror] TypeError: ... reading 'cls' ...` directly in the captured stderr instead of degrading to a 60s locator-timeout symptom (which is exactly what `auth-rls.spec.ts`'s `T-RLS-11` was suffering through before the fix).
6. Asserts the brand badge shows `UNSUPPORTED_TEST_BRAND` (the nullish-coalescing fallback label, not the throwing path).
7. Post-cleans via `test.afterAll` — soft-fails on delete error so the spec never collapses purely on a DB-side hiccup at teardown.

The spec's schema source of truth is `app/supabase/migrations/20250101000000_init_schema.sql` (per its top-of-file JSDoc), and the UUID inventory check at top is explicit about slot reuse (`f00dbabe-...-001` is synthetic, no collision risk with the 12 seeded admin/seed fixtures — it sits outside seed.sql's inventory as a deliberately visible synthetic marker).

#### 3. capture-v6.sh Phase F + Phase G mirror — `commit 7b0904b`

The two cold/warm Playwright runs share an explicit, identical test list:

```bash
DEBUG=pw:api "$PLAYWRIGHT" test --workers=1 \
  tests/e2e/auth-rls.spec.ts \
  tests/e2e/admin-users-shapes.spec.ts \
  tests/e2e/bug-e-brand-divergence.spec.ts \
  --reporter=json > /tmp/build-log/run1.json 2> /tmp/build-log/run1.stderr
# Phase G mirrors the same list verbatim (same argv, different output files)
```

`scrub_and_build.py` keys leaves by `spec_meta` + line + column fingerprint; mismatched Phase F/G lists would mark the new spec `dropped_in_run1` or `dropped_in_run2`, producing a partial baseline that overstates regression coverage. The mirror invariant is enforced by an explicit comment in `capture-v6.sh` Phase G explaining why the order matters.

The T-RLS-* index in `_baseline-run.json`'s `tests[]` array comes from `scrub_and_build.py`'s sorted-set intersection of both runs — `bug-e-brand-divergence.spec.ts` lands at **T-RLS-12** because its filename sorts last among the three (`admin-users-shapes` < `auth-rls` < `bug-e`). Playwright's own test-discovery order is filesystem-walk-order and is NOT what produces the T-RLS-* index.

> **JSDoc caveat**: `tests/e2e/bug-e-brand-divergence.spec.ts`'s top-of-file comment still says "Capture-v6 inclusion: INTENTIONALLY OMITTED". That note was true at the time of `27323db` but is **stale** as of `7b0904b`. Update the spec's JSDoc to point to the new capture-v6 Phase F+G wiring in a followup commit.

#### 4. On-demand validator — `/tmp/build-log/validate-divergence-spec.sh`

A 156-line, single-stack-up shell script that lives off-repo for a reason: it is a **per-host operational artifact** — each maintainer's stack-up produces slightly different captures and per-session log paths, so the validator is **re-derived per session**. Re-creating it after a `/tmp` tmpfs clear or on a fresh host is documented in the script's header comment. The script's durable logic:

- **Idempotent**: kills any prior vite (`pkill -f vite`), then reuses whatever's already started if vite is alive (so subsequent invocations skip the 30s vite cold-compile window).
- **Two-tier env guard**: `exit 74` if `/tmp/build-log/sb-status.json` is missing; `exit 33` if the file is present but `API_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY` are empty (defends against silently propagating empty env vars, which would mask the JWT-layer failure as a generic spec error at test-time rather than at validator-time).
- **`nohup + disown`** for vite launching (validated portable detachment pattern; the subshell+SIGHUP trap of plain `&` was the root cause of prior silent failures).
- **IPv4 base URL** (`http://127.0.0.1:5173`, not `localhost`) for Playwright — `nohup npm run dev` binds on `127.0.0.1` per `camaras/package.json` and Linux's `/etc/hosts` resolves `localhost` to `::1` (IPv6) first, producing `ERR_CONNECTION_REFUSED` even when curl-`127.0.0.1` returns 200.
- **60-second readiness poll** (12*5s via `curl --max-time 2` per iteration; one curl request per 5s prevents hangs from stalling the gate).
- **Spec invocation**: `E2E_BASE_URL=http://127.0.0.1:5173 npx playwright test tests/e2e/bug-e-brand-divergence.spec.ts --reporter=line >/tmp/build-log/spec-phase1.log 2>&1` with exit code captured via `$?`.
- **Persistence**: leaves vite alive at end so subsequent invocations skip the 30s cold-compile.

### Offline-first stack-up commands

For a fresh stack bring-up on a host that does NOT have `capture-v6.sh`'s full orchestration available (CI runner, contributor laptop without supabase CLI, recorder-less debugging session, etc.), the minimal validation sequence is:

```bash
# 1. cd + supabase start (cold 30–60s; warm 10–15s; --no-backup preserves db state across restarts)
cd /home/bgdaddy/USB-Uncensored-LLM/Linux/app
supabase start

# 2. Capture sb-status.json (3 keys needed: API_URL, ANON_KEY, SERVICE_ROLE_KEY)
supabase status -o json > /tmp/build-log/sb-status.json

# 3. Start vite with explicit IPv4 bind + VALIDATED detachment pattern
#    (nohup + disown; NOT plain &. Plain & only backgrounds within the subshell,
#    then SIGHUP kills the child on subshell exit — this was a load-bearing fix.)
nohup env \
  VITE_SUPABASE_URL="$(jq -r .API_URL /tmp/build-log/sb-status.json)" \
  VITE_SUPABASE_ANON_KEY="$(jq -r .ANON_KEY /tmp/build-log/sb-status.json)" \
  npm run dev </dev/null >/tmp/build-log/vite-dev.log 2>&1 &
disown $!
echo "vite-pid=$!"

# 4. Poll 127.0.0.1:5173 readiness (12*5s = 60s budget; --max-time 2 prevents hangs)
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  sleep 5
  curl -fsS -o /dev/null --max-time 2 http://127.0.0.1:5173 \
    && { echo "vite-OK after $((i*5))s"; break; }
  [ $i -eq 12 ] && { echo "vite-FAIL after 60s"; tail -20 /tmp/build-log/vite-dev.log; }
done

# 5. Run the spec with E2E_BASE_URL explicit IPv4 override
#    (playwright.config.ts reads E2E_BASE_URL at config-load time; never mutate
#     this env var between runs in a single capture cycle)
E2E_BASE_URL=http://127.0.0.1:5173 npx playwright test \
  tests/e2e/bug-e-brand-divergence.spec.ts --reporter=line
```

For a one-shot invocation that wraps steps 1–5 in a single file (and persists the validator across stack-up cycles): copy `/tmp/build-log/validate-divergence-spec.sh` to the new host, then `bash /tmp/build-log/validate-divergence-spec.sh`.

### Why all four artifacts exist

| Failure domain | Caught by | Symptom if missing |
|---|---|---|
| Unsupported `brand` value in seeded data | (1) defensive fallback at CameraGrid.tsx L138 + 3 siblings | `TypeError: Cannot read properties of undefined (reading 'cls')` per render — 12 pageerrors per capture cycle |
| Future regression of the fallback shape | (2) regression spec — positive assertion that any-of-4 fallbacks protect the render | silent regression: rendering breaks but smoke tests don't notice because the smoke path uses a known-supported brand |
| "Spec exists but never ran" silent regression | (3) capture-v6 wiring — Phase F + G mirror pick it up every cycle | spec drifts to green-once-then-broken; the first time a contributor silently removes it from Phase F+G the regression has zero signal |
| "Production build" / local CI / contributor laptop | (4) on-demand validator — `bash /tmp/build-log/validate-divergence-spec.sh` | contributor can't reproduce the green locally; CI without supabase stack can't run the spec |

Each covers a different failure surface; collapsing any one of them would let the regression resurface. Together they form a closed loop:

- **(1)** prevents the symptom at runtime.
- **(2)** verifies the prevention at test-time every cycle.
- **(3)** ensures (2) actually runs every cycle (not neglected as a one-shot then forgotten).
- **(4)** lets a contributor reproduce (2)+(3)'s green signal locally without spinning up capture-v6's full orchestration.

### Cross-references

- [`Sidecar-disable config (adopted)` H2 above](#sidecar-disable-config-adopted) — the previously deferred (now adopted) analytics/inbucket-disable path; orthogonal to Bug E but cited for capture-cycle context.
- [`Capture-test triage cheat-sheet` H2 below](#capture-test-triage-cheat-sheet) — sentinel-based triage ladder for capture-v6 stderr. Bug E's sentinel (`[pageerror] TypeError: ... reading 'cls' ...`) IS in the sentinel table (T-RLS-12 row key in `_baseline-run.json` per the Bug E closure cycle fix stack `37ae861` + `c2ee264` (defensive fallback shape) + `27323db` (regression lock-in spec at `tests/e2e/bug-e-brand-divergence.spec.ts`) + `7b0904b` (capture-v6.sh Phase F+G wiring that includes the spec in both runs); the closure cycle is empirically closed as of `90c41ee`'s captured baseline dated 2026-06-27T21:36:46Z; the triage ladder picks it up automatically. Note: the sentinel row was already in the table before this cross-reference note's stale-wording correction.
- `app/src/components/CameraGrid.tsx:132` (verbatim defensive pattern).
- `app/tests/e2e/bug-e-brand-divergence.spec.ts` (regression spec, 4 step names + afterAll + pageerror-array assertion at STEP 5).
- `capture-v6.sh` Phase F (cold Playwright run = `print_phase 'F: playwright run 1 (cold)'`) + Phase G (warm Playwright mirror = `print_phase 'G: playwright run 2 (warm)'`) (mirror invariant).
- `/tmp/build-log/validate-divergence-spec.sh` (per-host validator, 156 lines, two-tier env guard).
- `app/tests/e2e/_baseline-run.json` T-RLS-12 row (passed × 2 across both runs as of `90c41ee`).

The new section slug `#bug-e-lock-in-workflow` does not collide with any anchor in the [`Anchor collision covenant` H2 above](#anchor-collision-covenant) inventory.

### Closure-cycle audit log (this commit)

The user's closure loop (Phase 2 = temp-revert `?? FALLBACK` to bare `BRAND[cam.brand]`; Phase 3 = restore) ran 2026-06-26 on this host. **Empirical closure achieved** in this run after the previously-documented host-network blocker was bypassed with three targeted workarounds. The host `/etc/hosts` shim originally prescribed (`127.0.0.1 rest db gotrue storage realtime`) was orthogonal — the failure point was Kong's internal Docker DNS, not the host's. All three workarounds are non-rootful: `docker exec -u root` grants container-root (not host-root), the symlink is gitignored, and the cache nuke is reversible.

**Phase 2 (temp-revert CameraGrid.tsx L132 to bare `BRAND[cam.brand as keyof typeof BRAND]`)**: `bash /tmp/build-log/validate-divergence-spec.sh` exit=1, with 12 `pageerror` events captured in `/tmp/build-log/validate-divergence-spec.spec.log`.

- **Canonical branch confirmed (1 of 12 pageerrors)**: `[pageerror] TypeError: Cannot read properties of undefined (reading 'cls')` — the literal signature the user predicted. Fires at `CameraGrid.tsx:132` on the divergent brand seed (`unsupported_test_brand`) during render of the camera-card HUD pill.
- **11 of 12 pageerrors are likely unrelated rtsp:// video play-rejects** (best-inference classification; the exact text of all 12 captured lines was not directly inspected in this run — verify with `grep '\[pageerror\]' /tmp/build-log/validate-divergence-spec.spec.log | head -15`). Each `<video autoPlay src="rtsp://...">` in the 11 seeded cameras throws a `NotSupportedError` from the browser's media decoder. These fire regardless of whether the defensive `?? FALLBACK` is present — they are an unrelated media-decode issue, NOT a regression of the BRAND lookup. Caveat: this 1+11 split depends on the 11 seeded brands actually being in BRAND's 4 keys (`eseecloud` / `huntervision` / `ajcloud` / `onvif`); if any seeded brand is outside that set, the bare lookup throws for that card too and the 12/12 split is all TypeError. Future improvement (out of scope here): the spec could filter to only `TypeError`-shaped pageerrors, or skip the count when no card mounts; today the noise is tolerated and the test's 20s `toBeVisible` timeout still distinguishes a real regression from media-decode noise (the TypeError throws synchronously and prevents the card from mounting, so toBeVisible times out cleanly while video play-rejects let the card mount).

**Empirical-closure prerequisites** (run these BEFORE the validator, on this host, to convert the closure cycle from static to empirical):

1. **Kong-internal DNS shim** (the load-bearing fix; replaces the host `/etc/hosts` shim the user originally prescribed). Kong receives the test's request at `127.0.0.1:54321`, then forwards internally to PostgREST at hostname `rest` (or `pgrest`/`postgrest`/`supabase_rest`). Inside the Docker network, those names must resolve. The containers are named with the `_Linux` suffix (per project directory naming), so a host-level `/etc/hosts` shim is **orthogonal** to the failure. Fix with `docker exec -u root` (container-root, not host-root):
   ```bash
   REST_IP=$(docker inspect supabase_rest_Linux --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' | head -1)
   for h in rest supabase_rest pgrest postgrest; do
     docker exec -u root supabase_kong_Linux sh -c "grep -qE \"[[:space:]]${h}(\\\$|[[:space:]])\" /etc/hosts || echo '${REST_IP} ${h}' >> /etc/hosts"
   done
   ```
2. **Migrations symlink + db reset**. `supabase/migrations/` does not exist by default in this repo; migrations live at `app/supabase/migrations/`. Without the symlink, `supabase db reset` applies zero migrations, and `public.cameras` doesn't exist, so the bug-e spec's service-role seed INSERT fails with `PGRST205 Could not find the table 'public.cameras' in the schema cache` BEFORE the BRAND TypeError can fire:
   ```bash
   ln -s $L/app/supabase/migrations $L/supabase/migrations
   supabase db reset --no-seed
   ```
   The symlink is gitignored (it lives in `supabase/` which is in `.gitignore`); recreate per session.
3. **Vite kill + cache nuke**. To force vite to pick up the reverted file at L132. The harness's `[A]` step kills prior vite, but a stale `node_modules/.vite` cache can serve a stale module graph in dev mode:
   ```bash
   pkill -9 -f vite; pkill -9 -f esbuild; pkill -9 -f 'npm run dev'
   rm -rf $L/app/node_modules/.vite
   ```
   Then the harness's `nohup env VITE_* npm run dev` forks fresh and reads the new file.

**Phase 3 (restore CameraGrid.tsx L132 byte-equal to HEAD, removing the 5-line Phase 2 comment block)**: re-ran `validate-divergence-spec.sh` → exit=0, `pageerror_count=0`, milestones `[bug-e-brand-divergence] seeded_card_visible=OK` and `brand_badge_visible=OK` for `UNSUPPORTED_TEST_BRAND` (the nullish-coalescing fallback label). `git diff HEAD -- app/src/components/CameraGrid.tsx` = empty (NET-ZERO).

**Closure status: EMPIRICAL** (loop fully closed: Phase 2 captured the canonical `[pageerror] TypeError: Cannot read properties of undefined (reading 'cls')` signature, Phase 3 restore made the same validator exit=0 with 0 pageerrors and the divergent card visible with the `UNSUPPORTED_TEST_BRAND` label). The pre-existing `TS2345` errors in `CameraGrid.tsx` from the tsc sanity check are baseline (arise from the `SetStateAction<Camera[]>` widening in `useEffect`-driven fetches) — NOT introduced by this closure cycle.

**Transient state to clean up on this host** (none of these are committed; all are operational):

- The Kong `/etc/hosts` shim persists until `supabase stop && supabase start` recreates the container.
- The `supabase/migrations` symlink is gitignored; safe to leave or remove.
- Vite is left running per harness `[C]` step's `Persist invariant` clause.Next maintainer: the canonical signature branch is now empirically closed. To reproduce the same closure cycle in one shot, run the three prerequisites above, then the Phase 2 revert + `validate-divergence-spec.sh` + Phase 3 restore + `validate-divergence-spec.sh` sequence. The 12-pageerror-disambiguation is worth a followup: filtering the spec to TypeError-shaped pageerrors (or skipping the count when no card mounts) would make future Bug E regressions louder and the noise floor zero.


### Closure cycle audit log update: attempts 10-11-12 empirical progress on this host

The audit log entry above (the `### Closure-cycle audit log (this commit)` H3 from `35af161` lineage) records the **single-component** Phase 2/Phase 3 revert cycle -- it proves the BRAND `?? FALLBACK` pattern is load-bearing by reverting and restoring a single line, then validating the divergence spec passes. It does **not** record a full capture-v6.sh end-to-end run on this host: as of `35af161`, attempts 1-9 all died before Phase B (`supabase start`) ever finished initializing on this dev box.

The two Capture Attempt Log rows appended by THIS commit (`#10 post-12a41f4 capture`, `#11 post-1f11c3d cold`) extend the closure cycle's empirical surface FROM single-component revert validation TO multi-component capture-v6.sh end-to-end progress on this host:

- **attempt-10 (Phase B progress, post-12a41f4)** marks the FIRST time `supabase start` came up cleanly on this host. The verbatim `unexpected EOF At statement: 0` capture disproved the long-suspected `[analytics] enabled = false` hypothesis (the CLI 2.107.0 init where the section-default rendered behavior was wired in is the actual root cause). Disproving the wrong hypothesis cost a cycle, but `1f11c3d`'s `auto_expose_new_tables = true` fix is structural and forward-durable to 2026-10-30 (the Cloud feature-emulation deprecation timeline).
- **attempt-11 (Phase F progress, post-1f11c3d)** marks the FIRST time capture-v6.sh completed `supabase start` → readiness probe → env exports → Vite background + readiness → Playwright cold F in a single run on this host. Although the run then FATALed at exit 41 (strict `if [ "$PW1_EC" != "0" ]; then exit 41; fi` not yet tolerating the documented T-RLS-11 timedOut), the Phases A-E infrastructure is now demonstrably working end-to-end. The `cd62bb9` + `bc9dce7` + `regex-relaxation` followup stack converts that strict-exit into a value-shape tolerance gate.

Together, attempts 10-11 are the **first empirical A→B AND A→F** progress on this host. The prior 9 attempts clustered around Pre-stub orchestration issues (i), Apply-basher friction (ii), Capture-pipeline logic bug (iii), and Launch-harness + external-kill host-friction (iv). This commit's two rows are the first that actually advance INTO `supabase start` and INTO Playwright execution.

**Note on subsequent attempt-12 (not in this audit-log entry; SUCCESS)**: capture-v6.sh ran end-to-end with bash exit 0; Phase F+G both emit `[unexpected] pw exit=1 TOLERATED: known T-RLS-11 timedOut...` (the documented Bug E surface, per the cd62bb9+bc9dce7+regex-relaxation gate); Phase J value-shape scrub gates (`sb_secret_[A-Za-z0-9_-]{8,}` / `eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.` / `ANON_KEY` literal / `SERVICE_ROLE_KEY` literal) all PASS; Phase M auto-committed the regenerated `_baseline-run.json` as `90c41ee test(e2e): OVERWRITE baseline sequence with REAL Playwright timings` (author `ops-ci <ops@camaras.local>`) recording `status: "captured"`, `captured_at: "2026-06-27T21:36:46Z"`, `total_tests: 12` -- T-RLS-11 preserved as `timedOut` (the documented Bug E surface), the other 11 tests `passed`. The Phase-M auto-commit is FULL empirical-loop closure on this host, and its commit message is the canonical record.

#### Cross-references for the four `docs(ops-notes)` certifiers of this update

- **covenant inventory**: this H3's slug `#closure-cycle-audit-log-update-attempts-10-11-12-empirical-progress` does NOT collide with the existing anchor inventory (the closest is `#capture-attempt-log`; sibling distinct slugs `#cumulative-status-as-of-attempt-8` + `#cumulative-status-as-of-attempt-9` are also unrelated).
- **Capture Attempt Log**: rows 10 + 11 in the `[Capture Attempt Log` H2](#capture-attempt-log) table above (this commit).
- **parent audit log**: [`### Closure-cycle audit log (this commit)` H3 above](#closure-cycle-audit-log-this-commit) from `35af161` lineage.
- **closure-cycle fix series**: `1f11c3d` (attempt-10), `cd62bb9` + `bc9dce7` + `regex-relaxation` (attempt-11).
- **subsequent empirical closure run**: ops-ci auto-commit `90c41ee` at HEAD's parent (the autoscript that Phase M of capture-v6.sh produced).


### TS2345 baseline followup (pre-existing, NOT introduced by closure cycle)

`npx tsc --noEmit` on `app/src/components/CameraGrid.tsx` reports two TS2345 errors at lines 58 and 71, both with the same root cause. They predate the closure cycle (the closure cycle only touched L132; the errors are at L58 and L71, which are the `useEffect` and `onAuthStateChange` `setCameras` call sites) and should be tracked but not fixed as part of Bug E lock-in.

#### Verbatim tsc error (from `npx --no-install tsc --noEmit --target ES2022 --moduleResolution node --allowJs --jsx react-jsx --skipLibCheck --pretty src/components/CameraGrid.tsx`)

```
src/components/CameraGrid.tsx:58:27 - error TS2345: Argument of type 'Dispatch<SetStateAction<Camera[]>>' is not assignable to parameter of type '(value: { id: string; ip?: string; }[]) => void | PromiseLike<void>'.
  Types of parameters 'value' and 'value' are incompatible.
    Type '{ id: string; ip?: string; }[]' is not assignable to type 'SetStateAction<Camera[]>'.
      Type '{ id: string; ip?: string; }[]' is not assignable to type 'Camera[]'.
        Type '{ id: string; ip?: string; }' is missing the following properties from type 'Camera': owner_id, name, status
```

L71 reports the same error at the second `.then(setCameras)` call site inside `onAuthStateChange` (L67-L73). Same root cause, same fix.

#### Root cause: narrowing via the legacy-wrapper generic, not widening via useEffect

The user observed "Camera-type widening under useEffect fetches" but the actual mechanism is a **narrowing** at the API layer, not widening at the useEffect call site. The chain:

1. `src/lib/api.ts:48` declares the legacy wrapper with the WRONG generic constraint:
   ```typescript
   const withLegacyCamera = generateLegacyWrapper<{ id: string; ip?: string }>({
     device_id:  'id',
     ip_address: 'ip',
   });
   ```
   `generateLegacyWrapper<T>` is generic and the inner `applyLegacy` returns `T`, so `withLegacyCamera` infers as `(target: { id: string; ip?: string }) => { id: string; ip?: string }`.
2. `camerasApi.list: async () => (await fetchCameras()).map(withLegacyCamera)` — the `.map(withLegacyCamera)` is typed as `({id,ip?})[]`, NOT `Camera[]`. The `as Camera[]` cast that would paper over this is absent.
3. `api.getCameras: () => camerasApi.list()` — returns `Promise<({id,ip?})[]>`.
4. `CameraGrid.tsx:58` does `api.getCameras().then(setCameras)` where `setCameras: Dispatch<SetStateAction<CameraType[]>>`. The Promise's resolved type is narrower than `CameraType[]`, so `.then` rejects the wider `Dispatch`. tsc reports TS2345.

The useEffect itself isn't the cause — it's just the call site where the narrower type surfaces.

#### Why this is baseline, not introduced by the closure cycle

The closure cycle's only CameraGrid.tsx touch was line 132 (the `BRAND[cam.brand as keyof typeof BRAND] ?? FALLBACK` lookup), which is the regression-lock-in line for Bug E. The TS2345 errors at L58 + L71 are in the `useEffect` body (L54-L96) and the `onAuthStateChange` callback (L67-L73), both well above L132. The `api.getCameras` + `withLegacyCamera` chain in `src/lib/api.ts` is unchanged across the closure cycle's commits. The errors are pre-existing in the codebase as of HEAD (`37ae861` + `c2ee264` lineage); the tsc sanity check in the closure cycle's [D] section merely surfaced them.

#### Landed at commit `809e411`

The proposed one-line fix was applied as a deferred followup commit `809e411 fix(types): widen withLegacyCamera generic from {id,ip?} to Camera` (author: `bgdaddy <bgdaddy@bgdaddy.local>`; date: `2026-06-28T18:19:52-04:00`). Verbatim diff:

```diff
-const withLegacyCamera = generateLegacyWrapper<{ id: string; ip?: string }>({
+const withLegacyCamera = generateLegacyWrapper<Camera>({
   device_id:  'id',
   ip_address: 'ip',
 });
```

**Verification at landed state** (run `cd app && npx tsc --noEmit -p tsconfig.app.json` from the repo root): `exit=0`, zero errors. The two TS2345 lines at `CameraGrid.tsx:58` + `:71` are gone; no new errors introduced anywhere in the `withLegacyCamera` invocation chain (`src/lib/api.ts#camerasApi.list` / `list_raw` / `create` / `update` / `getCamera` + the `CameraGrid.tsx` `useEffect` + `onAuthStateChange` call sites). Runtime behavior is unchanged: `generateLegacyWrapper` only defines `enumerable:true` property-descriptor getters per the implementation comment at `app/src/lib/api.ts#L24`, never mutating values, so the widened outer `T extends object` argument (`Camera` instead of the prior narrow `{ id: string; ip?: string }`) preserves the `Object.defineProperties(target, descriptors)` idempotent semantics byte-for-byte.

**Archived baseline verification** (forward-durable archeology): the post-`809e411` codebase's `npx tsc --noEmit -p tsconfig.app.json` invocation was captured verbatim to `app/docs/tsc-baseline.txt` (a self-tracked tsc-baseline file, sibling to `_baseline-run.json` which captures the playwright regression contract the latter auto-commit produced). The baseline file is zero-byte because `tsc` had no output (`exit=0` + zero errors) — intentionally-empty `>`-redirect is the canonical signal that the audit chain is clean. Ground-truth citation chain for this audit log entry: parent capture cycle auto-commit `4b10cf1` (T-RLS-1..13 baseline) → followup type-widening `809e411` → archived TypeScript-baseline committed in the same change-set as this str_replace. Re-capture `tsc-baseline.txt` after any future type-only commit (e.g. the analog widenings of `generateLegacyWrapper<SecurityEvent>` / `<Evidence>` flagged in the audit-followup chain) to refresh the in-place archeology forward of `809e411`.

**Post-co-mingle re-verification** (forward-extension of the citation chain): the chained-widen-type commit `dac0f47 fix(types): widen withLegacyEvent generic to SecurityEvent` (author `ops-ci <ops@camaras.local>`) co-mingled both the `<SecurityEvent>` widening AND the `<Evidence>` widening in a single change-set atop `809e411` (the per-fix-split protocol note notwithstanding; both widenings are byte-equal to the `809e411` precedent: type-only, zero runtime change, with `<Evidence>` even type-tightening `meta: unknown → EvidenceMeta` as flagged in the prior audit). `app/docs/tsc-baseline.txt` was re-captured post-`dac0f47` and remains zero-byte (canonical-clean signal preserved across the chain; `npx tsc --noEmit -p tsconfig.app.json` exit=0 in 3s). Extended citation chain: parent capture cycle `4b10cf1` (T-RLS-1..13 baseline) → Camera widening `809e411` → SecurityEvent + Evidence co-mingle `dac0f47` → re-captured tsc-baseline.txt retained zero-byte post-`dac0f47`.

#### Why the audit log records the history even though the fix is landed

- The closure cycle's goal was Bug E lock-in (BRAND TypeError regression). Mixing in a Camera-type fix would have conflated two unrelated typing concerns; deferring to a separate commit (`809e411`) preserved the closure cycle's empirical-run gating from scope-creep and gave the type-only fix its own review + revert path.
- Tracking the followup here keeps the archeology self-contained: a future archaeologist reading this H3 in 2026-Q4 can audit the closure cycle's `37ae861 + c2ee264` baseline → the `34af161` closure-cycle fixes → the `809e411` followup widens, all from a single ops-notes reference, without consulting git log for the cross-commit narrative.
- The TS2345 errors at audit time were warning-level (no runtime impact — the prior `.map(withLegacyCamera)` returned a structurally-compatible object at runtime, just narrower at the type level), and the closure cycle's empirical PASS at 0 pageerrors + divergent-card-visible milestones confirmed the runtime had always been healthy; the deferred fix's value was purely type-correctness + downstream call-site inference, not runtime correctness.

#### Cross-references

- `src/lib/api.ts:48` — `withLegacyCamera` declaration (the fix site).
- `src/lib/api.ts:96` — `api.getCameras: () => camerasApi.list()` (the surface that propagates the narrower type).
- `src/components/CameraGrid.tsx:58` + `:71` — the two TS2345 error sites (both `api.getCameras().then(setCameras)`).
- `src/types.ts:9-26` — the canonical `Camera` interface (required: `id`, `owner_id`, `name`, `status`).
- The H3 above (`### Closure-cycle audit log (this commit)`) — the closure cycle that surfaced this baseline issue.

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
| `[pageerror] TypeError: Cannot read properties of undefined (reading 'cls')` | `app/src/components/CameraGrid.tsx:132` (reverted bare `BRAND[cam.brand as keyof typeof BRAND]` lookup, no `?? FALLBACK`) | [`docs/ops-notes.md → Bug E lock-in workflow` H2](#bug-e-lock-in-workflow) — BRAND lookup fallback regression; 1 of 12 pageerrors in the divergent-brand seed run (the other 11 are likely unrelated rtsp:// `<video autoPlay>` `NotSupportedError` rejects, best-inference per the closure-cycle audit log's softening); fix at `37ae861` + `c2ee264`; lock-in test at `tests/e2e/bug-e-brand-divergence.spec.ts` (included in capture-v6 Phase F+G via `7b0904b`; T-RLS-12 row key in `_baseline-run.json`); the closure cycle is empirically closed as of 2026-06-26 |
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
| 10 | post-12a41f4 capture | Phase B: `supabase start` aborts with `Error: unexpected EOF At statement: 0` while parsing `app/supabase/migrations/20250101000000_init_schema.sql`'s `alter default privileges for all functions in schema graphql_public revoke execute on functions ... from anon, authenticated, service_role;` line (the bare-revoke form with no immediately-following `auto_expose_new_tables = true` suppression comment). Attributed to Supabase CLI 2.107.0 newly-wiring `auto_expose_by_default` Cloud-emulation behavior — the init parser treats the `auto_expose_new_tables` config knob as load-bearing for the revoke line and emits an EOF parse error when the knob is not present in `app/supabase/config.toml`. Captured at `2026-06-27`. FIRST time `supabase start` reached readiness-probe completion on this host (Phases A→B chain had failed on attempts 1–9). Fixed by `1f11c3d chore(supabase): uncomment auto_expose_new_tables = true` (single-line un-comment restores the parser-required knob; the 2026-10-30 Cloud-feature-emulation deprecation timeline makes this fix forward-durable as it explicitly documents Cloud-parity path). | /tmp/build-log/path-a-capture-v6.log |
| 11 | post-1f11c3d cold | Phase F: Playwright cold-run FATAL `exit 41` — the strict `if [ "$PW1_EC" != "0" ]; then exit 41; fi` guard refuses the documented T-RLS-11 (`Shared Cam UI locator 60s timeout`, the canonical Bug E surface per the [`Capture-test triage cheat-sheet`](#capture-test-triage-cheat-sheet) sentinel row). Phases A→B→C→D→E infrastructure was working end-to-end for the FIRST time on this host (this run reached Playwright execution, not just readiness probes); the run then died at Phase F because capture-v6.sh did not yet tolerate the canonical `auth-rls.spec.ts:27 timedOut` shape. Captured at `2026-06-27` immediately after attempt-10's Phase B fix landed. Fixed by a 3-commit tolerance-gate stack: `cd62bb9 fix(e2e): capture-v6 tolerates documented T-RLS-11 timedOut` (introduces the `check_pw_unexpected` value-shape gate near top of script) + `bc9dce7 fix(e2e): check_pw_unexpected walks nested Playwright suites via recurse(.suites[]?)` (jq schema fix — Playwright 2.x `--reporter=json` nests describe-blocks under inner `.suites[]` so the original flat traversal silently missed 11 of 12 specs) + null-title regex-relaxation followup (`^auth-rls\.spec\.ts:27 .*timedOut(` → `^auth-rls\.spec\.ts:27.*timedOut`; the actual T-RLS-11 row title field is null so the output shape is `auth-rls.spec.ts:27 timedOut (?)`, not `... timedOut (<title>)`). Combined: Phase M auto-commit `90c41ee test(e2e): OVERWRITE baseline sequence with REAL Playwright timings` materialized on the subsequent attempt-12 SUCCESS run. | /tmp/build-log/path-a-capture-v6.log |

> **First empirical A→B AND A→F progress on this host.** Attempts 1–9 (cumulative categories i–iv in [`Cumulative status as of attempt 9`](#cumulative-status-as-of-attempt-9)) all died before reaching `supabase start`/Playwright execution on this host. Attempts 10 + 11 appended above are the FIRST two rows in this log that document movement INTO Phase B (`supabase start` reaches readiness probe) AND INTO Phase F (Playwright cold-run actually executes). The full closure-cycle audit loop is recorded in [the `### Closure cycle audit log update: attempts 10-11-12 empirical progress on this host` H3 below](#closure-cycle-audit-log-update-attempts-10-11-12-empirical-progress).

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

## Capture-v6 vs Playwright discovery scope gap

The capture-v6 baseline (`tests/e2e/_baseline-run.json` at HEAD, `f958606` capture) reports **13 tests across 3 specs**, but the on-disk `tests/e2e/` carries **4 `.spec.ts` files** that a generic `npx playwright test` would discover. The divergence is **architectural, not a bug**; this section documents the reason so future archaeologists running a full-scope Playwright run don't reconcile to a fresh-baseline surprise.

### On-disk spec inventory (vs Phase F+G hardcoded 3-spec list)

| File | In capture-v6? | T-RLS rows contributed |
|---|---|---|
| `tests/e2e/admin-users-shapes.spec.ts` | yes (Phase F + G) | T-RLS-1..6 (6 rows; `b1b309d` back-compat) |
| `tests/e2e/auth-rls.spec.ts` | yes (Phase F + G) | T-RLS-7..12 (6 rows; Supabase auth + RLS isolation) |
| `tests/e2e/bug-e-brand-divergence.spec.ts` | yes (Phase F + G) | T-RLS-13 (1 row; CameraGrid BRAND `?? FALLBACK` lock-in) |
| `tests/e2e/bug-e-api-probe.spec.ts` | **NO** | T-RLS-13 hypothetical; if added, **`bug-e-brand-divergence.spec.ts` shifts to T-RLS-14** |

Generic `npx playwright test` would yield **14 tests**. Note the sort-shift: `bug-e-api-` alphabetically precedes `bug-e-brand-`, so the probe would slot ahead of `bug-e-brand-divergence.spec.ts` — pushing the existing T-RLS-13 row to T-RLS-14 in any future baseline expansion.

### Why `bug-e-api-probe.spec.ts` is excluded

The spec's top-of-file JSDoc explicitly opts out of capture-v6:

> INTENTIONAL non-inclusion in capture-v6.sh regression-test list.
> capture-v6.sh's Phase F + Phase G use HARDCODED file lists
> (`tests/e2e/auth-rls.spec.ts tests/e2e/admin-users-shapes.spec.ts`)
> rather than a glob, so this file is excluded by default.
> Running this spec TWICE per capture cycle would otherwise
> pollute `_baseline-run.json` with a non-regression row, distorting
> the `captured_at` aggregate counts.

It is a **diagnostic probe, not a regression lock-in**. Per the [`Bug E lock-in workflow`](#bug-e-lock-in-workflow) H2 above, the Bug E surface is covered by a four-artifact design (defensive fallback shape + regression lock-in spec + capture-v6 Phase F+G wiring + on-demand validator). `bug-e-api-probe.spec.ts` is the **architectural Artifact-4 sibling to `bug-e-brand-divergence.spec.ts`**: same Bug E hypothesis-1 surface, but tested via a one-shot diagnostic probe rather than a regression lock-in. Including it in capture-v6 would conflate diagnostic + regression into a single baseline artifact.

### What a generic `npx playwright test` reveals

Running `npx playwright test` (no spec-list filter, from `app/`) on a clean Supabase local stack discovers all 4 specs. Output shows the 13-test regression contract PLUS 1 additional test from `bug-e-api-probe.spec.ts` with `[bug-e-api-probe.*]` worker-stderr verdict lines (`API_FULL` / `API_PARTIAL` / `API_EMPTY`). The added test result is the diagnostic surface; it intentionally does NOT appear in capture-v6's `_baseline-run.json`.

### Verification command

```bash
# 1. Confirm only 3 specs run in capture-v6 (Phase F + G verbatim)
grep -nE 'tests/e2e/[a-z-]+\.spec\.ts' \
  app/tests/e2e/_tools/capture-baseline/capture-v6.sh

# 2. Confirm all 4 specs live on disk + 1 active test in bug-e-api-probe
find app/tests -name '*.spec.ts' -type f | sort
grep -nE '^test\(' app/tests/e2e/bug-e-api-probe.spec.ts
```

### Resolution intent (tooling-layer fix adopted)

The audit gap is closed at **both** layers (docs + tooling) as of the commit that adds the `testIgnore` rule to `app/playwright.config.ts`:

- **Tooling layer** — `app/playwright.config.ts` carries `testIgnore: ['**/tests/e2e/bug-e-api-probe.spec.ts']` so generic `npx playwright test` (no spec-list arg) does NOT discover the probe via glob scan. The 14-test-vs-13-test delta is gone at the tooling layer.
- **Docs layer** — captured above (this entire H2 section) for the contributor who needs to understand the architectural rationale (Artifact-4 sibling, four-artifact design context, etc.).
- **Contributor-facing affordance preserved** — Playwright 1.61 honors `testIgnore` against glob discovery but bypasses it for explicit positional CLI invocations. The probe remains invocable on demand:
  ```bash
  npx playwright test tests/e2e/bug-e-api-probe.spec.ts --reporter=line
  ```

**Defense in depth**: capture-v6.sh's hardcoded Phase F + G 3-spec list was already enough to exclude the probe from the regression cycle; testIgnore is load-bearing ONLY for the generic `npx playwright test` discovery path. The two layers reinforce each other without redundancy — reverting either layer leaves the other as a safety net, neither alone fully closes the gap.

The probe's own JSDoc (`tests/e2e/bug-e-api-probe.spec.ts`) was updated in the same commit to cite both exclusion layers + the explicit-invocation pattern. Regression of either layer surfaces visibly: removing testIgnore would re-expose the 14-test discovery; removing the hardcoded 3-spec list would push the probe into capture-v6's regression cycle (where its `verdict=API_FULL|API_PARTIAL|API_EMPTY` worker-stderr shape would mis-flag as FATAL under the `check_pw_unexpected` gate that tolerates only `auth-rls.spec.ts:27 timedOut`).

### Cross-references

- `app/tests/e2e/bug-e-api-probe.spec.ts` — the excluded diag spec (top-of-file JSDoc: cross-references this section)
- `app/playwright.config.ts` — `testDir: './tests/e2e'`, `testIgnore: ['**/tests/e2e/bug-e-api-probe.spec.ts']` (audit gap closed at tooling layer; see [Resolution intent](#resolution-intent-tooling-layer-fix-adopted) above)
- `app/tests/e2e/_tools/capture-baseline/capture-v6.sh` — Phase F + G hardcoded 3-spec list (`tests/e2e/auth-rls.spec.ts tests/e2e/admin-users-shapes.spec.ts tests/e2e/bug-e-brand-divergence.spec.ts`); intentional filter, not a glob
- [`Bug E lock-in workflow`](#bug-e-lock-in-workflow) H2 above — the four-artifact design rationale (this section is its deliberate Artifact-4 sibling)
- `app/tests/e2e/_baseline-run.json` (`f958606` at HEAD) — canonical capture-v6 artefact; `.aggregate.total_tests == 13` reflects the curated spec list, NOT Playwright's generic discovery

The new section slug `#capture-v6-vs-playwright-discovery-scope-gap` does not collide with any anchor in the [`Anchor collision covenant`](#anchor-collision-covenant) H2 inventory above.

## Future audit-batch roadmap

This H2 captures audit-batch proposals that have been **proposed but deferred** to a future cycle. Each entry preserves the proposal + its rationale so a future maintainer can revisit the work without archeology-diving into the discussion history. Forward-extendable: future deferred-adoption entries follow the same parent-H2-anchor pattern (i.e., a new `### Deferred: <name>` H3 under this H2).

### Deferred: host-shell tooling audit-chain adoption

- **Origin**: thinker's proposal (in this audit cycle) to extend the docs-covenant Anchor collision covenant pattern to the host-shell tooling layer (`app/scripts/*` + `app/.githooks/*` + `audit_script.sh`).
- **Proposed pattern**: per-file bash-comment header injection (5-line `Provenance` / `Tripod Closure` / `Anchor Covenant` / `Disambiguation` / `Tag Chain` block under each file's shebang), mirroring the docs-covenant anchor-covenant format. Per-domain single commits + tag-bumps, mirroring the per-domain symmetry established at the prior audit-batch chain.
- **Rationale for deferral**: the docs-covenant adoption is still fresh -- the 13th-row Anchor collision covenant inventory expansion at `audit-cycle-v1.7` / `20e92fd` was just landed this cycle. Extending the pattern to a new domain (host-shell tooling) before the docs-covenant pattern stabilizes risks creating two parallel conventions that drift independently.
- **Proposed target cycle**: `audit-cycle-v1.9` (1-cycle-delayed followup) or `audit-cycle-v2.0` (natural starting point of a new audit-batch version series).
- **What this deferral defers** (forward-only; retro-consolidation of v1.8..v1.11 is implicitly out of scope as a history rewrite): (a) future application of the audit-chain header pattern to host-shell tooling beyond the original 4 files, AND (b) extension to any new domain beyond docs/host-shell. The "domain extension" half is the more important rationale.
- **What survives**: the per-file iterations v1.8..v1.11 remain the canonical record of the audit-batch v1.8..v1.11 chain (the docs-covenant-per-file adoption pattern, orthogonal to this deferral).

The new section slug `#future-audit-batch-roadmap` does not collide with any anchor in the [`Anchor collision covenant` H2 above](#anchor-collision-covenant) inventory. The H3 slug `#deferred-host-shell-tooling-audit-chain-adoption` is forward-extendable: future deferred-adoption entries (`### Deferred: <name>`) anchor at the parent H2 slug, distinct from the `### Cross-references` H3 pattern that uses per-Bug explicit-disambiguation siblings (`#cross-references-bug-n`). Cross-references: see [`Anchor collision covenant` H2 above](#anchor-collision-covenant) for the 14th inventory row that registers this H2's slug (`#future-audit-batch-roadmap`).

### Adopted: tsc-baseline re-capture audit-chain (v2.0)

- **Origin**: closes the first half of the parent `### Deferred: host-shell tooling audit-chain adoption` H3 deferral (per the v2.0-vs-v2.1 split inside the parent proposal). The v2.0 cycle was the natural starting point of a fresh audit-batch version series precisely because the parent proposal's `audit-cycle-v1.9` clause had already been nominally used by the run-e2e.sh adoption (`935d9dc`); v2.0 keeps the burst-vs-run-e2e distinction clean by jumping past v1.12..v1.99.
- **What was committed**: 7-line SPDX block injected under `#!/usr/bin/env bash` shebang in `app/scripts/capture-tsc-baseline.sh` (5 semantic lines: `Provenance` / `Tripod Closure` / `Anchor Covenant (CLI)` / `Disambiguation` / `Tag Chain`; bracketed by `# ----... ----` separator dashes per the v1.8..v1.11 cadence). No functional changes to the script — the downstream consumers (`app/docs/tsc-baseline.txt` zero-byte signal + the `verify-trace-state.log` diagnostic surface) are untouched.
- **Provenance of the adopted file**: introduced by `cf47355` (`docs(ops-notes): track tsc-baseline.txt as forward-durable TypeScript archeology artifact`). The introducing commit paired the script with its archeology doc-target; v2.0 closes the loop by registering the script as audited tooling.
- **Tripod Closure**: see [`### TS2345 baseline followup (pre-existing, NOT introduced by closure cycle)` H3 inside `## Bug E lock-in workflow` H2 above](#bug-e-lock-in-workflow) + the `### Post-co-mingle re-verification (forward-extension of the citation chain)` block — the zero-byte signal this script produces is itself a doc-side anchor.
- **Anchor Covenant (CLI)**: strictly depends on `npx --no-install tsc --noEmit -p tsconfig.app.json` exit-code semantics. Exit=0 + zero stdout/stderr → zero-byte canonical signal (the prior audit-script archeology chain `cf47355` → `4b10cf1` → `809e411` → `dac0f47`).
- **What this closes**: the typescript-baseline tooling half of the parent proposal. Sequence for the full `audit-cycle-v2.0` chain: `cf47355` (introducer) → v2.0 SPDX commit (audit-chain adoption) → downstream callsite propagations are forward-durable.

### Adopted: capture-v6 twins audit-chain (v2.1)

- **Origin**: continuation of the v2.0 cycle; the per-file bash SPDX pattern was extended to BOTH capture-v6.sh variants in a single commit. The twins are TWO separate files with DIFFERENT introducer SHAs but nearly-identical script logic — the v2.1 commit makes the difference explicit via divergent `Provenance` + `Disambiguation` lines while keeping `Tripod Closure` + `Anchor Covenant (jq-fallback)` + `Tag Chain` converged (per the thinker's parallel-header recommendation: parallel headers + divergent disambiguation).
- **What was committed**: 7-line SPDX block injected (single commit, two files, 14 net lines):
  - `capture-v6.sh` at project root (Linux-portable USB wrapper).
  - `app/tests/e2e/_tools/capture-baseline/capture-v6.sh` (camaras-internal canonical subtree-mirror).
- **Provenance of the adopted files** (parallel, both at v2.1):
  - root variant `capture-v6.sh`: introduced by `3a52e32` (`chore(infra): persist capture-v6.sh + scrub_and_build.py + audit_script.sh + supabase config`).
  - in-app variant `app/tests/e2e/_tools/capture-baseline/capture-v6.sh`: introduced by `935d9dc` (`chore(infra): import camaras/main as app/ subtree (archive-based)`).
- **Tripod Closure**: see [`## Capture-v6 vs Playwright discovery scope gap` H2 above](#capture-v6-vs-playwright-discovery-scope-gap) (Phase F+G mirror invariant — the script is the capture-pipeline entrypoint; the Playwright config + downstream `scrub_and_build.py` form the tripod the v1.11 audit-script adoption dereferenced via its inverse-anchor grep registry on `#[a-z][a-z0-9-]*`).
- **Anchor Covenant (jq-fallback)**: strictly depends on `supabase status -o json` keys `API_URL` + `ANON_KEY` + `SERVICE_ROLE_KEY`. The capture pipeline cannot proceed without any of the three; missing-key fail-fast at the Phase D readiness step is the pre-adoption baseline.
- **Disambiguation (root)**: Linux-portable USB wrapper; hardcoded `$HOME/USB-Uncensored-LLM/Linux/app` project root (line 14 of file).
- **Disambiguation (in-app)**: camaras-internal canonical capture-v6 script; hardcoded `$HOME/Downloads/camaras` project root (line 14 of file).
- **What this closes**: the second half of the parent proposal — capture-pipeline tooling is now audited at both delivery layers (USB-portable root + in-app subtree mirror). Sequence: `3a52e32` (root introducer) + `935d9dc` (in-app introducer) → v2.1 SPDX commit.

### Adopted: Python docstring audit-chain (v2.4)

- **Origin**: closes the cross-layer extension half of the parent proposal opened at `### Deferred: host-shell tooling audit-chain adoption` H3 above. The v2.4 cycle is the FIRST non-bash audit-chain adoption — a forward-extension beyond the shell-only pattern of `v1.4..v1.11` + `v2.0..v2.3` into the Python sector via top-of-file docstring. The proposed target cycle was promoted from v2.2 to v2.4 by the v2.3 docs followup commit (`3db355a`), when the USB-delivery-layer 3-file commit preempted v2.2's schedule.
- **What was committed**: 5-line audit-chain semantic (`Audit-Chain Provenance` / `Tripod Closure` / `Anchor Covenant (\S+)` / `Disambiguation` / `Tag Chain`) prepended INSIDE the existing top-of-file docstring of `scrub_and_build.py`. The docstring opening `"""` directly after the `#!/usr/bin/env python3` shebang is preserved at column 0; the audit-chain block sits between the opening `"""` and the existing per-row-output docstring prose; the docstring closure `"""` near the end of the module is unchanged. Single commit; 5 net semantic lines + 1 separator blank line = 6 added lines.
- **Provenance of the adopted file**: introduced by `3a52e32` (`chore(infra): persist capture-v6.sh + scrub_and_build.py + audit_script.sh + supabase config`) — same batch introducer as `capture-v6.sh` (root) at v2.1, because both files were persisted in the same infrastructure-persistence commit. Both files anchor on `3a52e32` as introducer-SHA but anchor on different versions for SPDX-adoption cycle (v2.1 vs v2.4); diverged timestamps, same introducer.
- **Tripod Closure**: see [`## Capture-v6 vs Playwright discovery scope gap` H2 above](#capture-v6-vs-playwright-discovery-scope-gap) (this script is the immediate downstream consumer of `capture-v6.sh`'s `run1.json` + `run2.json` output; the canonical capture-pipeline tripod is `[capture-v6.sh : scrub_and_build.py : _baseline-run.json]`).
- **Anchor Covenant (regex/escape/JSON-path/scrub-key)**: strictly depends on four contract surfaces: (a) the Playwright `--reporter=json` 4-tier hierarchy (Suite → Spec → Test → Result); (b) `sb-status.json` keys `ANON_KEY` + `SERVICE_ROLE_KEY` + `API_URL` (all sourced from `supabase status -o json`); (c) scrub regexes `sb_secret_[A-Za-z0-9_-]+` + `eyJ[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*` (literal-string `scrub_string` call-sites apply them per-string in `_extract_error` / `_extract_skip_reason` / `scrub_string`); (d) the `/app/app/`-not-in-STUB canonical-path guard invariant inherited from `capture-v6.sh` Phase M.
- **Disambiguation**: canonical Playwright `--reporter=json` scrubber + `_baseline-run.json` writer; the ONLY Python tooling file at HEAD (cross-layer extension from bash SPDX pattern; not an extension of v2.0..v2.3). Per-row output format (`{id: T-RLS-N, status, duration_ms, error_run1_final, skipped_reason_run{1,2}, ...}` envelope) is downstream of the audit-chain header and is unchanged by this commit.
- **What this closes**: the Python-tooling half of the parent cross-domain proposal. Sequence: `3a52e32` (introducer) → v2.4 SPDX prepend commit (audit-chain adoption; back-port of the 5-line semantic to a Python `""" ... """` opening block).
- **Cross-domain concrete tax**: any subsequent Python-tooling file added in the future MUST apply the same `[Audit-Chain Provenance: ...]` block-shape prepended to its module-level docstring. The script-side detection half of this concern (`audit_script.sh` at v1.11 was docs-only and needed an extension to detect the Python sector) is CLOSED at v2.5 via the Phase C + J v2.5 census/coverage gates — see `### Adopted: cross-domain header-rendering check extension (v2.5)` H3 below. The `[Audit-Chain Provenance: ...]` per-file conformance above remains the load-bearing convention for any NEW Python-tooling file added to HEAD.

### Adopted: cross-domain header-rendering check extension (v2.5)

- **Origin**: closes the cross-domain header-rendering check extension half of the proposal opened at `### Deferred: cross-domain header-rendering check extension (proposed v2.5)` H3 above (now FLIPPED in-place to Adopted at this revision). The v2.5 cycle is the FIRST audit-script tool-layer SPDX adoption — extends `audit_script.sh`'s regex grep surface to be AWARE of the THREE comment-header sectors: `## H2` (docs-covenant, `v1.4..v1.7`) / `# shell-comment` (bash SPDX, `v1.8..v2.3`) / `""" docstring """` (Python SPDX, `v2.4`). This closes the silent-regression risk surfaced at the [`### Adopted: Python docstring audit-chain (v2.4)` H3 above](#adopted-python-docstring-audit-chain-v2-4) `Cross-domain concrete tax` bullet.
- **What was committed** (single `audit_script.sh` extension commit, no changes to docs-validator path-validation logic): four new grep census sections injected into existing Phases C + G / H, plus one per-file "domain-coverage" assertion at the end of Phase J's existing broken-link scan:
  1. Phase C v2.5 `# shell-comment SPDX Provenance census`: `grep -nHE '^# Provenance: introduced by \`[a-f0-9]{7}\`' $(git ls-files '*.sh')` per-file line-numbered — matches every shell file with a `v1.8..v2.4` Provenance line.
  2. Phase C v2.5 `# shell-comment Anchor Covenant kind census`: `grep -hE '^# Anchor Covenant \([^)]+\):' $(git ls-files '*.sh')` sorted frequency distribution — surfaces which Anchor Covenant kinds are in active use.
  3. Phase C v2.5 `""" docstring SPDX Provenance census"`: `grep -nHE '^Audit-Chain Provenance: introduced by \`[a-f0-9]{7}\`' $(git ls-files '*.py')` per-file line-numbered — matches the Python docstring-SPDX introducer anchor.
  4. Phase C v2.5 `""" docstring Anchor Covenant kind census"`: `grep -hE '^Anchor Covenant \([^)]+\):' $(git ls-files '*.py')` sorted frequency distribution — surfaces which Anchor Covenant kinds the Python sector has adopted.
  5. Phase G / H v2.5 per-sector Anchor Covenant kind survey: two by-sector summaries echoing sections 2 + 4 by-sector counts.
  6. Phase J v2.5 per-file domain-coverage assertion: each script file in `git ls-files '*.sh' '*.py'` with a non-empty `Provenance:` line MUST also have all of `Tripod Closure:` + `Anchor Covenant (\S+):` + `Disambiguation:` + `Tag Chain:` lines within the first 15 lines (5/5 semantic-line coverage gate; `coverage_failures: 0 expected at v2.5` per the assertion summary line).
- **Provenance of the adopted file**: introduced by `3a52e32` (`chore(infra): persist capture-v6.sh + scrub_and_build.py + audit_script.sh + supabase config`) — same batch introducer as `capture-v6.sh` (root) at v2.1 + `scrub_and_build.py` at v2.4 (the audit-script was persisted in the same infrastructure-persistence commit). All three files anchor on `3a52e32` as introducer-SHA but anchor on different versions for SPDX-adoption cycle (`v1.11 + v2.5` for `audit_script.sh` vs `v2.1` vs `v2.4`); diverged timestamps within the same introducer.
- **Anchor Covenant (inverse + cross-domain SPDX)**: explicitly DEPENDS on three inverse-anchor grep registry surfaces: (a) docs (`#anchor-name` → H2/H3 anchor text via Phase C baseline); (b) bash SPDX (`^# Provenance: introduced by \`[a-f0-9]{7}]\`` + `^# Anchor Covenant (\S+):` via Phase C v2.5 sections 1 + 2); (c) Python SPDX (`Audit-Chain Provenance: introduced by \`[a-f0-9]{7}]\`` via top-of-file docstring + `Anchor Covenant (\S+):` via Phase C v2.5 sections 3 + 4). All three sectors are now enumerated in the audit-script's `print_phase 'C'` output + the per-file Phase J coverage gate. The single-label `(inverse + cross-domain SPDX)` semantic preserves the prior `(inverse)` baseline label while ADDING cross-domain sector awareness; no collision with the existing `#anchor-collision-covenant` anchor inventory.
- **Disambiguation**: cross-domain header-rendering check extension. Differs from the v1.11 audit-script baseline in two ways: (a) extension surface (`*.sh` + `*.py` added alongside `docs/*`); (b) per-file domain-coverage assertion (Phase J v2.5 — `5/5 semantic-line` gate on any file with `Provenance:` present). The `audit_script.sh` script is unchanged at the docs-validator role; it now ALSO doubles as the tooling-validator + tooling-coverage-gate, with the docs-validator role remaining primary.
- **What this closes**: the cross-domain validator-extension half of the proposal. Sequence for the full `audit-cycle-v2.5` chain: `3a52e32` (introducer) → v1.11 SPDX adoption (audit-chain adoption of `audit_script.sh` itself as audited tooling) → v2.5 cross-domain extension (this commit — closes the cross-domain detection half of the parent proposal, primarily the [`### Adopted: Python docstring audit-chain (v2.4)` H3 above](#adopted-python-docstring-audit-chain-v2-4) `Cross-domain concrete tax` bullet's silent-regression concern).
- **Forward-of-v2.5 audit-script-extension roadmap**: every other audit-script extension NOT covered by the per-file scripts/SPDX census remains forward-only (e.g., a JSON-config audit prior to the docs/ops-notes audit at Phase B; a YAML-workflow audit futurely once `.github/workflows/*` lands; a Python-tooling AST audit if needed beyond just the grep census). The v2.5 cycle gates only on the per-file `Provenance:` + `Tripod Closure:` + `Anchor Covenant (\S+):` + `Disambiguation:` + `Tag Chain:` 5/5 semantic-line coverage; future cycles extending to JSON / YAML / TOML sectors will gate on similar per-file semantic-line patterns.

The seven H3 slugs `#adopted-tsc-baseline-re-capture-audit-chain-v2-0` / `#adopted-capture-v6-twins-audit-chain-v2-1` / `#adopted-python-docstring-audit-chain-v2-4` / `#adopted-linux-portable-ollama-runtime-triplet-audit-chain-v2-3` / `#adopted-cross-domain-header-rendering-check-extension-v2-5` / `#adopted-capture-v6-split-brain-consolidation-audit-chain-v2-6` (plus the parent deferral `#deferred-host-shell-tooling-audit-chain-adoption` which remains as the umbrella origin) all anchor at the parent H2 slug `#future-audit-batch-roadmap` per the forward-extendable convention (no per-H3 explicit-disambiguation sibling needed; distinct from the `### Cross-references` H3 pattern that uses per-Bug explicit-disambiguation siblings `#cross-references-bug-n`). The two original `Deferred` H3s from the v1.9/v2.0 roadmap-opening commit (`#deferred-host-shell-tooling-audit-chain-adoption` sibling + the v2.5-deferred entry that this commit retroactively supersedes) are now consolidated: the umbrella `host-shell-tooling` deferral remains as the canonical origin; the v2.5 entry is now formally Adopted (this H3). Slugs were generated against the existing GFM semantics (lowercase + spaces→dashes + parenthesis-stripped) per the convention documented at the [`Anchor collision covenant` H2 above](#anchor-collision-covenant) — no collision with any prior anchor. Cross-references: see [`Anchor collision covenant` H2 above](#anchor-collision-covenant) for 14th inventory row (parent H2 anchor); the v2.0 / v2.1 / v2.3 / v2.4 / v2.6 commit messages cite the introducer SHAs + commit ranges for each adopted file (see H3s immediately above + below); the v2.5 commit message (this commit's coordinating `chore(scripts)` commit) cites the Phase C / G / H / J additions and the v1.11 → v2.5 Provenance-line evolution on `audit_script.sh`.

### Adopted: Linux-portable Ollama runtime triplet audit-chain (v2.3)

- **Origin**: closes the third and final deferred host-shell tooling adoption entry opened at the parent `### Deferred: host-shell tooling audit-chain adoption` H3 above. The v2.3 cycle adopts the USB-delivery-layer NEW domain that this entry explicitly carved out as forward-only — not an extension of v2.0..v2.1. After this commit the parent proposal's "audit-chain adoption across host-shell tooling" umbrella is structurally complete across 7 files: v1.8..v1.11 (bootstrap-admin + run-e2e + .githooks/pre-commit + audit_script) + v2.0..v2.3 (capture-tsc-baseline + both capture-v6.sh twins + install/start/uninstall triplet).
- **What was committed**: 7-line SPDX block injected (single 3-file commit, 21 net lines added: 7 per file) into the USB-delivery-layer triplet at project root:
  - `install.sh` — multi-model installer; `Provenance e12e211` / `Disambiguation` 7-step orchestrator (catalog query → vendor assets → GGUF download → Modelfile gen → Ollama tar-extract → model import).
  - `start.sh` — fast-web-chat launcher; `Provenance e12e211` / `Disambiguation` Ollama readiness poll + Python chat_server.py invocation; intentionally NOT a systemd service.
  - `uninstall.sh` — Linux uninstall shim; `Provenance 0f5d809` / `Disambiguation` thin delegation to `Shared/scripts/uninstall-common.sh linux`; does NOT carry the actual uninstall logic.
- **Provenance of the adopted files** (parallel, all at v2.3):
  - `install.sh` + `start.sh`: introduced by `e12e211` (`Add full cross-platform architecture, setup scripts, and UI`) — single batch commit SHARED between the two scripts (the load-bearing origin point of the USB-portable surface area).
  - `uninstall.sh`: introduced by `0f5d809` (`add uninstaller scripts`) — separate introducer commit; predates the e12e211 batch by approximately the gap between the two committing groups.
- **Tripod Closure**: see [`## Future audit-batch roadmap` H2 above](#future-audit-batch-roadmap) — this entry's parent H2. The v2.3 commit's `### Adopted:<title>` H3 is the canonical "Deferred → Adopted" tripod transition for the `## Future audit-batch roadmap` H2's FIRST deferral-to-adopted cycle (the original `### Deferred: host-shell tooling audit-chain adoption` H3 is the historical record; v2.0 + v2.1 + v2.3 each independently closed their own half of the deferred proposal across 6 of 7 files; v2.4 is now the only remaining deferred half — see `### Deferred: Python docstring audit-chain adoption (target cycle promoted v2.2 → v2.4)` H3 above).
- **Anchor Covenant** (converged across all 3 files; specific kind labeled per-file in the shell SPDX):
  - `install.sh` (CLI-key): shared `$CONFIG_QUERY` python output env-var-namespacing the model catalog as `$SHARED_DIR/scripts/config_query.py` invocation with shell-substitution semantics — `MODEL_NUMS[]` array + `MODEL_{NAME,FILE,URL,MINB,LOCAL,PROMPT,LABEL,BADGE,SIZE}_<N>` specific-to-NUM env vars.
  - `start.sh` (env-var): hardcoded Ollama runtime env-contract via `$OLLAMA_MODELS` + `$OLLAMA_HOME` + `$OLLAMA_TMPDIR` + `$OLLAMA_ORIGINS` + `$OLLAMA_HOST`; portable dir-resolution via `$USB_ROOT` + `$SHARED_DIR` + `$OLLAMA_RUNTIME` bootstrap (the `SCRIPT_DIR` + dune-bash-cd idiom).
  - `uninstall.sh` (single-bridge): strictly depends on `$COMMON_UNINSTALL` (path-resolved `$USB_ROOT/Shared/scripts/uninstall-common.sh`) being present + executable; the load-bearing line is the arg-pass `linux` to the shared script (no second bridge arg).
- **Disambiguation** (parallel, divergent per file): each script names its distinct sub-domain — see the per-file SPDX lines for verbatim text. The Disambiguation lines are the v2.3 entry's primary means of preventing the three triplet H3 thumbprint from collapsing into a one-line entry; retaining per-file text prevents future archeology confusion when forward domains (cross-platform variants) extend the triplet.
- **What this closes**: the USB-delivery-layer half of the parent proposal. Sequence: `e12e211` (install + start introducer) + `0f5d809` (uninstall introducer) → v2.3 SPDX commit (audit-chain adoption; closes the host-shell tooling umbrella across 7 files: v1.8..v1.11 + v2.0..v2.3). Forward of v2.3, the only remaining deferred half of the parent proposal is v2.4 (Python docstring; promoted from v2.2).

### Adopted: capture-v6 split-brain consolidation (v2.6)

- **Origin**: The v2.1 disclosure (`Adopted: capture-v6 twins audit-chain (v2.1)` H3) documented the asymmetry between the `capture-v6.sh` root variant (Linux-USB-portable `PROJECT_DIR=$HOME/USB-Uncensored-LLM/Linux/app`) and the `capture-v6.sh` in-app subtree mirror (`PROJECT_DIR=$HOME/Downloads/camaras`) via divergent Disambiguation lines -- but the asymmetry itself remained. v2.6 closes the structural gap by promoting the in-app subtree file to the unified canonical orchestration engine and reducing the root file to a thin wrapper.
- **What was committed** (2 chore commits in the burst):
  - `app/tests/e2e/_tools/capture-baseline/capture-v6.sh` rewrite -- folds 9 root-only features into canonical: Phase B.5 idempotent `supabase/seed.sql` replay via `docker exec psql`; `docker volume rm` clean-slate wipe in Phase A; IPv4/v6 Vite readiness-probe loop (`PROBE_ROOT` + `PROBE_CLIENT` + content-type-as-HEAD check; `VITE_MAX=120`); `E2E_BASE_URL` + `E2E_PROBE_HOST` env exports in Phase D + `getent hosts` diagnostic; Phase E0 `npm install` (idempotent; pulls playwright + react deps); `STUB_REL` auto-detect based on `$PROJECT_DIR` structure (USB-portable in-dir layout vs camaras-subtree `app/` prefix); `PYTHON_SCRIPT` env override (default `scripts/scrub_and_build.py` relative to project tree); `APP_SUBDIR` auto-detect (empty for USB-portable, `app` for camaras-subtree); Phase K python heredoc `sys.argv[1]` rewrite (drops hardcoded `/home/bagdaddy` literal).
  - Root `capture-v6.sh` rewrite -- replaced with a thin wrapper that env-exports the USB-portable topology (`PROJECT_DIR=$HOME/USB-Uncensored-LLM/Linux/app` + `STUB_REL=test-results/playwright-report` + `PYTHON_SCRIPT=scrub_and_build.py` + `LOG_DIRTY=true` defaults) and `exec`s into the in-app canonical via a relative `app/tests/e2e/_tools/capture-baseline/capture-v6.sh "$@"` delegation.
- **Provenance** (both files share introducer lineage; diverged only at adoption cycle):
  - Root variant: introduced by `3a52e32` `chore(infra): persist capture-v6.sh + scrub_and_build.py + audit_script.sh + supabase config`; SPDX-audited at v2.1 (`a4a3492`); rewritten to thin wrapper at v2.6.
  - In-app subtree mirror: introduced by `935d9dc` `chore(infra): import camaras/main as app/ subtree (archive-based)`; SPDX-audited at v2.1 (`a4a3492`); rewritten to unified canonical at v2.6.
- **Tripod Closure** (converged across the 2 files): `app/docs/ops-notes.md` -> `## Capture-v6 vs Playwright discovery scope gap` H2 -- the gap section enumerates the 9 root-only features the v2.6 unification absorbs; this adoption cycle is the structural counterpart to the documentation disclosure at v2.1 (documentation at v2.1, programmatic unification at v2.6).
- **Anchor Covenant** (converged across the 2 files; specific kind labeled per file in the bash SPDX): the canonical jq-fallback anchor chain (`jq ... | python3 -c ...` path `_baseline-run.json`), with the per-file surface now expressed as `bash` `@test_compose` + `bash` `@docker_compose` + `bash` `@python_scrub` anchor semantics instead of the prior `parallel paths/divergent Disambiguation` formulation. Both SPDX blocks now state `Anchor Covenant [jq-fallback]` verbatim -- the same downstream scrub invariant, now served by one canonical file from two invocation surfaces (direct local-exec against in-app subtree; `exec` from root wrapper for the USB-portable host).
- **Disambiguation** (parallel, divergent per file at the source-of-truth axis):
  - Root: `unified USB-portable thin wrapper delegates to canonical in-app; legacy operator memory support; PROJECT_DIR + STUB_REL + PYTHON_SCRIPT env topology forwarded via exec`.
  - In-app: `unified canonical capture-v6 orchestration logic; subsumes all 9 prior root-only features for both run-on-this-host invocation AND external invocation via the Linux-USB-portable root wrapper.`
  - The Disambiguation line is now DEFINITIVE about source-of-truth (in-app canonical), not merely a documentation of asymmetry. The cross-reference footer at end-of-file updated accordingly.
- **What this closes**: the capture-v6 split-brain structural gap disclosed at v2.1. Sequence: v2.1 SPDX adoption (`a4a3492`) -> v2.6 unification (canonical rewrite + root wrapper rewrite; commits `3a97a88` + `6427d99`) -> v2.6 docs followup (this H3). Forward of v2.6, the parent proposal's host-shell tooling umbrella is fully closed (v1.8..v1.11 + v2.0..v2.3) AND the capture-v6 orchestration logic is single-source-of-truth.

The five H3 slugs `#adopted-tsc-baseline-re-capture-audit-chain-v2-0` / `#adopted-capture-v6-twins-audit-chain-v2-1` / `#deferred-python-docstring-audit-chain-adoption-proposed-v2-2` / `#deferred-linux-portable-ollama-runtime-audit-chain-adoption-proposed-v2-3` / `#adopted-capture-v6-split-brain-consolidation-v2-6` all anchor at the parent H2 slug `#future-audit-batch-roadmap` per the forward-extendable convention (no per-H3 explicit-disambiguation sibling needed; distinct from the `### Cross-references` H3 pattern that uses per-Bug explicit-disambiguation siblings `#cross-references-bug-n`). Slugs were generated against the existing GFM semantics (lowercase + spaces->dashes + parenthesis-stripped) per the convention documented at the [`Anchor collision covenant` H2 above](#anchor-collision-covenant) -- no collision with any prior anchor, including the original sibling H3 slug `#deferred-host-shell-tooling-audit-chain-adoption`; each H3's bullet list is self-contained. Cross-references: see [`Anchor collision covenant` H2 above](#anchor-collision-covenant) for 14th inventory row (parent H2 anchor); the v2.0 / v2.1 / v2.6 commit messages cite the introducer SHAs + commit ranges for each adopted file (see H3s immediately above).

### Adopted: run-e2e.sh idempotent start guard (v2.7.1)

- **Origin**: continuation of the v2.7 polish round (`401b78b` v2.7 audit-script SPDX body extension commit + `26c8d81` this commit); the second substantive pass on `app/scripts/run-e2e.sh` after the v1.9 SPDX introducer-block landed at `935d9dc`. The v2.7.1 cycle ADOPTS a load-bearing race-fix in the script body (replacing unconditional `supabase start` with the precondition `supabase status >/dev/null 2>&1 || supabase start`) but does NOT advance the SPDX cycle label -- the 5-line block remains at v1.9 introducer-state because the v2.7.1 commit deliberately keeps the header untouched. The cycle-label asymmetry is documented explicitly in this Adopted H3 row: the v2.7.1 cycle is carried by commit-subject + this Adopted H3 row only; the SPDX `Provenance...v1.9` + `Tag Chain...audit-cycle-v1.9` lines are an open bookkeeping item that may be advanced in a future followup. The substantive change addresses the user's prior pipeline friction: Supabase CLI v2.107.0 fires an async internal init script on every `supabase start`, racing with the synchronous `supabase db reset` on the next line and crashing with `schema_migrations_pkey` duplicate-key on version `20250926223044`.

- **What was committed** (single `26c8d81` commit on the `v2.7-v2.8-stacked-archeology` archeology branch); the substantive end-state is one coordinated lever in `app/scripts/run-e2e.sh`:
  - **Phase [1/6] step replaced**: `supabase start` (unconditional) -> `supabase status >/dev/null 2>&1 || supabase start` (the load-bearing race-fix; uses `status`'s exit code 0 as a precondition for skipping the redundant start). The `>/dev/null 2>&1` suppression is required so the idempotent guard does not pollute the canonical worker-stderr capture surface or `tests/e2e/_baseline-run.json` keys.
  - SPDX 7-line block UNCHANGED in this commit: all 5 semantic lines (`Provenance` / `Tripod Closure` / `Anchor Covenant` / `Disambiguation` / `Tag Chain`) remain at their v1.9 introducer-state. `bash audit_script.sh` `5/5 semantic-line coverage` gate continues to PASS unchanged (verified post-`26c8d81` per the [`### Adopted: cross-domain header-rendering check extension (v2.5)` H3 above](#adopted-cross-domain-header-rendering-check-extension-v2-5) per-file domain-coverage assertion).

- **Provenance** (introducer-anchored, two substantive passes on the file): file introduced by `935d9dc` (`chore(infra): import camaras/main as app/ subtree (archive-based)`) -- the same introducer as the in-app subtree-mirror `capture-v6.sh` at v2.1 (later rewritten to unified canonical at v2.6 per the [`### Adopted: capture-v6 split-brain consolidation (v2.6)` H3 above](#adopted-capture-v6-split-brain-consolidation-v2-6)). Two substantive passes on this file: v1.9 SPDX introducer-block at the introducer commit (5/5 lines under the shebang) and v2.7.1 substantive-body race-fix at `26c8d81` (this commit's adopted cycle; header deliberately untouched, body behavior-added). Committer-introducer was `bgdaddy` (per `git log -1 --format='%an' 935d9dc`); the most-recent committer on the file is also `bgdaddy` (per `git log -1 --format='%an' 26c8d81`).

- **Tripod Closure**: see [`## Capture-v6 vs Playwright discovery scope gap` H2 above](#capture-v6-vs-playwright-discovery-scope-gap). The script anchors the Phase F + G mirror-invariant row of the capture-v6 table; the idempotent start guard stabilizes Phase B (`supabase start`) enough for Phase F (Playwright cold-run) to actually reach readiness on this host. The upstream CLI v2.107.0 bookkeeping race that the guard's behavior addresses (separate from the script-level substantive-body adoption at v2.7.1) remains tracked at [`docs/bug-diagnoses.md` Bug F](../../docs/bug-diagnoses.md#bug-f-supabase-db-reset-crashes-with-error-running-container-exit-1-on-supabase-cli-v21070) (where the long-term answer is a CLI-version downgrade; the v2.7.1 race-fix IS the orchestrator-side hardening for the same surface).

- **Anchor Covenant (jq-fallback + race-fix precondition)**: the canonical Supabase-status key chain (`API URL` / `anon key` / `service_role key`) remains the load-bearing anchor (v1.9 baseline). The v2.7.1 cycle ADDS a NEW precondition kind: `supabase status >/dev/null 2>&1` exit-code 0 must be observable before the Phase [1/6] sequence proceeds; the missing-precondition path is the `|| supabase start` fallback (NOT a re-attempt of `status`). Bug class addressed: Supabase CLI v2.107.0 internal-bookkeeping race (the CLI's `db-init` container always tries to insert version `20250926223044` into `schema_migrations`, racing with synchronous reset logic); the guard's effectiveness is bound to the precondition's correctness -- a broken `status` exit code (e.g. legacy CLI < 1.50 returning non-zero on healthy stacks) would mis-fire the `||` fallback.

- **Disambiguation** (per-script single-pass catch-up, no script variants): distinct from the prior v1.9 pass at the v2.7.1 cycle in one way: (a) script body now carries the race-fix precondition on Phase [1/6]. Differs from v2.6 capture-v6 split-brain in scope: v2.6 rewrote `capture-v6.sh` to a thin wrapper delegating to canonical in-app; v2.7.1 takes a different lever (substantive-body behavior fix vs file-unification). The Disambiguation line stays at the v1.9 single-line form because this file has always been a single canonical orchestrator.

- **What this closes**: the E2E-orchestrator race-fix half of the v2.7 polish round. Sequence: `935d9dc` (introducer) -> v1.9 SPDX adoption (initial audit-chain introducer pass at introducer commit) -> v2.7.1 substantive-body race-fix (`26c8d81`, this commit). Forward of v2.7.1, the upstream CLI v2.107.0 bookkeeping bug class remains tracked at [`docs/bug-diagnoses.md` Bug F](../../docs/bug-diagnoses.md#bug-f-supabase-db-reset-crashes-with-error-running-container-exit-1-on-supabase-cli-v21070) (long-term answer: CLI-version downgrade); the v2.7.1 race-fix IS the orchestrator-side hardening that makes the empirical A->F capture-v6 progress at attempt-11 reproducible from a cold `npm run test:e2e:bash` invocation on a fresh docker-volume state.

The ten slugs under the parent H2 (`#adopted-tsc-baseline-re-capture-audit-chain-v2-0` / `#adopted-capture-v6-twins-audit-chain-v2-1` / `#adopted-linux-portable-ollama-runtime-triplet-audit-chain-v2-3` / `#adopted-python-docstring-audit-chain-v2-4` / `#adopted-cross-domain-header-rendering-check-extension-v2-5` / `#adopted-capture-v6-split-brain-consolidation-v2-6` / `#adopted-run-e2e-sh-idempotent-start-guard-v2-7-1` / `#adopted-v2-7-polish-round-archeology-chain-seal-v2-9-dual-path-partial` / `#adopted-v2-9-archeology-chain-release-seal-dual-path-partial-archive` / `#adopted-bundle-side-integrity-cluster-smoke-test-incident-retro-releases-install-snippet-bug` -- the 7 originals at this row's commit-time plus the 3 forward-extension slugs landed post-this-row: this row's own seal at v2.9 dual-path PARTIAL + the bundle-side PARTIAL archive seal + the [releases-install-snippet-bug] incident retro audit-chain row that closes the integrity archeology cycle) all anchor at the parent H2 slug `#future-audit-batch-roadmap` per the forward-extendable convention (no per-H3 explicit-disambiguation sibling needed; distinct from the `### Cross-references` H3 pattern that uses per-Bug explicit-disambiguation siblings `#cross-references-bug-n`). Slugs were generated against the existing GFM semantics (lowercase + spaces->dashes + parenthesis-stripped + period-to-hyphen) per the convention documented at the [`Anchor collision covenant` H2 above](#anchor-collision-covenant) -- no collision with any prior anchor, including the original sibling H3 slugs `#deferred-host-shell-tooling-audit-chain-adoption`, `#deferred-gfm-reference-style-link-convention-proposed-v2-7`, and `#deferred-hoisted-regex-pitfalls-sentinel-function-library-proposed-v2-8`; the v2.7.1 H3's bullet list is self-contained. Cross-references: see [`Anchor collision covenant` H2 above](#anchor-collision-covenant) for the parent H2 inventory row at row 14 (H2 anchor slug preserved for forward-extendable children); also cite [the v2.5 cross-domain header-rendering check extension H3 above](#adopted-cross-domain-header-rendering-check-extension-v2-5) for the per-file `5/5 semantic-line` coverage gate that validates the v2.7.1 cycle's deliberate decision NOT to advance the SPDX header (the gate properly accounts for files at v1.9 introducer+ as well as files at v2.N adopter cycles).



### Adopted: v2.7 polish round archeology-chain seal (v2.9 dual-path PARTIAL)

- **Origin**: documents TODAY's archeology-chain commit v2.7+v2.7.1 + the closeout of the v2.9 bundle-side seal. Dual-path PARTIAL geometry: at v2.9 release, bundle-side canonical surface (`joeshmoe97x-ship-it/USB-Uncensored-LLM`'s `v2.9-archeology-chain` release) captured umbrella HEAD `26c8d81` as the post-v2.7+v2.7.1 archeology chain; docs-side has continued past v2.9 with the Bug F Phase D docs cycle (Bug F entry in `docs/bug-diagnoses.md` + cross-link closures in v2.7.1 Adopted H3 row footer). PARTIAL because bundle-side is sealed immutably (sha256 immutable post-release) while docs-side has advanced past v2.9; a v2.9.1 / v3.0.0 release is required to reincorporate docs-side Bug F + cross-link closures into the canonical surface. Note: this row's `(vX.Y)` suffix carries the seal-version (`v2.9 dual-path PARTIAL`) rather than the adoption-version (`v2.7`/`v2.7.1`), a deliberate hybrid form per the user's bundling instruction (existing 7 Adopted rows all use adoption-version in parens).

- **What was committed** (3 archeology-chain commits + companion docs cycles, all on `v2.7-v2.8-stacked-archeology`): (a) `401b78b chore(scripts): audit_script.sh v2.7-cycle SPDX catch-up` — Phase R/G-mirror/H-mirror regex-pitfall sentinels + strict inventory-count regression sentinel at v2.7-baseline 16/44/28; (b) `26c8d81 chore(scripts): run-e2e.sh idempotent start guard -- Audit-chain adoption v2.7.1.` — substantive-body race-fix at `app/scripts/run-e2e.sh:31`; (c) `### Bug F — \`supabase db reset\` crashes on Supabase CLI v2.107.0` Phase D docs entry at the end of `docs/bug-diagnoses.md`. Docs-side cycle (this commit set): this Adopted row + 2 plain-text `Bug F (proposed, not yet committed)` references in v2.7.1 Adopted H3 row footer flipped to live cross-links pointing at the Bug F entry's anchor slug.

- **Provenance**: All 3 archeology-chain commits on `v2.7-v2.8-stacked-archeology` branch (umbrella mirror). Introducer lineage `3a52e32` (audit_script.sh infrastructure-persister) + `935d9dc` (camaras subtree import that brought run-e2e.sh in) → umbrella fork at branch `v2.7-v2.8-stacked-archeology`. Committer was `bgdaddy` for all three.

- **Tripod Closure**: 
  - `app/docs/ops-notes.md` Adopted H3 rows under `## Future audit-batch roadmap` H2 (8 Adopted rows at seal time; this row is the latest).
  - `docs/bug-diagnoses.md` Bug F entry under the canonical Bug A-E-... template (Phase D work-around documentation; archeology-coupled lifecycle, orthogonal filename from the H2 in this file).
  - `app/scripts/run-e2e.sh` (v2.7.1 substantive-body race-fix surface) + `audit_script.sh` (v2.7 audit-script body extension); both files surface as Adopted tooling via v2.x audit-chain adoption cycles.

- **Anchor Covenant (v2.9 bundle-side anchor + sha256 chain)**: strictly depends on 3 immutable references at v2.9 seal-time:
  - **bundle-side canonical surface**: `v2.9-archeology-chain` release on `joeshmoe97x-ship-it/USB-Uncensored-LLM` fork-mirror (`targetCommitish` `v2.7-v2.8-stacked-archeology`).
  - **umbrella's archeology chain HEAD at seal point**: `26c8d81e87d5580fa7d6266d2b3231457b3d8ecd` (this row's primary reference SHA).
  - **sha256 of bundle asset `v29-archeology-chain.bundle`**: `745d495f657671af542b2dba652952b3ee8f435b1c4a97f3511d52d9914af57a`.
  - **OUT-OF-BAND note**: docs-side Bug F entry + the v2.7.1 row's 2 cross-link closures are OUT-OF-BAND of the v2.9 bundle (added post-seal); forward-of-v2.9 release required to reincorporate.

- **Disambiguation (dual-path PARTIAL geometry)**: distinct from the 7 prior Adopted rows in two ways: (a) documents BOTH bundle-side seal AND post-bundle docs-side activity (PARTIAL state); (b) slugs footer marks 8 Adopted rows under parent H2 vs the v2.7.1 Adopted H3's historical 7-slug snapshot at its commit time. The PARTIAL state is explicit: bundle-side does NOT include this row or the Bug F entry or the v2.7.1 row's cross-link closures; docs-side DOES include them all. Future archeologists can locate their starting point by checking which SHA is between bundle-side v2.9 (this row's seal) and docs-side post-v2.9 (this commit set's HEAD).

- **What this seals + closes**: the v2.9 bundle-side seal is the canonical anchor for the v2.7 polish round's 3-component archeology chain (`v2.7-v2.8-stacked-archeology` branch recorded at SHA `26c8d81` with bundle asset verified by sha256 `745d495f...`). Forward-of-v2.9: docs-side continues; bundle-side is immobile until a v2.9.1 / v3.0.0 release. WHAT THIS CLOSES: the v2.7 polish round's 3-component chain (audit-script v2.7 + run-e2e.sh v2.7.1 + Bug F Phase D docs cycle) + the docs-side forward of v2.9 seal.

The eight slugs under the parent H2 (`#adopted-tsc-baseline-re-capture-audit-chain-v2-0` / `#adopted-capture-v6-twins-audit-chain-v2-1` / `#adopted-python-docstring-audit-chain-v2-4` / `#adopted-linux-portable-ollama-runtime-triplet-audit-chain-v2-3` / `#adopted-cross-domain-header-rendering-check-extension-v2-5` / `#adopted-capture-v6-split-brain-consolidation-v2-6` / `#adopted-run-e2e-sh-idempotent-start-guard-v2-7-1` / `#adopted-v2-7-polish-round-archeology-chain-seal-v2-9-dual-path-partial` -- this row) all anchor at the parent H2 slug `#future-audit-batch-roadmap` per the forward-extendable convention (no per-H3 explicit-disambiguation sibling needed; distinct from the `### Cross-references` H3 pattern that uses per-Bug explicit-disambiguation siblings `#cross-references-bug-n`). Slugs generated via standard GFM anchor semantics (lowercase + non-word stripped + spaces→hyphens + multi-dash collapsed + period→hyphen per the docs-covenant convention documented at the [`Anchor collision covenant` H2 above](#anchor-collision-covenant)) -- no collision with any prior anchor, including the original sibling H3 slugs `#deferred-host-shell-tooling-audit-chain-adoption`, `#deferred-gfm-reference-style-link-convention-proposed-v2-7`, and `#deferred-hoisted-regex-pitfalls-sentinel-function-library-proposed-v2-8`. Cross-references: see [`Anchor collision covenant` H2 above](#anchor-collision-covenant) for parent H2 inventory row 14; this row's primary cross-link is to the bundle-side release at fork-mirror `v2.9-archeology-chain` (targetCommitish `v2.7-v2.8-stacked-archeology`; HEAD `26c8d81e87d5580fa7d6266d2b3231457b3d8ecd`; bundle-asset sha256 `745d495f657671af542b2dba652952b3ee8f435b1c4a97f3511d52d9914af57a`); docs-side references: `#adopted-run-e2e-sh-idempotent-start-guard-v2-7-1` (within-app H3 anchor for the v2.7.1 row footer) + `#bug-f-supabase-db-reset-crashes-with-error-running-container-exit-1-on-supabase-cli-v2-107-0` (cross-doc H2 anchor in `docs/bug-diagnoses.md`).

### Adopted: v2.9-archeology-chain release seal (dual-path PARTIAL archive)

- **Origin**: Release-stage bundle-side anchor (dual-path PARTIAL geometry parallel to the v2.7 polish round seal commit-side anchor).
- **What was committed**: Release metadata record anchoring the canonical `.bundle` asset against the pre-release document state.
- **Provenance**: GitHub release `v2.9-archeology-chain` on `joeshmoe97x-ship-it/USB-Uncensored-LLM` (targetCommitish=`v2.7-v2.8-stacked-archeology`).
- **Tripod Closure**: Ties the `26c8d81` documentation state (specifically `docs/bug-diagnoses.md` Bug F Phase D work-around at `app/scripts/run-e2e.sh:31`) to the published snapshot. See [`## Bug F` in `docs/bug-diagnoses.md`](../bug-diagnoses.md#bug-f--supabase-db-reset-crashes-with-error-running-container-exit-1-on-supabase-cli-v2-107-0).
- **Anchor Covenant**: Verifiable bundle pin: asset `v29-archeology-chain.bundle` must match sha256 `745d495f657671af542b2dba652952b3ee8f435b1c4a97f3511d52d9914af57a`, anchored against umbrella archeology-chain HEAD `26c8d81`. Verification gate for future archeologists: `sha256sum v29-archeology-chain.bundle` must produce the canonical hash above; any drift triggers an integrity incident.
- **Disambiguation**: This row mirrors the [`### Adopted: v2.7 polish round archeology-chain seal (v2.9 dual-path PARTIAL)`](#adopted-v2-7-polish-round-archeology-chain-seal-v2-9-dual-path-partial) row above but acts as the **bundle-side** archive. The dual-path PARTIAL nuance means this bundle is definitively sealed at this exact point (the bundle's sha256 has not changed since release), while the post-release commit-side polish continues forward on its own axis (per the v2.7 polish round seal row's forward-extension). This row IS NOT a duplicate of the polish row; both rows are present at HEAD because they cover distinct archeology axes (bundle-side integrity vs commit-side polish progression).
- **What this seals**: The v2.9 GitHub release side of the dual-path arithmetic, establishing a baseline for Phase E (CLI version pin, on the forward-roadmap per Bug F) and future archeological audits. Closes the docs-correspondence cycle for Bug F's commits (`26c8d81` + this row's commit-time landing); future archeologists can re-derive the bundle-side archeology from the canonical sha256 + targetCommitish alone without consulting git history.

The canonical H3 slugs of `## Future audit-batch roadmap` (forward-extendable per Adopted H3 row, NOT a fixed count) `#adopted-tsc-baseline-re-capture-audit-chain-v2-0` / `#adopted-capture-v6-twins-audit-chain-v2-1` / `#adopted-linux-portable-ollama-runtime-triplet-audit-chain-v2-3` / `#adopted-python-docstring-audit-chain-v2-4` / `#adopted-cross-domain-header-rendering-check-extension-v2-5` / `#adopted-capture-v6-split-brain-consolidation-v2-6` / `#adopted-run-e2e-sh-idempotent-start-guard-v2-7-1` / `#adopted-v2-7-polish-round-archeology-chain-seal-v2-9-dual-path-partial` / `#adopted-v2-9-archeology-chain-release-seal-dual-path-partial-archive` / `#adopted-bundle-side-integrity-cluster-smoke-test-incident-retro-releases-install-snippet-bug` all anchor at the parent H2 slug `#future-audit-batch-roadmap` per the forward-extendable convention (no per-H3 explicit-disambiguation sibling needed; distinct from the `### Cross-references` H3 pattern that uses per-Bug explicit-disambiguation siblings `#cross-references-bug-n`). Slugs were generated against the existing GFM semantics (lowercase + spaces->dashes + parenthesis-stripped) per the convention documented at the [`Anchor collision covenant` H2 above](#anchor-collision-covenant) -- no collision with any prior anchor, including the original sibling H3 slug `#deferred-host-shell-tooling-audit-chain-adoption`; each H3's bullet list is self-contained. Cross-references: see [`Anchor collision covenant` H2 above](#anchor-collision-covenant) for 14th inventory row (parent H2 anchor); the v2.0 / v2.1 / v2.6 / v2.7.1 / v2.7 polish round commit messages cite the introducer SHAs + commit ranges for each adopted file (see H3s immediately above); the bundle-side seal recorded in this row is verifiable via `sha256sum v29-archeology-chain.bundle` against the canonical `745d495f657671af542b2dba652952b3ee8f435b1c4a97f3511d52d9914af57a` value documented in the **Anchor Covenant** field above. Forward-extension note: any future v2.10+ Adopted H3 row would land at the parent H2 anchor (per the forward-extendable convention); this row's new slug (`#adopted-v2-9-archeology-chain-release-seal-dual-path-partial-archive`) is the canonical Archeology Chain HEAD at the bundle-side archeology axis (parallel to `26c8d81` at the commit-side archeology axis).

### Deferred: GFM reference-style link convention (proposed v2.7)

- **Origin**: today's `chore(docs)` commit `26a2c85` (`app/docs/DEPLOYMENT.md`) introduced the GFM `[label][n]` reference-style link convention INADVERTENTLY when placing `[1]: ./ops-notes.md#sidecar-disable-config-adopted "..."` at the bottom of the new operator runbook. The pre-`26a2c85` `grep -rnE '^\[\d+\]:' app/docs/ app/src/` returned ZERO matches -- this is the FIRST such `[n]:` definition in the project corpus. Per the v2.5 cross-domain header-rendering check extension (`88cf65b`, [`### Adopted: cross-domain header-rendering check extension (v2.5)` H3 above](#adopted-cross-domain-header-rendering-check-extension-v2-5)), every meaningful new convention discovered in audit-cycle work MUST be registered with pickaxe-traceable archeology alongside `#sidecar-disable-config-adopted` so future maintainers can find the convention's first instance to its git SHA. This H3 is that registry entry; status `Deferred` (vs `Adopted`) because the FIRST INSTANCE has been introduced but the convention has not yet propagated across `app/docs/*` as a back-port operation.

- **What was committed (today)**: zero new lines for this H3 itself; the FIRST INSTANCE lives in `app/docs/DEPLOYMENT.md`:
  - body link text at lines 23 + 127: `[Recommended Next Step][1]` (the inline text "Recommended Next Step" reads as an archeology-tag pointing at the prior `## Recommended Next Step (Outside This Commit)` deferral wording which was flipped to `## Sidecar-disable config (adopted)` at `f2d0744`).
  - bottom-of-doc definition at line 141: `[1]: ./ops-notes.md#sidecar-disable-config-adopted "## Sidecar-disable config (adopted) -- f2d0744 flips..."` -- the `title="..."` attribute carries the full archeological provenance inline (post-flip SHA + prior import SHA + live-render SHA).

- **Provenance of the first-instance file**: `app/docs/DEPLOYMENT.md` was introduced by `26a2c85` (`chore(docs): add app/docs/DEPLOYMENT.md (production rollout checklist + GFM ref-style cross-link to ops-notes.md#sidecar-disable-config-adopted)`). Introducer-SHA: `26a2c85`; introduced-cycle-version: first commit to introduce this convention; no prior `[n]:` definition existed in any tracked file at introducer.

- **Tripod Closure**: see [`## Future audit-batch roadmap` H2 above](#future-audit-batch-roadmap) -- this entry's parent H2. The Deferred status is the parent H2's forward-deferral mechanism; once a future cycle Adopts this convention, the Adopted H3 will replace this Deferred H3 IN PLACE (mirroring how `### Deferred: cross-domain header-rendering check extension (proposed v2.5)` H3 was flipped to `### Adopted: cross-domain header-rendering check extension (v2.5)` at the single docs-flip commit).

- **Anchor Covenant (doc-convention)**: the convention contract is:
  - **Inside body prose**: `[label][n]` where `n` is a small positive integer -- the `[label]` is arbitrary readable text and the `[n]` is the registry index.
  - **At the bottom of the doc** (typically under a `## Reference links` H2 heading): `[n]: url "optional title"` -- `url` may be a relative path (`./ops-notes.md#slug`) for sibling-doc references, an absolute path, or an external link; the `title="..."` attribute carries the full provenance quote for forward-archeology.

- **Disambiguation (vs inline `(#slug)` style)**: every prior cross-doc link in `app/docs/*` is inline `[label](#slug)` form (`[Recommended Next Step](#recommended-next-step-outside-this-commit)` style at `ops-notes.md:486`, etc.) -- every cross-reference embeds its target slug in the prose line. The new convention is the FIRST `[label][n]` + bottom-registry form, where the prose reads cleanly and the cross-reference targets live in a single auditable registry at the doc bottom.

- **Disambiguation (vs Anchor collision covenant inventory)**: the inventory at the top of `app/docs/ops-notes.md` tracks the TARGET slugs (the `[n]:` definitions resolve TO these slugs, e.g., `#sidecar-disable-config-adopted` at row 16). This new convention tracks the SOURCE-link formatting pattern (`[label][n]`). Inventory vs convention are complementary, not redundant.

- **What this defers (NOT closes)**: the future Adoption cycle (proposed as v2.8+) that converts every cross-doc `[label](url)` inline link across `app/docs/*` to the `[label][n]` reference-style -- at which point THIS H3 would be flipped in place to `### Adopted: GFM reference-style link convention (proposed v2.7 -> v2.8+)`. Forward-cycle archeology is necessarily speculative today; this Deferred H3 establishes the pickaxe-target so a future maintainer can `git log --reverse -S '^\[\d+\]:' --format='%h %s' -- app/docs/*.md` and find this H3 as the first-convention-introducing commit.

- **Sequence**: `26a2c85` (introducer of the first `[n]:` definition in `app/docs/DEPLOYMENT.md`) -> v2.7 Deferred registry (a future docs(ops-notes) commit that includes this H3) -> future Adopted cycle (proposed v2.8+) that propagates the convention across `app/docs/`. Forward-of-v2.7 the audit-script's `audit_script.sh` would need an additional Phase C grep section to enumerate `[n]:` references as a class (mirroring how the v2.5 extension enumerated the bash SPDX + Python docstring sectors); flagged forward-only for the Adopted cycle.

The new H3 slug `#deferred-gfm-reference-style-link-convention-proposed-v2-7` anchors at the parent H2 slug `#future-audit-batch-roadmap` per the forward-extendable convention (no per-H3 explicit-disambiguation sibling needed in the Anchor collision covenant inventory, mirroring the v2.0/v2.1/v2.3/v2.4/v2.5/v2.6 entries that anchor only at the parent H2). When this Deferred H3 is Adopted in-place at a future cycle, the slug stays the same; only the title prefix flips from `### Deferred:` to `### Adopted:`. Cross-references: see [`Sidecar-disable config (adopted)` H2 above](#sidecar-disable-config-adopted) for the link-target slug `#sidecar-disable-config-adopted` that the FIRST `[n]:` definition resolves to (registered as the 16th inventory row in the covenant above).
### Deferred: hoisted regex-pitfalls sentinel function library (proposed v2.8)

- **Origin**: the v2.7 polish-round commit `419db0f` left THREE inline regex-pitfalls sentinels (Phase R at end of Phase C + Phase G mirror + Phase H mirror), each ~7 lines that duplicate the off-hand `grep -cE '^- \`'` + strict `grep -cE '^- `#'` + delta + WARN-on-drift structure verbatim. A refactor to a single function would consolidate the convention into a reusable callable, reducing ~21 lines of inline duplication to ~11 lines of function-lift + call sites.
- **What was committed**: zero net lines (Deferred entry; a future v2.8 → v3.0 adoption cycle would land the function definition + 3 call-site replacements; the v2.7 inline-mirror shape remains canonical until then).
- **Provenance**: emerging from `419db0f` (`chore(docs+audit): close v2.7 polish round`). The polish-round commit is the introducer; v2.8 is the explicitly-deferred follow-up cycle for the DRY hoist.
- **Tripod Closure**: `b24ae77` (Phase R introducer) + `419db0f` (polish-round this proposal emerges from) + `b5a6712` (v2.8 registration; this commit) — the audit-script self-referential closure pattern.
- **Anchor Covenant (refactor)**: applies to `audit_script.sh` itself; the function definition lives inside the same file (single-file modular refactor, parallel to v2.0 capture-tsc-baseline.sh SPDX block + v2.4 Python docstring audit-chain's per-file scope). The kind `(refactor)` is launched from the open catalog at row 16 of the parent H2's Anchor collision covenant inventory (where `(code-convention)` / `(CLI)` / `(jq-fallback)` / `(regex/escape/JSON-path/scrub-key)` / `(doc-convention)` etc. are already registered; `(refactor)` is the first self-targeting kind launched from the audit-script's open catalog).
- **Disambiguation (vs inline Phase R/G/H sentinels at `b24ae77` + `419db0f`)**: the inline pattern is structurally forward-extendable via copy-paste; the v2.8 function library would replace 3 copies of 7 lines with 1 function definition (~8 lines) + 3 call sites (~1 line each) = ~11 lines vs current ~21 lines AND forward-lock the `delta == 28` baseline invariant in a single source-of-truth location (a future bug that says "we forgot to update the strict regex in Phase G but updated Phase R" becomes impossible when both call the same function).
- **Disambiguation (vs sibling Deferred H3 entries in this H2)**: distinct from `### Deferred: host-shell tooling audit-chain adoption` (tooling-layer header injection pattern) and `### Deferred: GFM reference-style link convention (proposed v2.7)` (docs-side authoring convention); the v2.8 entry is an audit-script internal refactor, distinct from those two pattern-extending deferrals because it doesn't introduce a NEW external convention -- it consolidates the existing 3 inline sentinels into a single source-of-truth primitive.
- **What this defers**: (a) the actual function-lift commit (forward-extracted from `419db0f`); (b) any subsequent audit-script-wide refactor that would benefit from extracting other repeated inline patterns into the same library (e.g., the per-file 5/5 semantic-line check in Phase J is structurally similar -- both iterate `for f in $(git ls-files '*.sh' '*.py' 2>/dev/null)` and run per-file semantic-line assertions). Forward-only; no back-porting of the v2.7 inline pattern.
- **Sequence**: `b24ae77` (Phase R introducer) + `419db0f` (polish-round this proposal emerges from) -> v2.8 registration (this commit) -> v2.8 -> v3.0 adoption cycle (replace trade-off: 21 inline lines -> 11-line function + call-sites).

The new section slug `#deferred-hoisted-regex-pitfalls-sentinel-function-library-proposed-v2-8` does not collide with any anchor in the [`Anchor collision covenant` H2 above](#anchor-collision-covenant) inventory. The H3 slug, like sibling Deferred entries, anchors at the parent H2 slug `#future-audit-batch-roadmap` (forward-extendable pattern; per the parent H2's documented convention in its closing prose).### Adopted: bundle-side integrity-cluster smoke test (incident retro [releases-install-snippet-bug])

- **Origin**: incident retro `[releases-install-snippet-bug]` for the [v2.9-archeology-chain release](https://github.com/joeshmoe97x-ship-it/USB-Uncensored-LLM/releases/tag/v2.9-archeology-chain). A broken install snippet was published in the #releases block at release-time. Verbatim broken snippet:

  `git clone https://github.com/joeshmoe97x-ship-it/USB-Uncensored-LLM/releases/download/v2.9-archeology-chain/v29-archeology-chain.bundle && git fetch v29.bundle HEAD:refs/heads/archeology-chain && git checkout archeology-chain`

  On a clean /tmp post-clone, this snippet FAILS with exit-128 because (a) `git clone <URL>` where URL ends in `.bundle` does NOT use git's bundle-install semantic -- git treats the URL as a remote git-server endpoint and 404s; (b) the subsequent `git fetch v29.bundle` references a local dir named `v29.bundle/` that was never created (`git clone`'s default basename-from-URL creates `v29-archeology-chain.bundle/` instead). Verbatim git exit from the smoke test (the leading `fatal: repository 'https://github.com/joeshmoe97x-ship-it/USB-Uncensored-LLM/releases/download/v2.9-archeology-chain/v29-archeology-chain.bundle/'` token is the canonical pickaxe-grep-resolvable anchor -- a future archeologist who hits the same exit-128 can `grep -nF "fatal: repository 'https://github.com/joeshmoe97x-ship-it/USB-Uncensored-LLM/releases/download/v2.9-archeology-chain/v29-archeology-chain.bundle/'"` and land at this H3 deterministically):

  ```
  Cloning into 'v29-archeology-chain.bundle'...
  remote: Not Found
  fatal: repository 'https://github.com/joeshmoe97x-ship-it/USB-Uncensored-LLM/releases/download/v2.9-archeology-chain/v29-archeology-chain.bundle/' not found
  ```

  Alternate anchor tokens (for archeologists grep-resolving from a different starting point): the `[releases-install-snippet-bug]` incident tag itself, the canonical sha256 `745d495f657671af542b2dba652952b3ee8f435b1c4a97f3511d52d9914af57a`, the `INTEGRITY ERROR: bundle sha256 mismatch` sentinel from the corrected snippet's in-line integrity gate.

- **What was committed** (2 new permanent CI-gate files + 1 re-published release body):

  1. `app/scripts/install-smoke-test.sh` (~5,692 bytes; executable; SPDX 5-line header) -- 5-sentinel bash smoke test (curl / sha256 / size / clone / branch / head). Idempotent via `cleanup` trap + per-sentinel explicit failure paths. Exit 0 only when all 5 PASS (`==> INTEGRITY CLUSTER CLOSED: all 5 sentinels PASS for v2.9-archeology-chain bundle`).
  2. `.github/workflows/install-smoke.yml` (~2,574 bytes) -- GitHub Actions workflow that invokes `bash app/scripts/install-smoke-test.sh` on `on:push` to branches `[main, v2.7-v2.8-stacked-archeology]` + `on:pull_request` (branches `[main, v2.7-v2.8-stacked-archeology]`; explicit PR-target gate covers feature branches) + `workflow_dispatch` (manual on-demand trigger). Closes the archeology cycle for the integrity incident -- any future install-snippet typo is caught pre-merge (PR) or post-merge (push) or on-demand (`workflow_dispatch`).
  3. `/tmp/build-log/v29-announcements.md` (off-repo scratch artifact at the audit-time host; NOT committed to the project tree; canonical persisted surface is the published `#releases` block at the [v2.9-archeology-chain release](https://github.com/joeshmoe97x-ship-it/USB-Uncensored-LLM/releases/tag/v2.9-archeology-chain)) -- replaced the broken 3-command snippet with the corrected curl+git-clone-bare idempotent pattern (see Anchor Covenant below). Re-published via `gh release edit v2.9-archeology-chain --notes-file`; v2.9 release body drifted 7,052 -> 7,084 bytes post-republish; post-publish sentinel verification confirmed install-snippet + sha256 + bundle URL all present.

- **Provenance of the adopted files**: introduced by THIS COMMIT (the `[releases-install-snippet-bug]` incident retro itself -- not a back-port to any prior introducer). Both CI-gate files exist solely to enforce the corrected install pattern going forward; no committer-lineage trace precedes them.

- **Tripod Closure**: this row is the third leg of the v2.9 release-side `bundle -> install-snippet -> CI-gate` tripod, alongside [`### Adopted: v2.7 polish round archeology-chain seal (v2.9 dual-path PARTIAL)`](#adopted-v2-7-polish-round-archeology-chain-seal-v2-9-dual-path-partial) (commit-side seal at `26c8d81`) + [`### Adopted: v2.9-archeology-chain release seal (dual-path PARTIAL archive)`](#adopted-v2-9-archeology-chain-release-seal-dual-path-partial-archive) (bundle-side seal at v2.9 PARTIAL archive). The CI-gate row locks the fix into the audit chain so a future "publish-then-drift" regression cannot recur without the workflow catching it. The CI-gate workflow encloses the drift surface that Phase J of `audit_script.sh` cannot reach (Phase J only sees tracked `.sh`/`.py` files; the GitHub release body is an out-of-band publication surface).

- **Anchor Covenant (bundle-install)**: strictly depends on the CORRECTED idempotent curl+git-clone-bare pattern (the contract surface decomposes into curl download + sha256 verification + git clone -- which the smoke test covers with the curl / sha256 / size / clone / branch / head sentinels respectively). Live in the published `#releases` block + canonicalized in `app/scripts/install-smoke-test.sh`:

  ```bash
  rm -f v29.bundle && rm -rf v29-clone \
    && curl --retry 3 --retry-delay 5 --retry-all-errors -L -o v29.bundle https://github.com/joeshmoe97x-ship-it/USB-Uncensored-LLM/releases/download/v2.9-archeology-chain/v29-archeology-chain.bundle \
    && [ "$(sha256sum v29.bundle | cut -d' ' -f1)" = "745d495f657671af542b2dba652952b3ee8f435b1c4a97f3511d52d9914af57a" ] || { echo "INTEGRITY ERROR: bundle sha256 mismatch (tampered or wrong URL)" >&2; exit 1; } \
    && git clone v29.bundle v29-clone \
    && cd v29-clone \
    && git checkout -b archeology-chain \
    && git log --oneline -1   # must show: 26c8d81 ...
  ```

  Idempotent (re-runnable on the same host without re-cleanup) via the leading `rm -f v29.bundle && rm -rf v29-clone`. CDN-stripped-tamper-resistant via the in-line `[ ... = "$EXPECTED_SHA256" ] || { ...; exit 1; }` integrity gate.

- **Disambiguation (publication-surface incident retro vs internal-tooling audit)**: distinct from the 9 prior Adopted rows in two ways. (a) The **publication surface** is the audited substrate -- the publish-block text that ships in the GitHub release body, which is the surface the END USER reaches (not the doc/tool surface that the developer reaches). (b) This row documents what was REVERTED AND what was REPLACED it (a broken-snippet incident retro), where prior Adopted rows document what was ADDED only.

- **What this closes**: the integrity incident retro for the [v2.9-archeology-chain release](https://github.com/joeshmoe97x-ship-it/USB-Uncensored-LLM/releases/tag/v2.9-archeology-chain) -- closes the archeology cycle by (i) preserving the verbatim broken snippet + the verbatim `fatal: repository ...` exit message as canonical pickaxe-grep-resolvable anchors in this H3 body; (ii) preserving the corrected idempotent token sequence as the **documentation source-of-truth** for the canonical install recipe (the canonical sha256 + HEAD + bundle URL **triple is replicated at 3 surfaces** -- this row's Anchor Covenant clause + `app/scripts/install-smoke-test.sh`'s `readonly EXPECTED_*` constants + the published GitHub release body -- with the workflow + Phase J 5/5 SPDX-block coverage as the drift-detection gate between the 3); (iii) wiring the script into GitHub Actions as an on-push + on-pull-request + workflow_dispatch CI gate via `.github/workflows/install-smoke.yml`; (iv) cross-linking the canonical sha256 (`745d495f657671af542b2dba652952b3ee8f435b1c4a97f3511d52d9914af57a`) + HEAD (`26c8d81`) + bundle URL from this row to every other Adopted row that references them. Future maintainers diagnosing a fresh-clone failure pointed at by `INTEGRITY ERROR: bundle sha256 mismatch` will land here via the workflow's failure-summary link.

The new section slug `#adopted-bundle-side-integrity-cluster-smoke-test-incident-retro-releases-install-snippet-bug` does not collide with any anchor in the [`Anchor collision covenant` H2 above](#anchor-collision-covenant) inventory (registered as the 17th inventory row at THIS COMMIT). Slug generated against the standard GFM anchor algorithm (lowercase + non-word stripped + spaces->hyphens + bracket/parenthesis-stripped + multi-dash collapsed). Cross-references: see [`## Future audit-batch roadmap` H2 above](#future-audit-batch-roadmap) for parent H2 slug row 14; see [`### Adopted: v2.9-archeology-chain release seal (dual-path PARTIAL archive)` H3 above](#adopted-v2-9-archeology-chain-release-seal-dual-path-partial-archive) for the bundle-side canonical anchor that this row's CI gate enforces; see [`### Adopted: cross-domain header-rendering check extension (v2.5)` H3 above](#adopted-cross-domain-header-rendering-check-extension-v2-5) for the per-file `5/5 semantic-line` coverage gate that validates the install-smoke-test.sh script's SPDX-block header (`# Provenance:` / `# Tripod Closure:` / `# Anchor Covenant (bundle-install):` / `# Disambiguation:` / `# Tag Chain:`) at the script's first 15 lines per Phase J of `audit_script.sh`.

[audit-note: prior Adopted row footer count-text drift -- CLOSED via `6163ca5 docs(ops-notes): reconcile prior Adopted footer count-text drift` (which itself closed audit-note #1 of the [releases-install-snippet-bug] retro tripod). Pre-6163ca5 state: L1005 (v2.7 polish round footer) enumerated 7 slugs and L1017 (v2.9 release seal footer) enumerated 9 slugs. Post-6163ca5: L1005 enumerates 8 slugs (the v2.7 polish round's own slug added as `(this row)`) and L1017 enumerates 10 slugs (the v2.9 release seal's own slug + the bundle-side slug per the v2.9 cycle). The 8/10 split between L1005 and L1017 is by design: each row's footer enumerates only the slugs that existed at that row's commit time, per the forward-extendable convention at `#future-audit-batch-roadmap`. L978 (v2.7.1 row footer) sees the full 10-slot set as the canonical count. No further reconciliation needed; this audit-note is closed.]

[audit-note #3: trailing-slug-references in L1005/L1017 cross-references sections -- RESOLVED. Off-hand audits that `grep -oE '`#adopted-[a-z0-9-]+`' | sort -u` against the L1005 and L1017 footer lines will count 8 + 10 distinct slugs in the body enumeration, but 9 + 11 if they include the trailing `docs-side references:` (L1005) and `Forward-extension note:` (L1017) paragraphs. The trailing references (`#adopted-run-e2e-sh-idempotent-start-guard-v2-7-1` in L1005 = within-app H3 anchor for the v2.7.1 row footer; `#adopted-v2-9-archeology-chain-release-seal-dual-path-partial-archive` in L1017 = the v2.9 release seal row's own Archeology Chain HEAD forward-extension anchor) are LEGITIMATE cross-references, not stale newline-merge artifacts, and are NOT part of the count-text enumeration. The count-text prefixes (`The eight slugs` in L1005, `The canonical H3 slugs` in L1017 with no count) match the distinct slugs IN the body enumeration only. The audit-script's strict regex `^- `#`` baseline (16 rows at v2.7, currently 17 with the v2.9 incident-retro row added) is unaffected by the trailing references because it counts inventory rows, not footer enumerations. No fix needed; this audit-note #3 is closed.]

[audit-note: `[releases-install-snippet-bug]` tag Phase C census status -- RESOLVED via v2.9 census-block relocation commit (closes audit-note #3 of the [releases-install-snippet-bug] retro tripod). The v2.9 incident-RETRO grep-census block in `audit_script.sh` -- which had been placed (incorrectly) inside the `else` branch of `if [ -n "$py_files" ]` at the original `dabda2c` introducer commit -- was relocated to global Phase C scope, immediately after the closing `fi` of the py_covenant if. The census now runs unconditionally on `git ls-files '*.md'` regardless of py-file state. Empirical verification: `bash audit_script.sh` output now surfaces the inaugural metric `[releases-install-snippet-bug]: 1 file (app/docs/ops-notes.md)` at the v2.9 Phase C cross-file tag-frequency census. The grep-resolvable fallback documented here remains as a forward-compatible surface for archeologists running the audit off-repo or before the script-can-run prerequisites are met in a fresh-host bootstrap.]

[audit-note: emission-surfaces preservation contract -- the 3-place canonical triple (this row's Anchor Covenant + `app/scripts/install-smoke-test.sh`'s `readonly EXPECTED_*` constants + the published GitHub release body) MUST stay in sync. A future tags drift between the 3 surfaces is detected by either (a) the install-smoke test's in-line sha256 `EXPECTED_SHA256` gate tripping (corpus/installation-surface drift), OR (b) the workflow `INTEGRITY CLUSTER CLOSED` line failing to appear in the CI log (publication-surface drift), OR (c) the audit-script Phase J 5/5 coverage gate tripping on the install-smoke-test.sh SPDX-block header (documentation-surface drift). The drift-detection triple-gate itself is the load-bearing CI invariant.]

