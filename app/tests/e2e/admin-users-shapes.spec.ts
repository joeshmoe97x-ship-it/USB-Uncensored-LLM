/**
 * Regression test for the admin-users payload back-compat destructure at b1b309d.
 *
 * Before b1b309d the function did:
 *   const { action, payload } = await req.json();
 * and only the canonical `{action, payload: {...}}` shape worked. The flat
 * shape `{action, ...payload}` extracted `payload = undefined` and the
 * per-action destructures (`camera_id`, `user_id`) silently missed,
 * yielding HTTP 400 "camera_id + user_id required".
 *
 * After b1b309d the function does:
 *   const { action, payload: payloadRaw, ...rest } = await req.json();
 *   const payload = payloadRaw ?? rest;
 * and both shapes are equivalent at parse time.
 *
 * This test pins the invariant by actually exercising the parse path with
 * ADMIN's JWT (instead of VIEWER's — assertAdmin fires BEFORE the body
 * destruct for non-admin callers, so a prior VIEWER-only variant of this
 * test could only lock in the rejection path, not the parse-side contract).
 *
 * Source of truth: app/supabase/functions/admin-users/index.ts lines
 *   const { action, payload: payloadRaw, ...rest } = await req.json();
 *   const payload = payloadRaw ?? rest;
 * preceded by `await assertAdmin(req);`.
 *
 * Cold-start tolerance: when `signInAndGetJwt(ADMIN)` returns null (a
 * known capture-v6 cold-start issue tracked separately), this test MUST
 * skip with a `SKIP_COLDSTART:` sentinel so capture-v6.scrub_and_build.py
 * can distinguish "admin signIn cold-start bug" from "real test failure."
 */

import { test, expect } from '@playwright/test';
import {
  readSupabaseEnv,
  createAnonClient,
  createServiceClient,
  signInAndGetJwt,
  adminInvoke,
} from './helpers';

const ADMIN_EMAIL        = 'admin@omnisight.local';
const ADMIN_PASSWORD     = 'admin123';
const VIEWER_EMAIL       = 'viewer@omnisight.local';
const VIEWER_PASSWORD    = 'viewer1234!';
// Seed.sql hardcoded IDs — see app/supabase/seed.sql.
const PRIVATE_CAM_ID     = '11111111-1111-1111-1111-111111111111';
const VIEWER_PROFILE_ID  = '33333333-3333-3333-3333-333333333333';

/**
 * Direct call to admin-users where the caller controls the EXACT JSON body
 * shape. helpers.ts#adminInvoke hardcodes the flat-spread shape, so it
 * cannot be used to test the nested shape; we hit the endpoint directly.
 */
