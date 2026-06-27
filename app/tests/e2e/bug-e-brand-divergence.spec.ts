/**
 * Bug E — regression lock-in test for the 37ae861 + c2ee264 defensive fix.
 *
 * Per docs/bug-diagnoses.md Bug E section (RESOLVED as of `37ae861` + `c2ee264`):
 * the original symptom was a 12-per-run `TypeError: Cannot read properties of
 * undefined (reading 'cls')` fired from CameraGrid.tsx:296 when an admin
 * signed in with a brand string that was NOT one of the 4 keys in the
 * in-component BRAND lookup literal. Trigger: commit 1e8c5811 expanded the
 * camera list from 2 to 11 seeded brands (O-Kam Pro / iCam365 / V380 Pro /
 * Ring Doorbell / Blink Mini / DMSS DVR / Cobra / Onwote / Generic CCTV).
 *
 * The fix pattern across the four guarded components
 *   CameraGrid.tsx        : `BRAND[cam.brand as keyof typeof BRAND] ?? FALLBACK`
 *   EvidenceLocker.tsx    : `TYPE_META[type] ?? TYPE_META.log_bundle` +
 *                            `STATUS_META[status] ?? STATUS_META.ready`
 *   EventsList.tsx        : `SEVERITY[severity] ?? FALLBACK` +
 *                            `TYPE_ICONS[type] ?? FALLBACK_ICON`
 *   ThreatMonitor.tsx     : `TYPE_META[type] ?? FALLBACK`
 * is the load-bearing invariant this spec exists to lock in.  If a future
 * contributor reverts any of those guards to a bare bracket-syntax lookup
 * (`BRAND[cam.brand]`), an admin row with any brand OUTSIDE the literal
 * lookup table would trigger the original TypeError during CameraGrid
 * mount. This spec seeds exactly that divergent row and asserts the
 * component tree stays healthy.
 *
 * Why a separate spec file (not folded into auth-rls.spec.ts):
 *   auth-rls.spec.ts's negative-path assertion in T-RLS-11 timed out at
 *   60s because CameraGrid.tsx crashed before any card could filter by
 *   text. Restoring T-RLS-11 is best done by fixing the render path, NOT
 *   by adding a brittle negative assertion that depends on CameraGrid
 *   being uncrashed for its duration. This spec is the SAFE positive
 *   assertion: admin signs in, divergent card IS visible, no pageerror,
 *   done. Future regression failures make the root cause obvious in the
 *   captured stderr — `[pageerror] TypeError: ... reading 'cls' ...`
 *   is louder than a 60s timeout.
 *
 * Mirrors:
 *   - auth-rls.spec.ts        : browser flow (page.goto, fill, click submit,
 *                               getByTestId('camera-card').filter(...))
 *   - bug-e-api-probe.spec.ts : stderr-trace convention with
 *                               `[bug-e-brand-divergence.*]` prefix for greppability
 *   - log-stream.ts           : captureConsoleAndNetwork() to wire
 *                               page.on('pageerror') into worker stderr
 *
 * Schema source of truth (app/supabase/migrations/20250101000000_init_schema.sql):
 *   public.cameras columns used in the seed:
 *     id          uuid PK default gen_random_uuid()
 *     name        text NOT NULL
 *     brand       text                          -- the divergent value lands here
 *     status      text NOT NULL default 'offline' check in ('online','offline','degraded','maintenance')
 *     owner_id    uuid references auth.users(id) on delete set null   -- NULL so admin RLS bypasses
 *     stream_url  text                          -- needed for the <video> to render without console error
 *
 * UUID inventory check (seed.sql + admin-users-shapes.spec.ts NONEXISTENT_USER_ID):
 *   11111111.. ADMIN_UUID
 *   22222222.. SHARED_UUID
 *   33333333.. viewer auth.users.id (NOT a camera PK)
 *   44444444.. O-Kam Pro
 *   55555555.. iCam365 Indoor
 *   66666666.. V380 Pro Cam
 *   77777777.. Ring Video Doorbell
 *   88888888.. Blink Mini
 *   99999999.. DMSS DVR (also NONEXISTENT_USER_ID for profiles)
 *   AAAAAAAA.. Cobra DVR
 *   BBBBBBBB.. Onwote Cam
 *   CCCCCCCC.. Generic CCTV Cam
 *   Slot in use here: f00dbabe-...-001 (visibly synthetic; no collision risk).
 *
 * Capture-v6 inclusion: INCLUDED in capture-v6.sh Phase F + Phase G as of
 * commit 7b0904b. The two phases share an identical, hardcoded test list
 * (capture-v6.sh Phase G mirrors Phase F verbatim) so the spec runs twice
 * per capture cycle; the row is keyed by spec_meta + line + column
 * fingerprint by scrub_and_build.py so a duplicate run doesn't double-count.
 * The earlier INTENTIONALLY OMITTED stance (matching bug-e-api-probe.spec.ts)
 * was relaxed in 7b0904b because the spec is now the load-bearing regression
 * guard for the BRAND fallback shape across the four guarded components —
 * omitting it from the per-cycle capture would let a future contributor's
 * silent revert slip through. (See the JSDoc caveat at the end of
 * `docs/ops-notes.md` `## Bug E lock-in workflow` for the prior capture-
 * v6 wiring context, including the T-RLS-12 row key in _baseline-run.json.)
 *
 *   # To replay a single run on demand (post Phase D env-export in capture-v6.sh):
 *   npx playwright test tests/e2e/bug-e-brand-divergence.spec.ts --reporter=line
 *
 * Cleanup contract: pre + post delete via service-role. The cameras_delete
 * policy requires `owner_id = auth.uid() OR is_admin()`, but the
 * service-role client used here bypasses RLS for the DELETE — same pattern
 * as admin-users-shapes.spec.ts's camera_access cleanup (line 173).
 */
