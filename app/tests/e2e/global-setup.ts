import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

/**
 * Hoisted fixture provisioning for T-RLS-1..5 (auth-rls.spec.ts).
 *
 * Cold-start responsibilities of this global setup:
 *   1. Ensure the `viewer@omnisight.local` `auth.users` row exists
 *      (idempotent against capture-v6 re-runs).
 *   2. Ensure the `admin@omnisight.local` `auth.users` row exists, signed up via
 *      the ANON client with `options.data.role='admin'` so the
 *      `handle_new_auth_user()` DB trigger reads `admin` from raw_user_meta_data
 *      and writes the matching `public.profiles` row with role='admin'.
 *      (Forcing metadata defeats the trigger's "first-user-becomes-admin"
 *      fallback branch; without metadata, the trigger defaults to 'viewer'
 *      because capture-v6.sh Phase B.5 pre-installs the viewer profile via
 *      seed.sql replay BEFORE this setup runs.)
 *
 * Source of truth for the rest of the viewer fixture set:
 *
 *   - `public.profiles` for the viewer — written automatically by the
 *     `handle_new_auth_user()` trigger on auth.users INSERT, reading
 *     `role` from raw_user_meta_data (we pass `user_metadata:{role:'viewer'}`).
 *     IMPORTANT: a PostgREST INSERT/UPDATE/UPSERT to `public.profiles` from
 *     the service-role client FAILS with Postgres 42501 (permission denied),
 *     because the migration intentionally grants NO INSERT/UPDATE policy on
 *     that table — only the DB trigger may write there. That is why this
 *     setup does NOT call `service.from('profiles').upsert(...)`.
 *
 *   - The `(camera_id=22222222-..., user_id=33333333-...)` row in
 *     `public.camera_access` — pre-installed by `supabase/seed.sql` (replayed
 *     by capture-v6.sh Phase B.5 before any test runs); idempotent via
 *     `ON CONFLICT DO NOTHING`. This setup does NOT touch `camera_access`
 *     either, for the same reason (no INSERT policy is granted on that table
 *     in the migration).
 *
 * Why hoist (rather than letting T-RLS-5 own fixture creation like before):
 *   T-RLS-1..3 each call `viewerGetCameras(...)` / `viewerGetCameraAccess(...)` but
 *   do NOT provision the grant themselves — they cascade-skipped whenever the
 *   spec ordering put them before T-RLS-5. After this hoist, all five tests can
 *   run in any order.
 */
async function ensureViewerAuthRow(service: SupabaseClient): Promise<void> {
  const VIEWER_EMAIL    = 'viewer@omnisight.local';
  const VIEWER_PASSWORD = 'viewer1234!';
  const { error: createErr } = await service.auth.admin.createUser({
    email: VIEWER_EMAIL,
    password: VIEWER_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'viewer', display_name: 'viewer' },
  });
  if (createErr && !/already.*registered/i.test(createErr.message)) {
    throw new Error(`viewer auth.admin.createUser failed: ${createErr.message}`);
  }
}

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

  // Admin signUp (anon). `options.data.role='admin'` reaches the trigger as
  // raw_user_meta_data -> 'admin', bypassing the first-user bootstrap branch.
  const anonClient = createClient(url, anon, {
    realtime: { transport: ws as any },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: adminErr } = await anonClient.auth.signUp({
    email: 'admin@omnisight.local',
    password: 'admin123',
    options: { data: { role: 'admin', display_name: 'admin' } },
  });
  if (adminErr && !/already.*registered/i.test(adminErr.message)) {
    throw new Error(`admin signUp failed: ${adminErr.message}`);
  }

  // Viewer auth.users row (service-role). The handle_new_auth_user() trigger
  // reads `role:'viewer'` from user_metadata and writes the matching profile.
  const serviceClient = createClient(url, service, {
    realtime: { transport: ws as any },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await ensureViewerAuthRow(serviceClient);
}
