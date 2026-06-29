import { test, expect } from '@playwright/test';
import { captureConsoleAndNetwork } from './log-stream';
import {
  readSupabaseEnv,
  createAnonClient,
  createServiceClient,
  signInAndGetJwt,
  adminInvoke,
} from './helpers';

const ADMIN_EMAIL     = 'admin@omnisight.local';
const ADMIN_PASSWORD  = 'admin123';
const VIEWER_EMAIL    = 'viewer@omnisight.local';
const VIEWER_PASSWORD = 'viewer1234!';
const SHARED_CAM      = 'Shared Cam';
const PRIVATE_CAM     = 'Admin Private Cam';

test.describe('Supabase auth + RLS isolation', () => {
  test.describe('Viewer isolation paths', () => {

  /**
   * @testId T-RLS-1 (split: admin sign-in sees both)
   * @scenario positive
   * @description admin sign-in: SHARED_CAM + PRIVATE_CAM both visible under is_admin() RLS
   * @prerequisites admin session (provisioned by tests/e2e/global-setup.ts ensureAdminAuthRow)
   *
   * Splits out of the prior monolithic T-RLS-1 (which combined admin+viewer flows
   * in a single test body) because the combined flow was hitting the 60s
   * Playwright global timeout in _baseline-run.json aggregate across two
   * consecutive capture-v6.sh runs: the bottleneck was the `.toHaveCount(0)`
   * PRIV assertion (no explicit timeout) that, if a state-bleed persisted
   * across the in-test sign-out sequence, would consume the rest of the test
   * budget as a generic 60s timedOut, masking the actual AssertionError. Each
   * split-half now has a hermetic browser execution context (no in-test
   * sign-out hop), eliminating the cache/state-bleed failure mode.
   *
   * Both halves are read-only assertions on static seed data -- safe to run in
   * parallel; no `test.describe.configure({ mode: 'serial' })` required.
   */
  test('admin sign-in: sees both SHARED_CAM and PRIVATE_CAM', async ({ page }, testInfo) => {
    const dump = captureConsoleAndNetwork(page, testInfo.title);

    // ------- Admin sign-in (no pre-admin state to bleed over) -------
    await page.goto('/');
    // Defensive: assert login form is visible BEFORE the first .fill() so a missing/never-painted
    // element fails fast at the explicit 10s locator timeout instead of a generic 60s test timeout.
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('login-email-input').fill(ADMIN_EMAIL);
    await page.getByTestId('login-password-input').fill(ADMIN_PASSWORD);
    await page.getByTestId('login-submit').click();

    // admin sees BOTH cameras via is_admin() RLS
    await expect(page.getByTestId('camera-card').filter({ hasText: SHARED_CAM }))
      .toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('camera-card').filter({ hasText: PRIVATE_CAM }))
      .toBeVisible({ timeout: 20_000 });

    console.log(dump());
  });

  /**
   * @testId T-RLS-1 (split: viewer sign-in sees only shared)
   * @scenario positive
   * @description viewer sign-in: sees SHARED_CAM under camera_access grant;
   *              does NOT see PRIVATE_CAM under RLS
   * @prerequisites viewer session; Shared Cam camera_access grant
   *
   * Splits out of the prior monolithic T-RLS-1 to give the viewer a hermetic
   * browser execution context (no in-test sign-out hop) so a state bleed from
   * the admin session can't linger. The `.toHaveCount(0)` PRIVATE_CAM assertion
   * gets an EXPLICIT 20s timeout so a future real RLS leak fails fast as
   * AssertionError("expected to have count 0, got N") rather than the generic
   * 60s global timedOut that masked the actual signal in the T-RLS-1
   * monolithic flow. The 20s matches the SHARED_CAM `.toBeVisible` window
   * so RLS filtering has the same budget as the visibility assertion; the
   * two timeouts degrade predictably together.
   */
  test('viewer sign-in: sees SHARED_CAM only (RLS isolation)', async ({ page }, testInfo) => {
    // Bump per-test timeout to 90s. Signaling chain ≈ 10s login form + 20s SHARED_CAM
    // + 20s PRIVATE_CAM + page.goto + fills/log ≈ 55-57s nominal; the 30s headroom absorbs
    // cold Vite/kong edge-fn starts without changing the failure-mode-leak detection
    // that the surgical 20s `.toHaveCount(0)` timeout still provides.
    test.setTimeout(90_000);
    const dump = captureConsoleAndNetwork(page, testInfo.title);

    const env = readSupabaseEnv();
    const admin = createServiceClient(env);
    // Fixtures installed at cold-start by tests/e2e/global-setup.ts's ensureViewerAuthRow + supabase/seed.sql (Phase B.5 replay); informational only.
    const { data: existingViewer } = await admin
      .from('profiles').select('id, role').eq('email', VIEWER_EMAIL).maybeSingle();
    console.log(`[T-RLS-1 viewer] fixtures_present=${!!existingViewer?.id} viewer.role=${existingViewer?.role ?? 'none'}`);

    // ------- Direct viewer sign-in (no preceding admin session) -------
    await page.goto('/');
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('login-email-input').fill(VIEWER_EMAIL);
    await page.getByTestId('login-password-input').fill(VIEWER_PASSWORD);
    await page.getByTestId('login-submit').click();

    // ------- RLS isolation assertions -------
    await expect(page.getByTestId('camera-card').filter({ hasText: SHARED_CAM }))
      .toBeVisible({ timeout: 20_000 });
    // Surgical 20s timeout -- the prior monolithic used the global 60s default which masked RLS-leak signals.
    await expect(page.getByTestId('camera-card').filter({ hasText: PRIVATE_CAM }))
      .toHaveCount(0, { timeout: 20_000 });

    console.log(dump());
  });

  });

  test.describe('Unauthorized denial paths', () => {

  /**
   * @testId T-RLS-2
   * @scenario negative
   * @description unauthorized callers denied at admin-users endpoint
   * @prerequisites non-admin session; seeded admin-users endpoint
   */
  test('viewer cannot create users via admin-users edge function', async ({ page }, testInfo) => {
    const dump = captureConsoleAndNetwork(page, testInfo.title);

    const env = readSupabaseEnv();
    const anonClient = createAnonClient(env);

    // Acquire VIEWER's JWT via direct anon sign-in.
    const token = await signInAndGetJwt(anonClient, VIEWER_EMAIL, VIEWER_PASSWORD);
    if (!token) {
      // If the viewer doesn't exist yet (first-run ordering), skip rather than fail.
      console.log(`[${testInfo.title}] skip: viewer sign-in failed`);
      console.log(dump());
      test.skip(true, 'viewer not seeded — run the main test first to provision');
      return;
    }

    // Attempt privileged operation: create an admin user as a viewer.
    const { status, body, parsed } = await adminInvoke(env, token, 'create_user', {
      email: 'should-not-create@omnisight.local',
      password: 'noop12345!',
      role: 'admin',
      display_name: 'Should Not Exist',
    });

    // The admin-users function returns { ok: false, error: '...' } with HTTP
    // 401/403 when the caller's JWT is not admin, OR throws before RLS check.
    // We require BOTH a non-2xx status AND an explicit ok:false/plain-text
    // rejection — a 200 + ok:true response would mean the user was actually
    // created (a security violation), so we intentionally do NOT match the
    // word 'admin' in the body to avoid false positives on innocuous text.
    const isRejected =
      status >= 400 &&
      (parsed?.ok === false || /denied|forbidden|unauthorized|prohibited/i.test(body));
    expect(
      isRejected,
      `Expected admin-users to reject viewer; got status=${status} body=${body}`,
    ).toBeTruthy();

    console.log(dump());
  });

  });

  test.describe('Admin grant-revoke life-cycles', () => {
  // Tests T-RLS-3..5 share `camera_access` rows on the same (VIEWER_EMAIL, PRIVATE_CAM) pair.
  // Configure serial here so a future `workers>=2` bump cannot trip a row race.
  test.describe.configure({ mode: 'serial' });

  /**
   * @testId T-RLS-3
   * @scenario positive
   * @description admin grant transitions target user to elevated access
   * @prerequisites admin session; targeted standard user id
   */
  test('admin can grant viewer access via admin-users grant_access action', async ({ page }, testInfo) => {
    const dump = captureConsoleAndNetwork(page, testInfo.title);

    const env = readSupabaseEnv();
    const anonClient = createAnonClient(env);

    // 1. Sign in as admin via the anon client to obtain an admin JWT.
    const adminToken = await signInAndGetJwt(anonClient, ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!adminToken) {
      console.log(`[${testInfo.title}] skip: admin sign-in failed`);
      console.log(dump());
      test.skip(true, 'admin not seeded — run the main test first to provision');
      return;
    }

    // 2. Look up viewer + camera via service_role (admin's anon JWT doesn't
    //    bypass RLS for reads).
    const serviceClient = createServiceClient(env);
    const { data: viewer, error: viewErr } = await serviceClient
      .from('profiles').select('id').eq('role', 'viewer').single();
    if (viewErr || !viewer) {
      console.log(`[${testInfo.title}] skip: viewer not seeded — run main test first`);
      console.log(dump());
      test.skip(true, 'viewer not seeded — run the main test first to provision');
      return;
    }
    const { data: cam, error: camErr } = await serviceClient
      .from('cameras').select('id').eq('name', PRIVATE_CAM).single();
    expect(camErr).toBeNull();
    expect(cam).toBeTruthy();

    // 3. Reset any prior grant so the test starts from a known baseline.
    await serviceClient
      .from('camera_access')
      .delete()
      .eq('user_id', viewer!.id)
      .eq('camera_id', cam!.id);

    // 4. Invoke admin-users grant_access with admin's JWT — exercises the
    //    admin-role guard inside the Edge Function (must accept admin calls).
    const { status, body, parsed } = await adminInvoke(env, adminToken, 'grant_access', {
      user_id: viewer!.id,
      camera_id: cam!.id,
    });

    // Require a definitive success signal: status 200 AND explicit {ok:true}.
    // (Dropping the prior permissive `parsed === null` fallback eliminates the
    // false-positive surface where a JSON-literal `"null"` body or a plain-text
    // 200 reply would pass the gate without confirming admin-users actually
    // granted access.)
    const accepted = status === 200 && parsed?.ok === true;
    expect(
      accepted,
      `Expected admin-users grant_access to accept admin; got status=${status} body=${body}`,
    ).toBeTruthy();

    // 5. Verify the camera_access row is now present in the DB.
    const { data: granted, error: gErr } = await serviceClient
      .from('camera_access')
      .select('user_id, camera_id')
      .eq('user_id', viewer!.id)
      .eq('camera_id', cam!.id)
      .maybeSingle();
    expect(gErr).toBeNull();
    expect(granted).toBeTruthy();

    console.log(dump());
  });

  /**
   * @testId T-RLS-4
   * @scenario positive
   * @description admin revoke + post-revoke RLS enforces downgrade
   * @prerequisites admin session; targeted user with prior elevated access
   */
  test('admin can revoke viewer access via admin-users revoke_access action; viewer denied at RLS post-revoke', async ({ page }, testInfo) => {
    const dump = captureConsoleAndNetwork(page, testInfo.title);

    const env = readSupabaseEnv();
    const anonClient = createAnonClient(env);
    const serviceClient = createServiceClient(env);

    // 1. Sign in as admin via the anon client to obtain an admin JWT.
    const adminToken = await signInAndGetJwt(anonClient, ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!adminToken) {
      console.log(`[${testInfo.title}] skip: admin sign-in failed`);
      console.log(dump());
      test.skip(true, 'admin not seeded \u2014 run the main test first to provision');
      return;
    }

    // 2. Look up viewer + camera via service_role.
    const { data: viewer, error: viewErr } = await serviceClient
      .from('profiles').select('id').eq('role', 'viewer').single();
    if (viewErr || !viewer) {
      console.log(`[${testInfo.title}] skip: viewer not seeded \u2014 run main test first`);
      console.log(dump());
      test.skip(true, 'viewer not seeded \u2014 run the main test first to provision');
      return;
    }
    const { data: cam, error: camErr } = await serviceClient
      .from('cameras').select('id').eq('name', PRIVATE_CAM).single();
    expect(camErr).toBeNull();
    expect(cam).toBeTruthy();

    // 3. Setup (idempotent): grant viewer access to PRIVATE_CAM via
    //    service-role insert. Resets any prior row so the baseline RLS check
    //    below starts from a known state. We use direct insert rather than
    //    a second admin-users grant_access call because the focus of this
    //    test is the revoke path, not the grant path.
    await serviceClient
      .from('camera_access')
      .delete()
      .eq('user_id', viewer!.id)
      .eq('camera_id', cam!.id);
    await serviceClient.from('camera_access').insert({
      user_id: viewer!.id,
      camera_id: cam!.id,
    });

    // 4. Pre-revoke RLS check: as the viewer (fresh anon client so its JWT
    //    is isolated from any earlier session in this test), PRIVATE_CAM
    //    SHOULD be visible at the data layer.
    const preClient = createAnonClient(env);
    const preJwt = await signInAndGetJwt(preClient, VIEWER_EMAIL, VIEWER_PASSWORD);
    if (!preJwt) {
      console.log(`[${testInfo.title}] skip: viewer sign-in failed during pre-revoke check`);
      console.log(dump());
      test.skip(true, 'viewer not seeded \u2014 run the main test first to provision');
      return;
    }
    const { data: preCam, error: preErr } = await preClient
      .from('cameras').select('id, name').eq('name', PRIVATE_CAM).maybeSingle();
    expect(preErr).toBeNull();
    expect(
      preCam,
      'baseline: viewer should see PRIVATE_CAM after service-role insert',
    ).toBeTruthy();

    // 5. Admin invokes admin-users revoke_access with admin's JWT.
    const { status, body, parsed } = await adminInvoke(env, adminToken, 'revoke_access', {
      user_id: viewer!.id,
      camera_id: cam!.id,
    });
    // Strict accept gate same as test 3's grant check: status 200 AND
    // explicit {ok:true}. Dropping the `parsed === null` fallback is
    // intentional \u2014 a 200 + 'null' body proves nothing was actually revoked.
    const revoked = status === 200 && parsed?.ok === true;
    expect(
      revoked,
      `Expected admin-users revoke_access to accept admin; got status=${status} body=${body}`,
    ).toBeTruthy();

    // 6. DB-side verification: the camera_access row should be GONE.
    const { data: row, error: rErr } = await serviceClient
      .from('camera_access')
      .select('user_id, camera_id')
      .eq('user_id', viewer!.id)
      .eq('camera_id', cam!.id)
      .maybeSingle();
    expect(rErr).toBeNull();
    expect(
      row,
      'camera_access row should be deleted after admin-users revoke_access',
    ).toBeNull();

    // 7. Post-revoke RLS check: as the viewer (yet another fresh anon client
    //    to avoid shared in-memory session state), PRIVATE_CAM should be
    //    filtered out by RLS now that the camera_access row is gone.
    const postClient = createAnonClient(env);
    const postJwt = await signInAndGetJwt(postClient, VIEWER_EMAIL, VIEWER_PASSWORD);
    if (!postJwt) {
      console.log(`[${testInfo.title}] skip: viewer sign-in failed during post-revoke check`);
      console.log(dump());
      test.skip(true, 'viewer disappeared mid-test \u2014 investigate seed.sql ordering');
      return;
    }
    const { data: postCam, error: postErr } = await postClient
      .from('cameras').select('id, name').eq('name', PRIVATE_CAM).maybeSingle();
    expect(postErr).toBeNull();
    expect(
      postCam,
      'post-revoke: viewer should NOT see PRIVATE_CAM at RLS level',
    ).toBeNull();

    console.log(dump());
  });

  /**
   * @testId T-RLS-5
   * @scenario smoke
   * @description denial/grant/revoke round-trip under realistic load
   * @prerequisites admin session; smoke-target user id
   */
  test('fast-flow: viewer-denied grant + admin grants + admin revokes (baseline asserts covered by tests 1\u20134)', async ({ page }, testInfo) => {
    const dump = captureConsoleAndNetwork(page, testInfo.title);

    const env = readSupabaseEnv();
    const anonClient = createAnonClient(env);
    const serviceClient = createServiceClient(env);

    // 1. Admin sign-in (reused for grant + revoke steps).
    const adminToken = await signInAndGetJwt(anonClient, ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!adminToken) {
      console.log(`[${testInfo.title}] skip: admin sign-in failed`);
      console.log(dump());
      test.skip(true, 'admin not seeded \u2014 run the main test first to provision');
      return;
    }

    // 2. Viewer sign-in (reused for the denial step).
    const viewerToken = await signInAndGetJwt(anonClient, VIEWER_EMAIL, VIEWER_PASSWORD);
    if (!viewerToken) {
      console.log(`[${testInfo.title}] skip: viewer sign-in failed`);
      console.log(dump());
      test.skip(true, 'viewer not seeded \u2014 run the main test first to provision');
      return;
    }

    // 3. ID lookups — done ONCE here and shared across all 3 admin-users
    //    calls so we don't repeat the SELECT round-trips that tests 2/3/4
    //    do individually. (Net ~3 DB queries saved under cached stack.)
    const { data: viewer, error: viewErr } = await serviceClient
      .from('profiles').select('id').eq('role', 'viewer').single();
    if (viewErr || !viewer) {
      console.log(`[${testInfo.title}] skip: viewer profile not seeded`);
      console.log(dump());
      test.skip(true, 'viewer profile not seeded \u2014 run the main test first to provision');
      return;
    }
    const { data: cam, error: camErr } = await serviceClient
      .from('cameras').select('id').eq('name', PRIVATE_CAM).single();
    if (camErr || !cam) {
      console.log(`[${testInfo.title}] skip: PRIVATE_CAM not seeded`);
      console.log(dump());
      test.skip(true, 'PRIVATE_CAM not seeded');
      return;
    }

    // 4. Reset to a clean baseline (idempotent). Skips the GRANTED-row
    //    pre-check (test 3) AND the RLS-level pre-check (test 4) — both
    //    are covered elsewhere, so test 5 just asserts per-step HTTP shape.
    await serviceClient
      .from('camera_access')
      .delete()
      .eq('user_id', viewer!.id)
      .eq('camera_id', cam!.id);

    // 5. STEP A — viewer attempts grant_access with their JWT. Gates:
    //    status >= 400 AND (parsed?.ok===false OR rejection-phrase body).
    //    Mirrors test 2's tightened conjunctive.
    const denied = await adminInvoke(env, viewerToken!, 'grant_access', {
      user_id: viewer!.id,
      camera_id: cam!.id,
    });
    expect(
      denied.status >= 400 &&
        (denied.parsed?.ok === false ||
          /denied|forbidden|unauthorized|prohibited/i.test(denied.body)),
      `step A (viewer-grant): expect rejection; got status=${denied.status} body=${denied.body}`,
    ).toBeTruthy();

    // 6. STEP B — admin grants with admin's JWT. Strict accept gate
    //    (status 200 AND parsed.ok===true, no permissive parsed===null
    //    fallback — same shape as test 3's grant gate).
    const granted = await adminInvoke(env, adminToken, 'grant_access', {
      user_id: viewer!.id,
      camera_id: cam!.id,
    });
    expect(
      granted.status === 200 && granted.parsed?.ok === true,
      `step B (admin-grant): expect accept; got status=${granted.status} body=${granted.body}`,
    ).toBeTruthy();

    // 7. STEP C — admin revokes with admin's JWT. Same strict accept gate
    //    as step B. After the just-aligned response contract the OK body
    //    also carries `revoked_at`, but the gate only requires ok:true.
    const revoked = await adminInvoke(env, adminToken, 'revoke_access', {
      user_id: viewer!.id,
      camera_id: cam!.id,
    });
    expect(
      revoked.status === 200 && revoked.parsed?.ok === true,
      `step C (admin-revoke): expect accept; got status=${revoked.status} body=${revoked.body}`,
    ).toBeTruthy();

    // (No DB-side row presence/absence checks here — tests 3 and 4 cover
    // those surfaces with stricter gates; this run is a flow-level smoke.)
    console.log(dump());
  });
  });

});