import { test, expect } from '@playwright/test';
import { captureConsoleAndNetwork } from './log-stream';
import { readSupabaseEnv, createServiceClient } from './helpers';

const ADMIN_EMAIL              = 'admin@omnisight.local';
const ADMIN_PASSWORD           = 'admin123';
// Distinct from seed.sql's 4 known BRAND keys: eseecloud / huntervision /
// ajcloud / onvif. Also outside the wider set the human UI may one day
// enumerate (O-Kam Pro / iCam365 / etc.) — it's a synthetic brand name
// the production app will never legitimately seed.
const UNSUPPORTED_BRAND        = 'unsupported_test_brand';
// Mirror of CameraGrid.tsx's fallback label format:
//   `(BRAND[focused.brand as keyof typeof BRAND] ?? { label: String(focused.brand ?? '').toUpperCase() }).label`
// i.e. `String('unsupported_test_brand').toUpperCase()` -> 'UNSUPPORTED_TEST_BRAND'.
const UNSUPPORTED_BRAND_LABEL  = 'UNSUPPORTED_TEST_BRAND';
// The camera-name string rendered inside data-testid="camera-name" (per
// CameraGrid.tsx:215). `getByTestId('camera-card').filter({ hasText: ... })`
// scopes the locator to the specific seeded row.
const UNSUPPORTED_CAM_NAME     = 'Unsupported Test Brand';
// Stable, synthetic, visibly-divergent UUID. Outside seed.sql's 12-camera
// inventory AND outside all admin/users fixtures — see top-of-file UUID
// table. Idempotent on re-run via pre-cleanup delete.
const UNSUPPORTED_CAM_UUID     = 'f00dbabe-0000-0000-0000-000000000001';

/**
 * Guaranteed post-cleanup of the divergent seed row. Registered via
 * test.afterAll so it runs even when an assertion between STEP 2 (insert)
 * and STEP 6 (badge visibility) throws -- preserving the pre-cleanup-as-
 * safety-net invariant from a single run. Soft-fails on delete error
 * (logs only) so the spec never collapses purely on a DB-side hiccup
 * at teardown.
 *
 * Reads env + builds the service client again at afterAll time (not at
 * module-load) because helpers.ts throws if VITE_SUPABASE_URL /
 * VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are missing, and
 * we want that fail-fast to fire at teardown only if the spec's earlier
 * assertions have already passed (env was wired by capture-v6 Phase D).
 */