async function invokeRaw(
  url: string,
  jwt: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: string; parsed: Record<string, unknown> | null }> {
  const res = await fetch(`${url}/functions/v1/admin-users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: Record<string, unknown> | null = null;
  try { parsed = JSON.parse(text); } catch { /* non-JSON is allowed */ }
  return { status: res.status, body: text, parsed };
}

/** Idempotent row cleanup using service-role (bypasses any RLS). Accepts
 * an optional pre-allocated service client so callers that already have
 * one don't have to instantiate it again. NEVER throws — logs and
 * returns silently on both `{error}` (RLS denial / FK cascade / SQL
 * failure) and Promise rejection (network / GoTrue timeout) so a
 * future schema-change failure can't crash sibling test ordering
 * inside the suite's test.beforeAll/afterAll. Matches the
 * log+swallow parity of the new per-test fixture helpers below. */
async function cleanupTargetRow(
  env: ReturnType<typeof readSupabaseEnv>,
  service?: ReturnType<typeof createServiceClient>,
): Promise<void> {
  const svc = service ?? createServiceClient(env);
  try {
    const { error } = await svc
      .from('camera_access')
      .delete()
      .eq('camera_id', PRIVATE_CAM_ID)
      .eq('user_id',   VIEWER_PROFILE_ID);
    if (error) {
      console.log(
        `[admin-users-shapes] cleanupTargetRow(${PRIVATE_CAM_ID}, ${VIEWER_PROFILE_ID}) ` +
        `returned error: ${error.message}`,
      );
    }
  } catch (err) {
    console.log(
      `[admin-users-shapes] cleanupTargetRow(${PRIVATE_CAM_ID}, ${VIEWER_PROFILE_ID}) ` +
      `threw: ${(err as Error)?.message ?? err}`,
    );
  }
}

/**
 * Create a disposable fixture auth.users row via service-role so the
 * delete_user / revoke_access parse-path tests have a target id that
 * doesn't disturb the suite's shared admin + viewer fixtures. The
 * Date.now() + random suffix keeps parallel capture-v6 runs from
 * colliding on the unique auth.users.email constraint; throwing out
 * of here surfaces a real create failure rather than letting a
 * subsequent absent-fixture assertion mask the actual root cause.
 */
async function createDisposableUser(
  service: ReturnType<typeof createServiceClient>,
  tag: string,
): Promise<{ id: string; email: string; password: string }> {
  const email    = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@omnisight.local`;
  const password = `${tag}-${Math.random().toString(36).slice(2, 10)}!123`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: tag, role: 'viewer' },
  });
  if (error || !data?.user?.id) {
    throw new Error(
      `[admin-users-shapes] createDisposableUser(${tag}) failed: ` +
      `${error?.message ?? 'no user.id returned'}`,
    );
  }
  return { id: data.user.id, email, password };
}

/** Best-effort fixture teardown so a failed assertion never leaves an
 * orphan auth.users row behind even when the assertion path exits
 * abnormally. Returns silently; never throws. */
async function deleteFixtureUserQuietly(
  service: ReturnType<typeof createServiceClient>,
  id: string | undefined,
): Promise<void> {
  if (!id) return;
  try {
    await service.auth.admin.deleteUser(id);
  } catch (err) {
    console.log(
      `[admin-users-shapes] cleanup of fixture ${id} failed: ` +
      `${(err as Error)?.message ?? err}`,
    );
  }
}

/** Defence-in-depth camera_access cleanup scoped to one fixture user.
 * Same pattern as cleanupTargetRow but parameterised so the new tests
 * don't accidentally write into the suite-wide (PRIVATE_CAM, VIEWER)
 * row. Returns silently; never throws so the auth.users teardown that
 * runs AFTER this in the test's finally block can still execute even
 * if a future schema change makes this delete fail. */
async function cleanupFixtureGrant(
  service: ReturnType<typeof createServiceClient>,
  fixtureUserId: string | undefined,
  cameraId: string,
): Promise<void> {
  if (!fixtureUserId) return;
  const { error } = await service
    .from('camera_access')
    .delete()
    .eq('camera_id', cameraId)
    .eq('user_id',   fixtureUserId);
  if (error) {
    console.log(
      `[admin-users-shapes] cleaning camera_access(${cameraId}, ${fixtureUserId}) failed: ${error.message}`,
    );
  }
}

