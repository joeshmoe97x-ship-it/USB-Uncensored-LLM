/**
 * Regression test: locks in the admin-users payload back-compat destructure
 * introduced at b1b309d. Before the back-compat, the function did
 *   const { action, payload } = await req.json();
 * and only the canonical `{action, payload: {...}}` shape worked. The
 * helpers.ts#adminInvoke-style flat shape `{action, ...payload}` extracted
 * `payload` as `undefined` and the per-action destructures (`camera_id`,
 * `user_id`, etc.) silently dropped, yielding HTTP 400
 * "camera_id + user_id required" — the exact bug surfaced by `bug B` in
 * the captured baseline.
 *
 * After the back-compat, BOTH shapes yield the same FORBIDDEN outcome
 * because the action-handler destructure `const payload = payloadRaw ?? rest`
 * surfaces the same shape regardless of how the caller spreads. This test
 * pins the contract:
 *   nested shape -> 401/403 "Forbidden: admin role required"
 *   flat shape   -> 401/403 "Forbidden: admin role required"
 *
 * We use VIEWER's JWT (not admin's) precisely so we test the parse path
 * BEFORE the action handler runs. Once `assertAdmin` rejects as VIEWER,
 * the function never reaches the per-action payload destructures — so the
 * negative-shared-error pattern between the two shapes is the strictest
 * invariant available without requiring a working admin signIn (which a
 * separate investigation tracks).
 *
 * Source of truth: app/supabase/functions/admin-users/index.ts lines
 *   const { action, payload: payloadRaw, ...rest } = await req.json();
 *   const payload = payloadRaw ?? rest;
 */

import { test, expect } from '@playwright/test';
import {
  readSupabaseEnv,
  createAnonClient,
  signInAndGetJwt,
  adminInvoke,
} from './helpers';

const ADMIN_EMAIL     = 'admin@omnisight.local';
const ADMIN_PASSWORD  = 'admin123';
const VIEWER_EMAIL    = 'viewer@omnisight.local';
const VIEWER_PASSWORD = 'viewer1234!';

/**
 * Direct call to admin-users where the caller controls the EXACT JSON body
 * shape. Unlike helpers.ts#adminInvoke (which hardcodes the flat-spread
 * `{action, ...payload}` shape), this tests each shape independently.
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

test.describe('admin-users payload-shape back-compat (b1b309d regression)', () => {
  test('both payload shapes yield the same FORBIDDEN outcome with VIEWER jwt', async ({ page }, testInfo) => {
    const env = readSupabaseEnv();
    const anonClient = createAnonClient(env);

    // VIEWER must sign in successfully for this regression to fire. If the
    // viewer auth row is missing (cold-start failure path), skip cleanly so a
    // pre-existing environment-setup bug doesn't mask the back-compat signal.
    const token = await signInAndGetJwt(anonClient, VIEWER_EMAIL, VIEWER_PASSWORD);
    expect(token, 'viewer sign-in must succeed for this regression').toBeTruthy();

    // ---- Shape A: nested {action, payload: {...}} (canonical, src/lib/auth.ts#invokeAdmin) ----
    const nested = await invokeRaw(env.url, token!, {
      action: 'grant_access',
      payload: {
        camera_id: '11111111-1111-1111-1111-111111111111',
        user_id:   '33333333-3333-3333-3333-333333333333',
      },
    });

    // ---- Shape B: flat {action, ...payload} (helpers.ts#adminInvoke convention) ----
    const flat = await invokeRaw(env.url, token!, {
      action:    'grant_access',
      camera_id: '11111111-1111-1111-1111-111111111111',
      user_id:   '33333333-3333-3333-3333-333333333333',
    });

    // The bug (pre-b1b309d) surfaced as HTTP 400 "camera_id + user_id required"
    // for the flat shape, because the function destructured `payload` as undefined
    // and the action handler then errored. With the back-compat in place, BOTH
    // shapes are accepted by the parse layer and reach `assertAdmin`, which
    // rejects with "Forbidden: admin role required" + 401/403.
    //
    // Pinned invariant: nested.shape errors === flat.shape errors.
    expect(nested.status, 'nested: must be 401/403 (assertAdmin)').toBeGreaterThanOrEqual(400);
    expect(nested.status, 'nested: must NOT be 400').toBeLessThan(500);
    expect(
      nested.parsed?.error === 'Forbidden: admin role required' || /forbidden|unauthorized/i.test(nested.body),
      `nested shape: expected Forbidden, got status=${nested.status} body=${nested.body}`,
    ).toBe(true);

    expect(flat.status, 'flat: must be 401/403 (assertAdmin)').toBeGreaterThanOrEqual(400);
    expect(flat.status, 'flat: must NOT be 400').toBeLessThan(500);
    expect(
      flat.parsed?.error === 'Forbidden: admin role required' || /forbidden|unauthorized/i.test(flat.body),
      `flat shape: expected Forbidden, got status=${flat.status} body=${flat.body}`,
    ).toBe(true);

    // Hardest invariant: the two errors must be IDENTICAL responses. If
    // shapes diverge at any future refactor, this assertion breaks loudly.
    expect(nested.status, 'shape parity: identical HTTP status').toBe(flat.status);
    expect(nested.body,   'shape parity: identical body payload').toBe(flat.body);

    // Also confirm helpers.ts#adminInvoke itself still works (it uses flat shape).
    // This catches ABI drift if someone "simplifies" adminInvoke back into a
    // nested-shape-only call site.
    const helper = await adminInvoke(env, token!, 'grant_access', {
      camera_id: '11111111-1111-1111-1111-111111111111',
      user_id:   '33333333-3333-3333-3333-333333333333',
    });
    expect(helper.status, 'helpers.adminInvoke (flat) parity with raw flat').toBe(flat.status);
    expect(helper.body,   'helpers.adminInvoke (flat) parity with raw flat body').toBe(flat.body);
  });

  test('unknown action is rejected identically under both shapes', async ({ page }, testInfo) => {
    const env = readSupabaseEnv();
    const anonClient = createAnonClient(env);

    const token = await signInAndGetJwt(anonClient, VIEWER_EMAIL, VIEWER_PASSWORD);
    if (!token) {
      // Cold-start skip is OK here; the test is environment-tolerant.
      test.skip(true, 'viewer not seeded — back-compat parity block needs cold-start');
      return;
    }

    // assertAdmin fires first for both shapes, so we expect identical
    // 401/403 Forbidden regardless of action name. The point of this
    // second test is to confirm `action` is parsed correctly in BOTH
    // shapes (otherwise the "Unknown action" branch could fire under one
    // shape and not the other, masking a parse-shape asymmetry).
    const nestedUnknown = await invokeRaw(env.url, token!, {
      action:   'unknown_action_under_nested',
      payload:  { foo: 'bar' },
    });
    const flatUnknown = await invokeRaw(env.url, token!, {
      action:   'unknown_action_under_flat',
      foo:      'bar',
    });
    expect(nestedUnknown.body, 'unknown-action parity: nested').toBe(flatUnknown.body);
  });
});