test.afterAll(async () => {
  try {
    const env = readSupabaseEnv();
    const service = createServiceClient(env);
    const { error } = await service.from('cameras').delete().eq('id', UNSUPPORTED_CAM_UUID);
    if (error) {
      process.stderr.write(
        `[bug-e-brand-divergence] post-cleanup=ERROR message="${error.message}". ` +
        `Row ${UNSUPPORTED_CAM_UUID} may persist until next run; pre-cleanup at STEP 1 will absorb it.\n`,
      );
    } else {
      process.stderr.write(`[bug-e-brand-divergence] post-cleanup=OK\n`);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(
      `[bug-e-brand-divergence] post-cleanup=THREW message="${msg}". ` +
      `Pre-cleanup at STEP 1 is the fallback safety net.\n`,
    );
  }
});

test(
  'Bug E regression lock-in — CameraGrid renders an admin-supplied brand outside the BRAND lookup table',
  async ({ page }, testInfo) => {
    const dump = captureConsoleAndNetwork(page, testInfo.title);
    const env = readSupabaseEnv();
    const service = createServiceClient(env);

    // ============================================================
    // STEP 1: Pre-cleanup (idempotent against prior interrupted runs)
    // ============================================================
    process.stderr.write(
      `[bug-e-brand-divergence] pre-cleanup: deleting row id=${UNSUPPORTED_CAM_UUID} if present\n`,
    );
    const { error: preDelErr } = await service
      .from('cameras')
      .delete()
      .eq('id', UNSUPPORTED_CAM_UUID);
    if (preDelErr) {
      // Not a blocker — if delete fails the post-cleanup would too, and a
      // FK constraint or RLS surface would be more clearly diagnosed at the
      // subsequent insert call's error message. We continue and surface the
      // more-specific signal.
      process.stderr.write(
        `[bug-e-brand-divergence] pre-cleanup=ERROR message="${preDelErr.message}". Proceeding; insert will surface a more specific error if applicable.\n`,
      );
    } else {
      process.stderr.write(`[bug-e-brand-divergence] pre-cleanup=OK\n`);
    }

    // ============================================================
    // STEP 2: Insert the divergent row (service-role bypasses RLS).
    // owner_id=null matches seed.sql's pattern — admin sees via
    // is_admin() bypass; viewer would NOT see without an explicit
    // camera_access grant, but this spec's test is admin-only.
    // ============================================================
    const seedRow = {
      id:         UNSUPPORTED_CAM_UUID,
      name:       UNSUPPORTED_CAM_NAME,
      brand:      UNSUPPORTED_BRAND,
      status:     'online',
      owner_id:   null,
      // stream_url not strictly needed for the visibility assertion, but
      // including it avoids a console warning on <video src=undefined>
      // during render which would inflate noise in capture-v6 stderr.
      stream_url: 'rtsp://omnisight-fixture:8554/unsupported_test_brand',
    };
    process.stderr.write(
      `[bug-e-brand-divergence] inserting cameras row: id=${seedRow.id} ` +
      `name="${seedRow.name}" brand="${seedRow.brand}" status="${seedRow.status}" owner_id=null\n`,
    );
    const { error: insertErr } = await service.from('cameras').insert(seedRow);
    expect(
      insertErr,
      `service-role INSERT into public.cameras failed; this blocks the regression test. ` +
      `error=${JSON.stringify(insertErr ?? {})}`,
    ).toBeNull();
    process.stderr.write(`[bug-e-brand-divergence] seed_insert=OK\n`);

    // ============================================================
    // STEP 3: Sign in as admin via the browser (mirrors auth-rls.spec.ts).
    // The login submit auto-loads the CameraGrid tab as the default
    // landing per App.tsx palette routing.
    // ============================================================
    await page.goto('/');
    await page.getByTestId('login-email-input').fill(ADMIN_EMAIL);
    await page.getByTestId('login-password-input').fill(ADMIN_PASSWORD);
    await page.getByTestId('login-submit').click();

    // ============================================================
    // STEP 4: PRIMARY ASSERTION — the seeded card is rendered visible.
    //
    // `getByTestId('camera-card').filter({ hasText: UNSUPPORTED_CAM_NAME })`
    // scopes to the seeded row by the camera-name h3 text. The other
    // 11 seeded rows ('Shared Cam', 'Admin Private Cam', ...) won't match.
    //
    // `toBeVisible({ timeout: 20_000 })` mirrors auth-rls.spec.ts's
    // T-RLS-1..5 window — long enough for Vite dev-bundle compile on
    // cold-start, short enough to fail loudly if the page never surfaces
    // the row because CameraGrid crashed on render.
    // ============================================================
    await expect(
      page.getByTestId('camera-card').filter({ hasText: UNSUPPORTED_CAM_NAME }),
    ).toBeVisible({ timeout: 20_000 });
    process.stderr.write(
      `[bug-e-brand-divergence] seeded_card_visible=OK target="${UNSUPPORTED_CAM_NAME}"\n`,
    );

    // ============================================================
    // STEP 5: REGRESSION LOCK-IN — no `pageerror:` lines emitted during
    // render.  captureConsoleAndNetwork pipes page.on('pageerror') into
    // the dump string AND into worker stderr as `[pageerror] ...`. If
    // a future contributor reverts the BRAND-lookup fallback guard
    // (e.g. `BRAND[cam.brand]` without the nullish-coalescing fallback),
    // CameraGrid.tsx would throw
    //     TypeError: Cannot read properties of undefined (reading 'cls')
    // at render time and the dump would surface it.  This assertion
    // makes the root cause explicit in the failure message instead of
    // degrading to a 60s locator-timeout symptom (which is what T-RLS-11
    // was suffering through before the fix).
    //
    // We use the captured dump AS the pageerror source-of-truth rather
    // than attaching a redundant `page.on('pageerror', ...)` listener,
    // because captureConsoleAndNetwork already wires the listener of
    // record for the run and its dump is what the HTML report renders.
    // ============================================================
    const dumpStr = dump();
    const pageErrorLines = dumpStr
      .split('\n')
      // Match the exact format captureConsoleAndNetwork emits for pageerror
      // events (log-stream.ts: `[label] pageerror: <msg>`). Regex over
      // substring closes the false-positive surface where an unrelated
      // console.error message happens to mention "pageerror" historically.
      .filter((line) => /^\s*\[[^\]]+\]\s+pageerror:\s/i.test(line));
    expect(
      pageErrorLines,
      `unexpected [pageerror] during CameraGrid render — the BRAND (or sibling ` +
      `STATUS_META / SEVERITY / TYPE_META) fallback guard may have regressed. ` +
      `Captured errors:\n${JSON.stringify(pageErrorLines, null, 2)}\n\n` +
      `Expected: zero pageerror lines. Got: ${pageErrorLines.length}.\n` +
      `Original Bug E root cause was a TypeError reading 'cls' on undefined ` +
      `at CameraGrid.tsx:296 when ` +
      `BRAND[cam.brand] was indexed with a brand outside the 4-key literal.`,
    ).toEqual([]);

    // ============================================================
    // STEP 6: BRAND-badge display sanity check (informational —
    // proves the nullish-coalescing FALLBACK shape was actually
    // selected, not the pre-fix throwing path).
    // ============================================================
    await expect(
      page.getByTestId('camera-card').filter({ hasText: UNSUPPORTED_BRAND_LABEL }),
    ).toBeVisible({ timeout: 20_000 });
    process.stderr.write(
      `[bug-e-brand-divergence] brand_badge_visible=OK label="${UNSUPPORTED_BRAND_LABEL}"\n`,
    );

    // Post-cleanup lives in `test.afterAll` (registered above the test
    // function) so it runs even if an earlier assertion throws. The
    // pre-cleanup at STEP 1 remains the idempotent safety net for any
    // stale row left behind by a prior interrupted run.

    console.log(dumpStr);
  },
);
