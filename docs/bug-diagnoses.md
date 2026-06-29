# Bug diagnoses

Short, empirical root-cause notes for issues that have already been debugged
end-to-end. Each section is intentionally one-screen-readable so future
maintainers can answer "why was it written this way?" without re-deriving
the failure mode by running capture-v6.sh and reading stacked logs.

---

## Bug A — CameraGrid shows zero `camera-card`s for admin

**Symptom.** Authenticated `admin@omnisight.local` users see an empty grid
in the React UI despite `is_admin()` RLS allowing both seeded cameras.
`page.getByTestId('camera-card').filter({ hasText: 'Shared Cam' })` times
out under Playwright. v3 instrumentation in
`tests/e2e/global-setup.ts` (gated by `E2E_DEBUG_DUMP=1`) confirms the
client receives zero rows on the `/cameras` REST call.

**Root cause — JWT race.** `CameraGrid` is mounted at the App-level
router, so its `useEffect([])` fires **once** when the React tree first
paints. On a fresh `page.goto('/')` run that fires **before** the
visitor has submitted the login form, so the initial `api.getCameras()`
call attaches the **anon** JWT (or no JWT at all when
`persistSession: false`). The RLS USING clause evaluates as either anon
or pre-auth and returns 0 rows. The empty `cameras` state is then
captured into `setCameras`, and because the grid never re-mounts on an
auth change, the empty array is the permanent UI state — even after
the user actually signs in.

**Fix (b1b309d commit).** `app/src/components/CameraGrid.tsx` now
subscribes to `supabase.auth.onAuthStateChange` inside the same
`useEffect`. On `SIGNED_IN` / `TOKEN_REFRESHED` it re-runs
`api.getCameras().then(setCameras)`, attaching the **new** JWT to the
REST call so the `cameras_select` USING clause re-evaluates under the
admin's session and surfaces both seeded cameras. On `SIGNED_OUT` it
clears the grid to prevent JWT-leak across sessions.

**Cleanup hygiene.** The original cleanup used a noisy
`?.data?.subscription?.unsubscribe?.()` triple-chain. The trailing
`?.()` was redundant because `subscription.unsubscribe` is always
defined in supabase-js v2.45.x; the inner `?.data?.subscription` chain
is retained for forward-compat with any future shimmed return shape.
See `app/src/components/CameraGrid.tsx` end of CameraGrid useEffect.

### Cross-references