test.describe('admin-users payload-shape back-compat (b1b309d regression)', () => {
  // Serial mode: both tests share a single (camera_id, user_id) row, so we
  // must not let workers run them in parallel and double-insert (the unique
  // constraint would mask the second run's success with a duplicate-key
  // error, breaking the byte-identical body invariant).
  test.describe.configure({ mode: 'serial' });

  // Cleanup before + after — defense-in-depth so the test never leaves
  // a stray camera_access row in the DB, even on crash.
  test.beforeAll(async () => { await cleanupTargetRow(readSupabaseEnv()); });
  test.afterAll(async () =>  { await cleanupTargetRow(readSupabaseEnv()); });

  test('parse-path parity: nested + flat shapes both insert with byte-identical success', async () => {
    const env = readSupabaseEnv();
    const anonClient = createAnonClient(env);
    const adminToken = await signInAndGetJwt(anonClient, ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!adminToken) {
      // Sentinel prefix `SKIP_COLDSTART:` is visually grep-able in run
      // logs / Playwright JSON reporter output. Note that scrub_and_build
      // already differentiates skip from fail at the schema level
      // (Playwright emits `status: 'skipped'`), so the prefix is
      // informational rather than load-bearing for tooling.
      test.skip(true, 'SKIP_COLDSTART: admin auth unseeded -- cannot test admin-users parse path');
      return;
    }
    // Lift env + service once so the per-shape callsites don't repeat
    // readSupabaseEnv()/createServiceClient() four times each.
    const service = createServiceClient(env);

    // ----- 1. Nested shape: {action, payload: {...}} (canonical, src/lib/auth.ts#invokeAdmin) -----
    await cleanupTargetRow(env, service);
    const nested = await invokeRaw(env.url, adminToken, {
      action:  'grant_access',
      payload: { camera_id: PRIVATE_CAM_ID, user_id: VIEWER_PROFILE_ID },
    });
    expect(nested.status, 'nested grant_access must succeed (200)').toBe(200);
    expect(nested.parsed?.ok, 'nested parsed.ok must be true').toBe(true);

    // Verify nested actually inserted the row (proves the destructure
    // resolved camera_id + user_id correctly, not that the route ran).
    const { data: nestedRow } = await service
      .from('camera_access')
      .select('user_id, camera_id')
      .eq('camera_id', PRIVATE_CAM_ID)
      .eq('user_id',   VIEWER_PROFILE_ID)
      .maybeSingle();
    expect(nestedRow, 'nested shape: camera_access row must be inserted').toBeTruthy();

    // ----- 2. Flat shape: {action, ...payload} (helpers.ts#adminInvoke convention) -----
    await cleanupTargetRow(env, service);
    const flat = await invokeRaw(env.url, adminToken, {
      action:    'grant_access',
      camera_id: PRIVATE_CAM_ID,
      user_id:   VIEWER_PROFILE_ID,
    });
    expect(flat.status, 'flat grant_access must succeed (200)').toBe(200);
    expect(flat.parsed?.ok, 'flat parsed.ok must be true').toBe(true);

    const { data: flatRow } = await service
      .from('camera_access')
      .select('user_id, camera_id')
      .eq('camera_id', PRIVATE_CAM_ID)
      .eq('user_id',   VIEWER_PROFILE_ID)
      .maybeSingle();
    expect(flatRow, 'flat shape: camera_access row must be inserted').toBeTruthy();

    // ----- 3. Back-compat invariant: response envelope contract -----
    // grant_access + delete_user return `json({ ok: true })` with NO
    // dynamic fields, so byte-identical holds for them. Other actions
    // surface dynamic content (revoke_access's `revoked_at`,
    // create_user's `user_id`/`email`, update_user's `user`,
    // list_users_for_admin's `emails`) — keep THIS byte-identical
    // pattern scoped to grant_access + delete_user by design. The
    // sibling tests below extend coverage to revoke_access with a
    // DIFFERENT contract assertion shape that accounts for the
    // dynamic `revoked_at` ISO timestamp — NOT byte-identical per
    // design.
    expect(nested.body, 'shape parity: byte-identical body').toBe(flat.body);
    // Defense in depth — pin that the envelope is exactly `{ok: true}`
    // by counting keys. If a future debugging-refactor adds the SAME key
    // to BOTH shapes, the byte-identical check above would silently
    // pass; this catches it loudly.
    expect(Object.keys(nested.parsed ?? {}).length, 'envelope key count: nested must be exactly 1').toBe(1);
    expect(Object.keys(flat.parsed   ?? {}).length, 'envelope key count: flat must be exactly 1')  .toBe(1);

    // ----- 4. Sanity-check helpers.ts#adminInvoke itself -----
    // Helpers hardcodes the flat shape — make sure it still returns the
    // same shape as our raw flat invocation (catches ABI drift).
    await cleanupTargetRow(env, service);
    const helper = await adminInvoke(env, adminToken, 'grant_access', {
      camera_id: PRIVATE_CAM_ID,
      user_id:   VIEWER_PROFILE_ID,
    });
    expect(helper.status, 'helpers.adminInvoke: parity with raw flat status').toBe(flat.status);
    expect(helper.body,   'helpers.adminInvoke: parity with raw flat body'  ).toBe(flat.body);
  });

  /**
   * @testId T-SHAPE-DEL
   * @scenario positive
   * @description delete_user parse-path parity for nested + flat request bodies
   * @prerequisites admin JWT; service-role disposable fixture rows
   */
  test('parse-path parity for delete_user: nested + flat both delete fixture users with byte-identical success', async () => {
    const env = readSupabaseEnv();
    const anonClient = createAnonClient(env);
    const adminToken = await signInAndGetJwt(anonClient, ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!adminToken) {
      test.skip(true, 'SKIP_COLDSTART: admin auth unseeded -- cannot test admin-users parse path (delete_user)');
      return;
    }
    const service = createServiceClient(env);
    // Two disposable fixtures — one per shape, since the first call
    // deletes the auth row and a SECOND call on the same row would
    // "succeed" against a ghost id, masking a real destructure-break.
    // Random email + password suffix avoids collisions across repeated
    // capture-v6 runs.
    let nestedFixture: { id: string; email: string; password: string } | undefined;
    let flatFixture:   { id: string; email: string; password: string } | undefined;
    try {
      nestedFixture = await createDisposableUser(service, 'delete-shape-nested');
      flatFixture   = await createDisposableUser(service, 'delete-shape-flat');

      // ----- 1. Nested shape: {action, payload: {id}} -----
      const nested = await invokeRaw(env.url, adminToken, {
        action:  'delete_user',
        payload: { id: nestedFixture.id },
      });
      expect(nested.status, 'nested delete_user must succeed (200)').toBe(200);
      expect(nested.parsed?.ok, 'nested parsed.ok must be true').toBe(true);

      // Verify the auth.users row is GONE — proves the destructure
      // resolved `id` correctly, not just that the route returned ok.
      // (NB: relies on supabase-js v2.40+ where admin.getUserById
      // fetches directly from GoTrue, bypassing any client-side auth
      // cache. Pre-2.40 builds may return stale post-deleteUser rows;
      // switch to listUsers({perPage:200}) filtering for the deleted
      // email if downgrading.)
      expect(
        nestedRemaining?.user?.id,
        'nested shape: auth.users row must be deleted by admin-users delete_user',
      ).toBeUndefined();

      // ----- 2. Flat shape: {action, id} -----
      const flat = await invokeRaw(env.url, adminToken, {
        action: 'delete_user',
        id:     flatFixture.id,
      });
      expect(flat.status, 'flat delete_user must succeed (200)').toBe(200);
      expect(flat.parsed?.ok, 'flat parsed.ok must be true').toBe(true);

      // (version-pin note: see comment above the nested.getUserById call)
      const { data: flatRemaining } = await service.auth.admin.getUserById(flatFixture.id);
      expect(
        flatRemaining?.user?.id,
        'flat shape: auth.users row must be deleted by admin-users delete_user',
      ).toBeUndefined();

      // ----- 3. Back-compat invariant: response envelope contract -----
      // Same byte-identical + key-count pattern as grant_access —
      // {ok:true} only, no dynamic fields. See contract comment in the
      // grant_access test above for the full action-surface rationale.
      expect(nested.body, 'delete_user shape parity: byte-identical body').toBe(flat.body);
      expect(Object.keys(nested.parsed ?? {}).length, 'delete_user envelope key count: nested must be exactly 1').toBe(1);
      expect(Object.keys(flat.parsed   ?? {}).length, 'delete_user envelope key count: flat must be exactly 1')  .toBe(1);
    } finally {
      await deleteFixtureUserQuietly(service, nestedFixture?.id);
      await deleteFixtureUserQuietly(service, flatFixture?.id);
    }
  });

  /**
   * @testId T-SHAPE-REV
   * @scenario positive
   * @description revoke_access parse-path parity — envelopes match shape-by-shape,
   *              NOT byte-identical, because `revoked_at = new Date().toISOString()`
   *              differs across calls. Per user guidance: assert `parsed.ok === true`
   *              + `toHaveProperty('revoked_at')` separately for both shapes; layer
   *              timestamp-freshness + key-set parity + key-count parity on top as
   *              defence-in-depth against future debugging-refactor drift.
   * @prerequisites admin JWT; service-role seeded camera_access row
   */
  test('parse-path parity for revoke_access: nested + flat both surface ok+revoked_at; contract is shape-parallel, not byte-identical', async () => {
    const env = readSupabaseEnv();
    const anonClient = createAnonClient(env);
    const adminToken = await signInAndGetJwt(anonClient, ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!adminToken) {
      test.skip(true, 'SKIP_COLDSTART: admin auth unseeded -- cannot test admin-users parse path (revoke_access)');
      return;
    }
    const service = createServiceClient(env);

    // One disposable fixture user — both shapes revoke the SAME
    // camera_access row. supabase `.delete().eq().eq()` is "remove if
    // exists" idempotent (no error when zero rows match), so a single
    // fixture suffices and we verify the row is gone after BOTH calls.
    let fixture: { id: string; email: string; password: string } | undefined;
    const fixtureCameraId = PRIVATE_CAM_ID; // re-use the suite-wide private fixture camera
    try {
      fixture = await createDisposableUser(service, 'revoke-shape');

      // ----- 1. Seed a camera_access grant via service-role insert -----
      // SIDESTEP admin-users grant_access so this test's surface stays
      // orthogonal to the grant_access parse-path test above (which
      // already locks that path down). We also don't want a regression
      // in grant_access to mask a real revoke_access regression.
      await service.from('camera_access').delete()
        .eq('camera_id', fixtureCameraId)
        .eq('user_id',   fixture.id);
      // No `granted_by` field — mirrors tests/e2e/auth-rls.spec.ts T-RLS-4's
      // service-role seed insert pattern. camera_access.granted_by is
      // nullable + FK to profiles.id, but relying on auth.admin.createUser
      // → handle_new_auth_user() trigger racing the insert order is
      // brittle (we don't assert trigger timing here so we keep this
      // orthogonal to the revoke_access parse path under test).
      const { error: insErr } = await service.from('camera_access').insert({
        camera_id: fixtureCameraId,
        user_id:   fixture.id,
      });
      expect(insErr, 'fixture camera_access row must insert cleanly').toBeNull();

      // ----- 2. Nested shape: {action, payload: {camera_id, user_id}} -----
      const nested = await invokeRaw(env.url, adminToken, {
        action:  'revoke_access',
        payload: { camera_id: fixtureCameraId, user_id: fixture.id },
      });
      expect(nested.status, 'nested revoke_access must succeed (200)').toBe(200);

      // ----- 3. Flat shape: {action, camera_id, user_id} -----
      const flat = await invokeRaw(env.url, adminToken, {
        action:    'revoke_access',
        camera_id: fixtureCameraId,
        user_id:   fixture.id,
      });
      expect(flat.status, 'flat revoke_access must succeed (200)').toBe(200);

      // ----- 4. Envelope contract (NOT byte-identical — see header) ---
      // revoke_access returns `{ok:true, revoked_at:<ISO>}` where
      // `revoked_at = new Date().toISOString()` is regenerated per
      // request, so two sequential calls yield different timestamps.
      // The valuable invariant is therefore per-shape parity, not
      // body-string-equality.
      //   (a) ok must be true for both
      expect(nested.parsed?.ok, 'nested parsed.ok must be true').toBe(true);
      expect(flat.parsed?.ok,   'flat parsed.ok must be true')  .toBe(true);
      //   (b) revoked_at must be present for both (per user guidance)
      expect(nested.parsed, 'nested parsed must have revoked_at').toHaveProperty('revoked_at');
      expect(flat.parsed,   'flat parsed must have revoked_at')  .toHaveProperty('revoked_at');
      //   (c) revoked_at must be a recent ISO timestamp, not stale or hardcoded
      const now = Date.now();
      const nestedTs = Date.parse(String(nested.parsed?.revoked_at));
      const flatTs   = Date.parse(String(flat.parsed?.revoked_at));
      expect(
        Number.isFinite(nestedTs) && Math.abs(now - nestedTs) < 30_000,
        `nested revoked_at must be a recent ISO timestamp (got ${String(nested.parsed?.revoked_at)})`,
      ).toBe(true);
      expect(
        Number.isFinite(flatTs) && Math.abs(now - flatTs) < 30_000,
        `flat revoked_at must be a recent ISO timestamp (got ${String(flat.parsed?.revoked_at)})`,
      ).toBe(true);
      //   (d) key set + key count parity — defence in depth. If a future
      //       debugging-refactor adds e.g. `{ok, revoked_at, debug_field}`
      //       to ONE shape but not the other, the per-shape assertions
      //       above would pass individually but this would NOT.
      expect(
        Object.keys(nested.parsed ?? {}).sort().join(','),
        'revoke_access envelope key set must match across shapes',
      ).toBe(Object.keys(flat.parsed ?? {}).sort().join(','));
      expect(Object.keys(nested.parsed ?? {}).length, 'revoke_access envelope key count must be exactly 2 (nested)').toBe(2);
      expect(Object.keys(flat.parsed   ?? {}).length, 'revoke_access envelope key count must be exactly 2 (flat)')  .toBe(2);

      // ----- 5. DB-side verification: the camera_access row is gone -----
      const { data: postRow } = await service
        .from('camera_access')
        .select('user_id, camera_id')
        .eq('camera_id', fixtureCameraId)
        .eq('user_id',   fixture.id)
        .maybeSingle();
      expect(
        postRow,
        'fixture camera_access row must be deleted after both revoke_access calls',
      ).toBeNull();
    } finally {
      // Order matters here: delete the auth.users row FIRST so any FK
      // cascades / future downstream-cleanup logic runs even if the
      // camera_access row cleanup below logs+swallows an error.
      await deleteFixtureUserQuietly(service, fixture?.id);
      await cleanupFixtureGrant(service, fixture?.id, fixtureCameraId);
    }
  });

  test('rejection-path parity: VIEWER cannot grant_access under either shape', async () => {
    const env = readSupabaseEnv();
    const anonClient = createAnonClient(env);
    const viewerToken = await signInAndGetJwt(anonClient, VIEWER_EMAIL, VIEWER_PASSWORD);
    if (!viewerToken) {
      // Cold-start skip is OK here — this is a smoke test for the assertion
      // gate; it doesn't gate any downstream test the way the admin parse-path
      // test does.
      test.skip(true, 'SKIP_COLDSTART: viewer auth unseeded -- rejection-path parity is environment-tolerant');
      return;
    }
    const nested = await invokeRaw(env.url, viewerToken, {
      action:  'grant_access',
      payload: { camera_id: PRIVATE_CAM_ID, user_id: VIEWER_PROFILE_ID },
    });
    const flat = await invokeRaw(env.url, viewerToken, {
      action:    'grant_access',
      camera_id: PRIVATE_CAM_ID,
      user_id:   VIEWER_PROFILE_ID,
    });
    // assertAdmin fires before body destruct; both shapes yield the same
    // 401/403 Forbidden. Pin the byte-identical contract so any future
    // shape-dependent branch added BEFORE assertAdmin trips loudly.
    expect(nested.status, 'viewer must be rejected on nested shape').toBeGreaterThanOrEqual(400);
    expect(nested.status, 'viewer reject must NOT be 500').toBeLessThan(500);
    expect(flat.status,   'viewer must be rejected on flat shape'  ).toBeGreaterThanOrEqual(400);
    expect(flat.status,   'viewer reject must NOT be 500'         ).toBeLessThan(500);
    expect(nested.body,   'rejection parity: byte-identical body').toBe(flat.body);
  });

  /**
   * @testId T-REJ-DEL
   * @scenario negative
   * @description rejection-path coverage for delete_user under nested + flat
   *              request bodies. Mirrors the grant_access rejection test
   *              above (which this PR's first commit added). Uses a
   *              non-existent UUID so the test surface is purely the
   *              assertAdmin gate — no risk of accidentally deleting the
   *              suite's seeded viewer/admin if assertAdmin ever
   *              regressed to bypass.
   * @prerequisites viewer JWT
   */
  test('rejection-path parity: VIEWER cannot delete_user under either shape', async () => {
    // Fake UUID avoids any accidental-collision risk if assertAdmin
    // ever regressed to accept VIEWER — there is no auth.users row
    // at this id to delete, so the only observable signal at the
    // route level is "rejected before body destruct".
    const NONEXISTENT_USER_ID = '99999999-9999-9999-9999-999999999999';
    const env = readSupabaseEnv();
    const anonClient = createAnonClient(env);
    const viewerToken = await signInAndGetJwt(anonClient, VIEWER_EMAIL, VIEWER_PASSWORD);
    if (!viewerToken) {
      test.skip(true, 'SKIP_COLDSTART: viewer auth unseeded -- rejection-path parity is environment-tolerant (delete_user)');
      return;
    }
    const nested = await invokeRaw(env.url, viewerToken, {
      action:  'delete_user',
      payload: { id: NONEXISTENT_USER_ID },
    });
    const flat = await invokeRaw(env.url, viewerToken, {
      action: 'delete_user',
      id:     NONEXISTENT_USER_ID,
    });
    // assertAdmin fires before body destruct for both shapes; the
    // 403 Forbidden envelope must be byte-identical so any future
    // shape-dependent code path added BEFORE assertAdmin trips loudly.
    expect(nested.status, 'viewer must be rejected on nested shape (delete_user)').toBeGreaterThanOrEqual(400);
    expect(nested.status, 'viewer reject must NOT be 500 (delete_user)')         .toBeLessThan(500);
    expect(flat.status,   'viewer must be rejected on flat shape (delete_user)') .toBeGreaterThanOrEqual(400);
    expect(flat.status,   'viewer reject must NOT be 500 (delete_user)')         .toBeLessThan(500);
    expect(nested.body,   'rejection parity: byte-identical body (delete_user)').toBe(flat.body);
  });

  /**
   * @testId T-REJ-REV
   * @scenario negative
   * @description rejection-path coverage for revoke_access under nested +
   *              flat request bodies. Uses the suite-wide camera+viewer
   *              fixture pair so the test surface mirrors the
   *              grant_access rejection test above.
   * @prerequisites viewer JWT
   */
  test('rejection-path parity: VIEWER cannot revoke_access under either shape', async () => {
    const env = readSupabaseEnv();
    const anonClient = createAnonClient(env);
    const viewerToken = await signInAndGetJwt(anonClient, VIEWER_EMAIL, VIEWER_PASSWORD);
    if (!viewerToken) {
      test.skip(true, 'SKIP_COLDSTART: viewer auth unseeded -- rejection-path parity is environment-tolerant (revoke_access)');
      return;
    }
    const nested = await invokeRaw(env.url, viewerToken, {
      action:  'revoke_access',
      payload: { camera_id: PRIVATE_CAM_ID, user_id: VIEWER_PROFILE_ID },
    });
    const flat = await invokeRaw(env.url, viewerToken, {
      action:    'revoke_access',
      camera_id: PRIVATE_CAM_ID,
      user_id:   VIEWER_PROFILE_ID,
    });
    // assertAdmin fires before body destruct; both shapes yield the same
    // 403 Forbidden envelope. Byte-identical pin catches any future
    // shape-dependent branch added BEFORE assertAdmin.
    expect(nested.status, 'viewer must be rejected on nested shape (revoke_access)').toBeGreaterThanOrEqual(400);
    expect(nested.status, 'viewer reject must NOT be 500 (revoke_access)')           .toBeLessThan(500);
    expect(flat.status,   'viewer must be rejected on flat shape (revoke_access)')   .toBeGreaterThanOrEqual(400);
    expect(flat.status,   'viewer reject must NOT be 500 (revoke_access)')           .toBeLessThan(500);
    expect(nested.body,   'rejection parity: byte-identical body (revoke_access)')  .toBe(flat.body);
  });
});
