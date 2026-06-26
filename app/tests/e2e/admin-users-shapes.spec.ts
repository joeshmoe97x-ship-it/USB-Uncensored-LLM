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
 * one don't have to instantiate it again. */
async function cleanupTargetRow(
  env: ReturnType<typeof readSupabaseEnv>,
  service?: ReturnType<typeof createServiceClient>,
) {
  const svc = service ?? createServiceClient(env);
  await svc
    .from('camera_access')
    .delete()
    .eq('camera_id', PRIVATE_CAM_ID)
    .eq('user_id',   VIEWER_PROFILE_ID);
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

    // ----- 3. The back-compat invariant: response envelope contract -----
    // Both shapes must yield byte-identical body. This is an explicit
    // response-envelope contract (the function returns
    // `return json({ ok: true });` on success with no dynamic fields), not
    // just shape-parity smoke — so any future "helpfully-added debugging
    // metadata field" on one shape regresses the test loudly.
    expect(nested.body, 'shape parity: byte-identical body').toBe(flat.body);

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
});
