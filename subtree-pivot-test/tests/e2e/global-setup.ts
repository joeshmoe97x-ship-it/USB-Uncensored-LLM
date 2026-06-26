import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

/**
 * Runs once before any spec. Provisions fcc7289-seeded fixture rows at three layers:
 *
 *   1. auth.users.viewer@omnisight.local  (admin auth via service-role; idempotent — tolerates 'already registered')
 *   2. public.profiles.role='viewer' for that user (covers the trigger-not-re-fired path on a re-run)
 *   3. public.camera_access(viewer -> Shared Cam) (idempotent — deletes any prior grant first to keep the
 *      test ordering deterministic regardless of which legacy run installed the row last)
 *
 * Why hoist: prior to this commit, T-RLS-5 in tests/e2e/auth-rls.spec.ts was the ONLY place that installed
 * the camera_access grant — done inline as part of step 3 in its test body. T-RLS-1..3 do not provision
 * fixtures themselves and previously cascade-skipped with 'viewer not seeded — run the main test first
 * to provision' whenever the spec order put them before T-RLS-5 (which is most orderings, since auth-rls
 * tests have no explicit ordering directives). After this hoist, T-RLS-1..5 can safely assume fixtures
 * are present at cold-start (admin via anon signUp below; viewer + grant via this service-role block).
 *
 * Local after seed.sql: every step below is a no-op (the rows already exist, our upserts hit
 * uniqueness constraints and fall through). The only environment where this matters is a fresh
 * `supabase start` where the camera_access grant + viewer profile row have not been bootstrapped.
 */
async function ensureViewerFixtures(service: SupabaseClient): Promise<void> {
  const VIEWER_EMAIL    = 'viewer@omnisight.local';
  const VIEWER_PASSWORD = 'viewer1234!';
  const SHARED_CAM_NAME = 'Shared Cam';
  const SHARED_CAM_ID   = '22222222-2222-2222-2222-222222222222';
  const VIEWER_USER_ID  = '33333333-3333-3333-3333-333333333333';

  // 1. Ensure auth.users row exists for viewer@omnisight.local (idempotent).
  const { error: createErr } = await service.auth.admin.createUser({
    email: VIEWER_EMAIL,
    password: VIEWER_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'viewer', display_name: 'viewer' },
  });
  if (createErr && !/already.*registered/i.test(createErr.message)) {
    throw new Error(`viewer auth.admin.createUser failed: ${createErr.message}`);
  }

  // 2. Ensure public.profiles row is role='viewer', status='active' (idempotent upsert).
  const { error: profErr } = await service
    .from('profiles')
    .upsert(
      { id: VIEWER_USER_ID, display_name: 'viewer', role: 'viewer', status: 'active' },
      { onConflict: 'id' },
    );
  if (profErr) throw new Error(`viewer profiles upsert failed: ${profErr.message}`);

  // 3. Ensure clean, deterministic camera_access grant: delete any prior row for this (camera,user)
  // pair, then re-insert. ON CONFLICT alone would preserve a stale `granted_by` or `granted_at`,
  // which can drift across reruns and confuse later variance checks. Single-statement atomic
  // delete+insert keeps the row collinear with the canonical VIEWER_USER_ID/SHARED_CAM_ID pair.
  const { error: caDelErr } = await service
    .from('camera_access')
    .delete()
    .eq('camera_id', SHARED_CAM_ID)
    .eq('user_id', VIEWER_USER_ID);
  if (caDelErr) throw new Error(`viewer camera_access delete failed: ${caDelErr.message}`);
  const { error: caInsErr } = await service
    .from('camera_access')
    .insert({ camera_id: SHARED_CAM_ID, user_id: VIEWER_USER_ID, granted_by: null });
  if (caInsErr && !/duplicate key|already exists/i.test(caInsErr.message)) {
    throw new Error(`viewer camera_access insert failed: ${caInsErr.message}`);
  }

  // Confirm the row we just installed is the one shared with the test (lane validation).
  const { data: cam, error: camErr } = await service
    .from('cameras')
    .select('name')
    .eq('id', SHARED_CAM_ID)
    .single();
  if (camErr || cam?.name !== SHARED_CAM_NAME) {
    throw new Error(
      `Shared Cam camera row mismatch: id=${SHARED_CAM_ID} name=${cam?.name} ` +
      `(expected ${SHARED_CAM_NAME}). Did supabase/seed.sql run?`
    );
  }
}

/**
 * Runs once before any spec. Signs up admin@omnisight.local via the anon client.
 *
 * The `options.data.role='admin'` explicit metadata defeats the `handle_new_auth_user()` DB trigger's
 * "first-user-becomes-admin" branch — because capture-v6.sh's Phase B.5 replays seed.sql before the
 * Playwright cold start, the viewer profile row is already in public.profiles by the time admin
 * signs up, so the trigger's `if not exists (select 1 from public.profiles)` check returns false
 * and the trigger falls through to its default `v_role := 'viewer'`. Forcing metadata.role='admin'
 * ensures the admin profile row is created with role='admin' regardless of profiles-table state.
 */
export default async function globalSetup() {
  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    throw new Error(
      'VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY ' +
      'must all be exported before tests.',
    );
  }
  const anonClient = createClient(url, anon, {
    realtime: { transport: ws as any },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: adminErr } = await anonClient.auth.signUp({
    email: 'admin@omnisight.local',
    password: 'admin123',
    options: { data: { role: 'admin', display_name: 'admin' } },
  });
  // `User already registered` is fine on a re-run; the trigger already fired.
  if (adminErr && !/already.*registered/i.test(adminErr.message)) {
    throw new Error(`admin signUp failed: ${adminErr.message}`);
  }

  // Hoisted fixture provisioning (T-RLS-1..3 independence): install viewer + camera_access
  // grant at cold-start so tests do not cascade-skip when their spec ordering runs them
  // before T-RLS-5. Idempotent — tolerates prior seed.sql replay and re-runs.
  const serviceClient = createClient(url, service, {
    realtime: { transport: ws as any },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await ensureViewerFixtures(serviceClient);
}