- [`app/docs/ops-notes.md` § Capture-v6 vs Playwright discovery scope gap](../app/docs/ops-notes.md#capture-v6-vs-playwright-discovery-scope-gap) — Bug A's `b1b309d` fix (`supabase.auth.onAuthStateChange` listener in `app/src/components/CameraGrid.tsx`'s mount-time `useEffect` re-runs `api.getCameras().then(setCameras)` on `SIGNED_IN`/`TOKEN_REFRESHED`/`SIGNED_OUT`) is the same auth-state-listener commit canonically referenced in ops-notes § Capture-v6 table row #1 (`auth-rls.spec.ts` → T-RLS-11 `'b1b309d back-compat'`). The listener-attaches-to-mounting-`useEffect`-once pattern is the JWT-race regression lock-in for this Bug A closure and the rationale behind the table row's `'b1b309d back-compat'` annotation under the `admin-user JWT-pair observation in CONTEXT_BUNDLE` axis.

---

## Bug B — `admin-users` edge function returns HTTP 400 to flat-shape callers

**Symptom.** Tests calling `adminInvoke(env, jwt, 'grant_access', { camera_id, user_id })`
got `status=400` with body `"camera_id + user_id required"`, even when the
payload object clearly contained both keys. `T-RLS-3` / `T-RLS-4` failed on
this gate. Production callers using `invokeAdmin(...)` (which uses the
nested `{action, payload: {...}}` shape from `src/lib/auth.ts#AdminAction`)
worked fine, so the function's parse path was the asymmetry.

**Root cause — payload spread mismatch.** The edge function originally
did:

```ts
const { action, payload } = await req.json();
// ...
const { camera_id, user_id } = payload || {};
```

The canonical `src/lib/auth.ts#invokeAdmin` shape is
`{ action, payload: { camera_id, user_id } }` — that works. But the
test helper `tests/e2e/helpers.ts#adminInvoke` builds the body as
`JSON.stringify({ action, ...payload })`, i.e. the **flat** shape
`{ action, camera_id, user_id }`. With that body, the destructure
extracted `payload = undefined`, so the action handler's per-action
destructure (`payload.camera_id`) got `undefined`, and the
`!camera_id || !user_id` guard returned 400.

**Fix (b1b309d commit).** `app/supabase/functions/admin-users/index.ts`
now uses a back-compat destructure that accepts BOTH shapes:

```ts
const { action, payload: payloadRaw, ...rest } = await req.json();
const payload = payloadRaw ?? rest;
```

`payloadRaw` extracts the nested `payload` field if present; otherwise
the spread `rest` captures the flat-shape keys. Either way the per-action
destructure works unchanged. This makes the function contract
"both shapes are equivalent at parse time" — a stable invariant that
new callers can rely on without coordinating on a single shape.

**Regression lock-in.** `tests/e2e/admin-users-shapes.spec.ts`
authenticates as **admin** (NOT viewer — `assertAdmin` fires before the
body destruct so a viewer-only test could only lock in the rejection
path) and invokes `grant_access` sequentially with both nested and flat
shapes. Between calls the camera_access row is cleaned up via the
service-role so each shape reaches the action handler's INSERT path
independently. Both shapes are verified to: (a) return HTTP 200 with
`parsed.ok === true`, (b) actually insert the `(camera_id, user_id)` row
in the DB (proves the destructure resolved both keys, not just that the
route ran), and (c) yield byte-identical response bodies.When `signInAndGetJwt(ADMIN)` returns null (the cold-start bug tracked
separately) the test skips with a `SKIP_COLDSTART: admin auth unseeded`
sentinel. The prefix is **visually grep-able in run logs / Playwright
JSON reporter output**; it is NOT load-bearing for tooling because
scrub_and_build.py already differentiates skip from pass/fail at the
Playwright schema level (`status: "skipped"`). Treat the prefix as
informational, not contract. A second test
(`rejection-path parity`) confirms the byte-identical contract under
VIEWER's JWT as a smoke check that holds even when admin signin is broken.

### Cross-references

- [`app/docs/ops-notes.md` § Capture-v6 vs Playwright discovery scope gap](../app/docs/ops-notes.md#capture-v6-vs-playwright-discovery-scope-gap) — Bug B's `b1b309d` fix (back-compat destructure `const { action, payload: payloadRaw, ...rest } = await req.json(); const payload = payloadRaw ?? rest;` in `supabase/functions/admin-users/index.ts`) is the same back-compat commit canonically referenced in ops-notes § Capture-v6 table row #1 (`admin-users-shapes.spec.ts` → T-RLS-1..6 'b1b309d back-compat'). The probe spec's parse-path-parity sequence — nested-shape + flat-shape invocation between service-role cleanups, with the (a) HTTP 200 + (b) DB row insertion + (c) byte-identical response body verification triplet — is the regression lock-in for this Bug B closure and the rationale behind the table row's `'b1b309d back-compat'` annotation.

---

## Bug C — admin profile.role silently sticks at 'viewer' on capture-v6 cold-start

**STATUS: RESOLVED as of `0c9b5fa` (GRANT migration) + `c14f2d7` (this doc update) + `ca2b1f9+amended` (patchAdminProfile closure).** See "Empirical verification" subsection at the end of this entry for the worker-stderr grep verdict and the four tests that flipped 403/SKIPPED → PASSED. Two unrelated downstream bugs surfaced once Bug-C cleared and are tracked separately as **Bug D** (`nestedRemaining` testcode bug) and **Bug E** (Shared Cam UI locator timeout).

**Symptom.** During capture-v6 verification of the new admin-users-shapes parse-path tests (T-SHAPE-DEL / T-SHAPE-REV / T-REJ-DEL / T-REJ-REV), all four cascade-skipped via `SKIP_COLDSTART:` and neighbouring auth-rls tests regressed in lockstep:
- T-SHAPE-DEL, T-SHAPE-REV, T-REJ-DEL, T-REJ-REV all emitted `SKIP_COLDSTART: admin auth unseeded` sentinel (their `signInAndGetJwt(ADMIN)` would-be-null guard fired).
- T-RLS-3 (`admin grant_access via the Edge Function`) returned `403 Forbidden` with body `"Forbidden: admin role required"` even though admin signin succeeded.
- T-RLS-11 (`viewer cannot see admin private cameras; can see shared ones`) timed out locating `Shared Cam` because admin's cameras RLS didn't bypass via `is_admin()` — directly downstream of admin's profile reading as a viewer.

`signInAndGetJwt(anonClient, ADMIN_EMAIL, ADMIN_PASSWORD)` itself succeeded (returns a real JWT with `email_confirmed_at` non-null — courtesy of commit `a831769` switching from anon-signUp to service-role `auth.admin.createUser({email_confirm: true})`). The 403 was downstream at `admin-users` index.ts `assertAdmin`, where `profile.role !== "admin"` evaluated true.

**Root cause — first-user-becomes-admin bootstrap interacts with seed.sql ordering.** The `handle_new_auth_user()` trigger at `app/supabase/migrations/20250101000000_init_schema.sql` line ~99+ has two role-determination rules that act in sequence:

```sql
v_role := coalesce(new.raw_user_meta_data->>'role', 'viewer');
...
if not exists (select 1 from public.profiles) then
  v_role := 'admin';
end if;
insert into public.profiles (id, display_name, role, status)
values (new.id, v_display_name, v_role, 'active');
```

The `if not exists (...)` branch is intended for true cold-bootstrap scenarios (no `public.profiles` rows ever existed) and unconditionally promotes the FIRST signing-up user to admin. capture-v6.sh's Phase B.5 replays `supabase/seed.sql` BEFORE `globalSetup` runs; `seed.sql` line ~74 does an explicit `INSERT INTO public.profiles` with `role='viewer'` for viewer (and the `handle_new_auth_user` trigger fires for viewer's own auth.users INSERT, but `seed.sql`'s explicit upsert on a separate line forces viewer back to `role='viewer'` via `ON CONFLICT DO UPDATE`).

When `globalSetup.ensureAdminAuthRow` calls `service.auth.admin.createUser({user_metadata:{role:'admin'}})` AFTER seed.sql has fired:
- For WHYMEAN-OK sequences: `v_role := 'admin'` (from metadata) and `not exists (...)` evaluates FALSE (viewer exists) → trigger INSERTs admin's profile with `role='admin'`. Correct outcome.
- For sequences where GoTrue returns success to createUser BEFORE Postgres's `handle_new_auth_user` trigger commit is fully consumed by LISTEN/NOTIFY: a subsequent `.from('profiles').select(...).eq('id', admin.id)` from `assertAdmin` may read a stale or absent row, returning 403.

The empirical cascade is timing-dependent and not fully characterized as of `ca2b1f9`. The trigger is documented as synchronously firing inside the auth.users INSERT transaction in Postgres, but in practice some combinations of (a) seed.sql pre-population, (b) capture-v6's `docker volume rm` + re-migration sequence, and (c) supabase-go's async event-emission layer can produce a window where admin's profile.role observation is 'viewer' regardless of the trigger's intended assignment.

**Fix (commits `ca2b1f9` then amended in-place).** `app/tests/e2e/global-setup.ts` `ensureAdminAuthRow` now patches admin's `public.profiles` row with `role='admin', status='active'` AFTER BOTH the createUser fresh-path AND inside the listUsers-recovery idempotent branch. The patch uses:

```ts
service.from('profiles')
  .update({ role: 'admin', status: 'active' })
  .eq('id', adminId)
  .select('id')
```

The `.select('id')` chain is REQUIRED — by default supabase-js returns `data: null` from `.update()` unless `.select()` is chained (`UPDATE ... RETURNING id` semantics). Without `.select('id')`, the row-count check below would silently log `OK: 1 row(s)` on a 0-row match, masking the trigger-async regression. The patch closure inside `ensureAdminAuthRow` covers three cases:

```ts
async function patchAdminProfile(adminId: string, branch: 'create' | 'recovery'): Promise<void> {
  const { data: patchedRows, error: profileErr } = await service.from('profiles')
    .update({ role: 'admin', status: 'active' })
    .eq('id', adminId)
    .select('id');
  const affected = patchedRows?.length ?? 0;
  if (profileErr) {
    console.error(`[globalSetup] admin profile patch (${branch} path) error: ${profileErr.message}`);
  } else if (affected === 0) {
    console.error(`[globalSetup] admin profile patch (${branch} path) WARNING: 0 rows updated -- trigger race or stale id`);
  } else {
    console.error(`[globalSetup] admin profile patch (${branch} path) OK: ${affected} row(s)`);
  }
}
```

The `OK: 1 row(s)` / `WARNING: 0 rows updated` diagnostic split is the supporting signal for future regression investigation; see "Diagnostic verification split" below.

**Diagnostic verification split — reading the worker stderr.** ([`app/docs/ops-notes.md` § Reading worker stderr (the gotcha)](../app/docs/ops-notes.md#reading-worker-stderr-the-gotcha) explains why Playwright worker sub-process logs land in `run*.stderr`, NOT `path-a-capture-v6.log`. Reciprocal sentinel-table cite — [see also `app/docs/ops-notes.md` § Sentinel-based triage ladder](../app/docs/ops-notes.md#sentinel-based-triage-ladder), the H3 within § Capture-test triage cheat-sheet where the `SKIP_COLDSTART: admin auth unseeded` row anchors back at this Bug C section, completing the bug-diagnoses ↔ ops-notes tripod for Bug C.) When verifying whether the bug-C fix actually healed admin's profile (vs only appearing to heal), grep for `adminErr|admin profile patch|admin updateUserById` across `/tmp/build-log/run1.stderr /tmp/build-log/run2.stderr /tmp/build-log/baseline-run.log`:

- **`OK: 1 row(s)`** appears for both 'create' and 'recovery' branches (one per Phase F + Phase G = 4 instances expected for a normal cold-start seq) → the patch fired and admin's profile row was reachable; the trigger had already inserted it.
- **`WARNING: 0 rows updated`** appears → `handle_new_auth_user` trigger hadn't inserted admin's profile row by the time our `.update()` fired. The trigger is async w.r.t. `createUser` returning. Apply the alternative fix path (UPSERT or poll-and-retry).

**Empirical verification (capture-v6 at `20250101000001_grant_public_table_access.sql` run).** Re-running capture-v6 after adding the GRANT migration (`app/supabase/migrations/20250101000001_grant_public_table_access.sql`) yielded a THIRD failure mode the docs above didn't anticipate: `permission denied for table profiles` — the `.update()` couldn't even reach RLS evaluation because the migration's `create table if not exists` issued no GRANT statements to API roles. Worker-stderr grep proved this empirically:

```
[globalSetup] admin profile patch (create path) error: permission denied for table profiles
[globalSetup] admin profile patch (recovery path) error: permission denied for table profiles
```

Three failure modes documented, in chronological order:

| Mode | Verbatim log line | Cause | Fix |
|------|---|---|---|
| **(A) GRANT missing** | `permission denied for table profiles` | `create table if not exists public.profiles` issues no GRANT to API roles in Supabase CLI local dev | `migrations/20250101000001_grant_public_table_access.sql` GRANTs + explicit `alter role service_role bypassrls` |
| **(B) RLS 0-rows** | `WARNING: 0 rows updated -- trigger race or stale id` | Trigger hadn't inserted profile row by the time `.update()` fired | Patch with poll-and-retry or UPSERT |
| **(C) profile.role='viewer' silent** | (no log, downstream 403) | Trigger's `if not exists` check fails (viewer exists) + metadata-derived `v_role='admin'` overrides correctly, but rare timing windows surface stale JWT | Trigger rewrite + UPSERT-or-reassign at seed time |

The fix at `ca2b1f9` + the migration at `20250101000001_*` resolves Mode A. The 3-case `patchAdminProfile` logging shape still distinguishes Mode B as `WARNING` if it surfaces in the future (defensive). Mode C is structural and corresponds to the original Bug-C diagnosis captured in this section's "Root cause" prose.

**Final verification — capture-v6 results.** After both `ca2b1f9`+amended AND `20250101000001_grant_public_table_access.sql`+amended (explicit `alter role service_role bypassrls`):

- `OK: 1 row(s)` appears 4× across `run1.stderr` + `run2.stderr` + `baseline-run.log` (one per Phase F + one per Phase G) — Bug-C IS resolved.
- `T-RLS-7` (admin grant_access via admin-users) — `403 Forbidden` pre-fix → **PASSED**. This is the test that sat behind the original 403 assertion. Bug-C scope empirics: **VERIFIED**.
- `T-RLS-8` (admin revoke_access) — PASSED pre-fix and post-fix.
- `T-RLS-9` (fast-flow) — PASSED pre-fix and post-fix.
- `T-RLS-10` (VIEWER cannot create_user) — PASSED pre-fix and post-fix.
- `T-RLS-3` (admin-users parse-path insert, admin-users-shapes.spec.ts) — PASSED with `variance_ratio=10.2` (cold-start is real, not flaky).

Two NEW failures are NOT part of Bug-C scope:

- **`T-RLS-1` FAILS** in the latest run with `ReferenceError: nestedRemaining is not defined` at `tests/e2e/admin-users-shapes.spec.ts:317`. This is a TEST CODE BUG (a lintable un-bound variable) that surfaced only after Bug-C was resolved enough for the test code path to actually execute. Tracked separately as **Bug D**.
- **`T-RLS-11` FAILS** with `expect(locator).toBeVisible()` timeout locating `camera-card` filtered by `Shared Cam`. This is downstream of `Closed Cam` row not surfacing in admin's UI render. Tracked separately as **Bug E**.

These two NEW failures are NOT regressions caused by Bug-C's fix — they are TESTS that got further than before (no longer SKIP_COLDSTART-skipping or 403ing) and now expose real downstream issues in seed / UI plumbing. See Bug D and Bug E sections below for followup root-cause work.

**Future-proof checklist when touching `supabase/seed.sql` or `migrations/20250101000000_init_schema.sql`:**
1. Any seed that pre-populates `public.profiles` BEFORE globalSetup runs will trigger this regression. Always verify admin's profile.role='admin' before/after any seed replay path.
2. Any modification to `handle_new_auth_user` that changes the role-determination logic should be paired with a re-verification of this fix via the diagnostic grep above.
3. capture-v6's Phase B.5 seed replay is itself a regression-risk surface — non-idempotent seeds (`INSERT` without `ON CONFLICT`) compound this bug; check `seed.sql` for idempotency before merging changes to it.
4. The fix at `ca2b1f9` is intentionally surgical (no schema/seed ripple). If it ever needs replacement by a more aggressive approach (e.g. schema-side trigger rewrite, migrating bootstrap-becomes-admin logic to a seed-time role assignment, or moving the patch into capture-v6.sh itself), do so in a separate, well-marked follow-up commit — keep the surgical fix as the fallback.

---

## Validation status (as of capture-v6 run ca2b1f9 + amended + 20250101000001_grant_public_table_access.sql) — superseded for Bug D; see **Bug D RESOLVED** section below for current state; preserved here for bisect hygiene

| Test | Pre-`ca2b1f9` | Post-`ca2b1f9` | Post-grant-migration | Notes |
|------|----------------|----------------|----------------------|-------|
| T-RLS-1 | FAILED | FAILED | FAILED | Surfaced testcode bug (`nestedRemaining is not defined` at `admin-users-shapes.spec.ts:317`) — see **Bug D RESOLVED** section below for current state. Not a Bug-C cascade. |
| T-RLS-2 | PASSED | PASSED | PASSED | Viewer-reject at admin-users; exercises Bug-B parse path indirectly. |
| T-RLS-3 | SKIPPED + 403 | SKIPPED + 403 | **PASSED** (`variance_ratio=10.2` cold-start awareness) | admin-users-shapes parse-path insert for both flat + nested shape. Bug-C's first-surface. |
| T-RLS-7 | FAILED 403 | (403 pre-fix) | **PASSED** | admin grant_access via admin-users. The test that originally 403'd. Bug-C scope: VERIFIED. |
| T-RLS-8 | PASSED | PASSED | PASSED | admin revoke_access. |
| T-RLS-9 | PASSED | PASSED | PASSED | fast-flow. |
| T-RLS-10 | PASSED | PASSED | PASSED | VIEWER cannot create_user. |
| T-RLS-11 | FAILED timeout | FAILED timeout | FAILED timeout | UI locator on 'Shared Cam'. NOT Bug-C; tracked as **Bug E** below. |
| T-SHAPE-DEL (=new T-RLS-1 above) | n/a (new) | SKIPPED | FAILED (testcode bug) | Renumbered by `scrub_and_build.py`. Was Bug-C cascase-skip; now testcode bug surface. |
| T-SHAPE-REV | n/a (new) | SKIPPED | (collapsed into other renumbered tests by scrub_and_build.py) | |
| T-REJ-DEL | n/a (new) | SKIPPED | skipped | VIEWER rejection-path; admin signin clean now, but rejection-path cleanup likely needs separate fixture. |
| T-REJ-REV | n/a (new) | SKIPPED | skipped | VIEWER revocation-rejection; same fixture-cleanup pattern. |

**Honest status note:** The capture-v6 baseline at `20250101000001_grant_public_table_access.sql` is captured with per-test statuses reflecting what Playwright actually saw, per `tests/e2e/_baseline-run.json`. `worker-stderr` grep returns 4× `OK: 1 row(s)` (no `WARNING`, no `error`) confirming the patch fires correctly in both Phase F + Phase G. **Bug C scope is RESOLVED.** Two unrelated downstream bugs (Bug D — testcode, Bug E — UI locator) are tracked separately below.

---

## Validation status (as of capture-v6 run 3d095f6) — superseded; preserved for bisect hygiene

| Test | Pre-fix | Post-fix | Notes |
|------|---------|----------|-------|
| T-RLS-1 | FAILED (admin 0 cameras) | FAILED | Bug-A JWT-race listener is in place; T-RLS-1 currently still fails — separate investigation tracks admin-user provisioning at capture-v6 cold-start (seed.sql row ordering). |
| T-RLS-2 | PASSED | PASSED | Viewer-reject at admin-users; exercises Bug-B parse path indirectly. |
| T-RLS-3 | SKIPPED (admin signIn null) | SKIPPED | `aggregate.all_passed_in_both_runs = false` because of T-RLS-1 failure and T-RLS-3..5 cascade-skip. The new `admin-users-shapes.spec.ts` regression test exercises the Bug-B parse-path with admin JWT (sequential nested + flat shape) and asserts both yield byte-identical success bodies + DB row insertion; it skips with `SKIP_COLDSTART:` until admin signIn works at cold-start. |
| T-RLS-4 / T-RLS-5 | skipped | skipped | Same admin signIn skip; cascades from T-RLS-3. |

The captured baseline at `3d095f6` is HONEST (status: `captured` with
per-row status reflecting what Playwright actually saw, per
`tests/e2e/_baseline-run.json`).

---

## Bug D — `admin-users-shapes.spec.ts:317` references un-bound `nestedRemaining`

**STATUS: RESOLVED.** Surfaced only after Bug-C cleared — before the patch landed, this test was `SKIP_COLDSTART`-skipping at `signInAndGetJwt`, never getting far enough to hit the un-bound reference. The post-Bug-C capture-v6 run is the first time this test path is reachable at full depth.

**Symptom.** T-RLS-1 (the renumbered parse-path-delete test from `admin-users-shapes.spec.ts`) fails with:

```
ReferenceError: nestedRemaining is not defined

  316 |       expect(
> 317 |         nestedRemaining?.user?.id,
```

The locator is the post-delete auth.users row lookup for the nested-shape fixture user. Expected to be `undefined` (admin deleted the row), but `nestedRemaining` is undefined itself (variable never bound), so the optional-chain short-circuit masks the post-delete truthiness check entirely.

**Root cause — orphaned `getUserById` intent.** The original author drafted the `(NB: relies on supabase-js v2.40+ where admin.getUserById...)` comment ABOVE line 317 — explicitly stating they were about to verify that the nested-shape deletion actually removed the auth.users row via `service.auth.admin.getUserById(nestedFixture.id)`. The flat-shape sibling 9 lines below binds + asserts the lookup correctly:

```ts
const { data: flatRemaining } = await service.auth.admin.getUserById(flatFixture.id);
expect(flatRemaining?.user?.id, ...).toBeUndefined();
```

But the nested-shape branch forgot the matching `const { data: nestedRemaining } = ...` line, jumping straight from the comment-only block into `expect(nestedRemaining?.user?.id, ...)`. The reference at line 317 was left dangling. There is no `beforeEach` / `beforeAll` that could have reasonably bound this name — only the comment block planned for it.

**Fix (single binding insertion, mirroring the verified flat-shape pattern).** Insert exactly one line in `tests/e2e/admin-users-shapes.spec.ts` between the version-pin comment block and the `expect(...)`:

```ts
// (NB: relies on supabase-js v2.40+ where admin.getUserById ... )
const { data: nestedRemaining } = await service.auth.admin.getUserById(nestedFixture.id);
expect(
  nestedRemaining?.user?.id,
  'nested shape: auth.users row must be deleted by admin-users delete_user',
).toBeUndefined();
```

The flat-shape comment `(version-pin note: see comment above the nested.getUserById call)` now points at a real call. Both shapes' assertions are congruent (post-delete `auth.users` row absent), which is the invariant Bug-D's test was trying to pin in the first place.

**Cleanup hygiene — why nested fixture is safe to leak if `getUserById` throws.** The test's `try { ... } finally { await deleteFixtureUserQuietly(service, nestedFixture?.id); }` ensures the try-block's success or failure does not orphan the `auth.users` row. The new `getUserById` reads from a row that has already been DELETEd by the (now-resolved) `delete_user` invocation eight lines up; a `getUserById` failure here would itself signal a real regression in supabase-js / GoTrue interaction, so the failure being non-throwing is desirable — but the `finally` belt covers the case either way.

**Empirical verification (capture-v6 at this commit, exit 0 elapsed 128s).** `_baseline-run.json` now reports for T-RLS-1:

```
  id:                 T-RLS-1
  status:             passed
  status_run1_final:  passed
  status_run2_final:  passed
  duration_ms:        455
  duration_run1:      455   duration_run2: 446  (variance_ratio=1.02, variance_ok=true)
  error_run1_final:   null
  error_run2_final:   null
  title:              ... / parse-path parity for delete_user: nested + flat both delete fixture users with byte-identical success
  file:               admin-users-shapes.spec.ts:281 (shifted from 317 post-fix)
```

The bisect-marker grep `/tmp/build-log/*.log -> 'nestedRemaining is not defined'` now returns ZERO matches in this capture's worker stderr (only commit-message drafts and an older pre-fix log contain the substring). Bug-C scope (T-RLS-7/8/9/10 PASSED, `admin profile patch OK: 1 row(s)` x4 across phase F + phase G) is unchanged.

**Verification signal — REVERSED (for future regressions).** Until a future regression re-introduces the same dangling reference, the docstring for T-RLS-1 in `_baseline-run.json` will report `"status": "passed"` + `"error_run1_final": null`. Filtering for `"id": "T-RLS-1"` + `"status": "passed"` is now the post-fix bisect-marker; re-emergence of the original symptom will flip it back to `"status": "failed"` + `"error_run1_final.message": "ReferenceError: nestedRemaining is not defined"`.

---

## Bug E — `T-RLS-11` 'Shared Cam' UI locator timeout

**STATUS: RESOLVED as of `37ae861` (CameraGrid.tsx root-cause fix) + `c2ee264` (sibling defensive pattern).** T-RLS-11 (renumbered from `viewer cannot see admin private cameras; can see shared ones`) was timing out across multiple capture-v6 runs — pre-Bug-C, post-Bug-C, and post-seed.sql camera-list expansion. The post-Bug-C failure is the one resolved here; the trigger turned out to be a seed-data shape that exposed an unguarded frontend hardcoded-map lookup, NOT a Bug-C cascade.

**Root cause — single surviving hypothesis (render-path bug exposed by seed-data shape).** The 3-hypothesis surface enumerated below (and re-listed across the diagnostic-status section) collapses to one: an unguarded `BRAND[cam.brand]` lookup in `app/src/components/CameraGrid.tsx:138` that throws `TypeError: Cannot read properties of undefined (reading 'cls')` when `cam.brand` is one of the 9 new seed brands added at commit `1e8c581` (chore(seed): append 9 demo cameras — O-Kam Pro / iCam365 / V380 Pro / Ring Doorbell / Blink Mini / DMSS DVR / Cobra / Onwote / Generic CCTV). `BRAND` only has 4 keys (`eseecloud` / `huntervision` / `ajcloud` / `onvif`); the access throws, the TypeError propagates up the React subtree, CameraGrid unmounts before any `data-testid="camera-card"` div emits, and the locator times out. A companion guard was added at line 269 (`BRAND[focused.brand].label` inside the DetailModal payoff block, the same brand access pattern with a different binding).

**Symptom.** T-RLS-11 fails with:

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('camera-card').filter({ hasText: 'Shared Cam' })
Expected: visible
Timeout: 20000ms
Error: element(s) not found
```

The test step at `tests/e2e/auth-rls.spec.ts:40` runs after admin signin claims to see both `SHARED_CAM` and `PRIVATE_CAM`. The grep filters the camera-card list by hasText 'Shared Cam' — zero matches in the rendered DOM.

**Diagnostic evidence & fix path (cross-referenced to docs).** The empirical journey ruling out API payloads and confirming the `TypeError` unmount is permanently locked in and archived across the `app/docs/ops-notes.md` registry (mirrors the JSDoc tersify pattern at `13f1e56` + `dcfb428`). See canonical references:

- [`app/docs/ops-notes.md` § Bug E lock-in workflow](../app/docs/ops-notes.md#bug-e-lock-in-workflow) — complete 4-artifact defensive shape + empirical evidence chain verifying identical crashes.
- [`app/docs/ops-notes.md` § Artifacts at HEAD](../app/docs/ops-notes.md#artifacts-at-head) — captures the 3-commit fix sequence (`37ae861` root-cause fix + `c2ee264` sibling defense + capture-v6 wiring).
- [`app/docs/ops-notes.md` § Closure cycle audit log (this commit)](../app/docs/ops-notes.md#closure-cycle-audit-log-this-commit) — records the temp-revert validation and 12× `[pageerror]` count regression.
- [`app/docs/ops-notes.md` § Reading worker stderr (the gotcha)](../app/docs/ops-notes.md#reading-worker-stderr-the-gotcha) — the `run{1,2}.json` sink vs `run*.stderr` diagnostic split that initially hid the `[pageerror]` signals.
- [`app/docs/ops-notes.md` § Capture-test triage cheat-sheet](../app/docs/ops-notes.md#capture-test-triage-cheat-sheet) — the canonical sentinel-based triage-ladder entry (`Shared Cam`+`camera-card`+`Timeout: 20000ms`) for re-emergence.
- [`app/tests/e2e/bug-e-api-probe.spec.ts`](../app/tests/e2e/bug-e-api-probe.spec.ts) — the architectural Artifact-4 sibling (hypothesis-1 API-payload probe) of the four-artifact Bug E design; surfaces `[bug-e-api-probe.*verdict=API_FULL|API_PARTIAL|API_EMPTY]` worker-stderr lines that complement this section's empirical evidence chain (see also `app/docs/ops-notes.md` § Bug E lock-in workflow ## Artifacts at HEAD). `testIgnore: ['**/tests/e2e/bug-e-api-probe.spec.ts']` (in `app/playwright.config.ts`) + capture-v6 hardcoded 3-spec list both exclude it from the regression cycle (per § Capture-v6 vs Playwright discovery scope gap); invocable on demand via `npx playwright test tests/e2e/bug-e-api-probe.spec.ts --reporter=line` (testIgnore bypassed by positional CLI).

**Verification signal.** Until the fix lands, the docstring for T-RLS-11 will reference `'Shared Cam'` + `'camera-card'` + `Timeout: 20000ms`. Filtering for this exact substring is the bisect-marker for confirming the fix is in place.
