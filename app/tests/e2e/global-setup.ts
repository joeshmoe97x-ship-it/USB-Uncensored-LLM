import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

/**
 * Hoisted fixture provisioning for T-RLS-1..5 (auth-rls.spec.ts).
 *
 * Cold-start responsibilities of this global setup:
 *   1. Ensure the `viewer@omnisight.local` `auth.users` row exists
 *      (idempotent against capture-v6 re-runs); proven via seed.sql's
 *      ON CONFLICT DO NOTHING + the explicit re-create here.
 *   2. Ensure the `admin@omnisight.local` `auth.users` row exists, created
 *      via service-role `auth.admin.createUser({email_confirm: true})` so
 *      `email_confirmed_at` is non-null and `signInWithPassword` works in
 *      pw1's T-RLS-3..5 directly. The pre-fix path used
 *      `anonClient.auth.signUp` which leaves `email_confirmed_at` null by
 *      default — diagnostic showed `signInAndGetJwt(ADMIN)` returning null,
 *      cascading test.skip on T-RLS-3..5.
 *
 * Source of truth for the rest of the viewer fixture set:
 *
 *   - `public.profiles` for the viewer — written automatically by the
 *     `handle_new_auth_user()` trigger on auth.users INSERT, reading
 *     `role` from raw_user_meta_data. We pass `user_metadata:{role:'viewer'}`.
 *
 *   - The `(camera_id=22222222-..., user_id=33333333-...)` row in
 *     `public.camera_access` — pre-installed by `supabase/seed.sql` (replayed
 *     by capture-v6.sh Phase B.5 before any test runs); idempotent via
 *     `ON CONFLICT DO NOTHING`.
 *
 *   - For admin, the trigger reads `role:'admin'` from user_metadata and
 *     writes a matching `profiles` row. Important: seed.sql's Phase B.5
 *     already creates the viewer profile BEFORE this globalSetup runs, so
 *     the trigger's first-user-becomes-admin branch does NOT fire on admin
 *     creation. The role comes purely from `user_metadata:'admin'`.
 *
 * Why hoist (rather than letting T-RLS-5 own fixture creation like before):
 *   T-RLS-1..3 each call `viewerGetCameras(...)` / `viewerGetCameraAccess(...)`
 *   but do NOT provision the grant themselves — they cascade-skipped whenever
 *   the spec ordering put them before T-RLS-5. After this hoist, all five
 *   tests can run in any order.
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

/**
 * Ensure the admin@omnisight.local auth row exists with deterministic
 * password + email_confirm: true. Mirrors ensureViewerAuthRow's pattern,
 * but with a broader idempotency guard because:
 *
 *   - Phase F (fresh DB after Phase A wipe + Phase B supabase start):
 *     createUser succeeds with email_confirm: true. Returns null error.
 *   - Phase G within the same capture-v6 invocation (the admin row from
 *     Phase F persists across F→G): createUser returns an error matching
 *     the broader "already exists" family. We then listUsers to find the
 *     row's id and updateUserById to force password + email_confirm: true
 *     (in case the row was created by the older anon-signUp path which
 *     left email_confirmed_at null).
 *   - Across capture-v6 invocations (Phase A wipes DB so this shouldn't
 *     fire, but if it did): same idempotency applies.
 *
 * Critical: email_confirm: true must be set on the row, otherwise
 * signInAndGetJwt(ADMIN) returns null and T-RLS-3..5 cascade-skip. The
 * anon-signUp path (replaced here) defaults to email_confirm: false.
 */
async function ensureAdminAuthRow(service: SupabaseClient): Promise<void> {
  const ADMIN_EMAIL    = 'admin@omnisight.local';
  const ADMIN_PASSWORD = 'admin123';
  // Broader regex: supabase-go emits different phrasings across versions
  // ("already registered", "already exists", "user_already_exists"
  // code, "email_already_exists" code). All are benign in our context.
  const IDEMPOTENT_CREATE_USER_FAILURE = /(already.*registered|already.*exists|user_already_exists|email_already_exists)/i;

  const { data: createData, error: createErr } = await service.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,                 // CRITICAL: without this, T-RLS-3..5 signIn fails
    user_metadata: { role: 'admin', display_name: 'admin' },
  });

  // Diagnostic per T-RLS-3..5 investigation: print adminErr verbatim so
  // future maintainers see the exact Supabase auth error shape (was the
  // primary signal for the email_confirmed_at=null root cause).
  console.error('[globalSetup] adminErr=' + JSON.stringify(createErr));

  // Patch the public.profiles row with role='admin' + status='active'.
  // The handle_new_auth_user() trigger on auth.users INSERT reads
  // raw_user_meta_data->>'role' but defaults to role='viewer' when
  // public.profiles is already non-empty. seed.sql's Phase B.5 replay
  // pre-populates the viewer profile BEFORE globalSetup runs, so the
  // trigger's first-user-becomes-admin branch NEVER fires for admin;
  // without this explicit patch the admin row stays at role='viewer'
  // and assertAdmin returns 403 (cascading T-SHAPE-DEL/REV SKIP_COLDSTART
  // + T-RLS-3 403 failure + T-RLS-11 Shared Cam locator loss). The patch
  // is run on BOTH branches (fresh create + listUsers-recovery) so a
  // re-run that hits the recovery path also re-applies the role.
  async function patchAdminProfile(adminId: string, branch: 'create' | 'recovery'): Promise<void> {
    // .select('id') is REQUIRED for the row-count check below to work:
    // by default supabase-js returns data:null from .update() UNLESS chained
    // with .select(), which makes the SQL become `UPDATE ... RETURNING id`.
    // Without .select(), patchedRows is always null and the defensive
    // WARNING would fire even when the update succeeded.
    const { data: patchedRows, error: profileErr } = await service.from('profiles')
      .update({ role: 'admin', status: 'active' })
      .eq('id', adminId)
      .select('id');
    // patchedRows is now an array of {id} rows that matched (or [] if none).
    // The 0-rows case = trigger race or stale id (handle_new_auth_user hadn't
    // inserted the profiles row by the time we issued the UPDATE). Logging
    // the affected row count makes a future trigger-async-regression loudly
    // visible instead of silently leaving admin's role stuck at 'viewer'.
    const affected = patchedRows?.length ?? 0;
    if (profileErr) {
      console.error(`[globalSetup] admin profile patch (${branch} path) error: ${profileErr.message}`);
    } else if (affected === 0) {
      console.error(`[globalSetup] admin profile patch (${branch} path) WARNING: 0 rows updated -- trigger race or stale id`);
    } else {
      console.error(`[globalSetup] admin profile patch (${branch} path) OK: ${affected} row(s)`);
    }
  }

  if (!createErr) {
    const adminId = createData?.user?.id;
    if (!adminId) {
      throw new Error('globalSetup admin createUser returned null user.data without an error');
    }
    await patchAdminProfile(adminId, 'create');
    return;
  }
  if (IDEMPOTENT_CREATE_USER_FAILURE.test(createErr.message)) {
    // Idempotent recovery: listUsers to find the existing row, then
    // updateUserById to force password + email_confirm so the row matches
    // the test's expected auth state regardless of how it was originally
    // created. Preserves the row's UUID — important because T-RLS-3..5's
    // profiles FK references that UUID.
    const { data: listData, error: listErr } = await service.auth.admin.listUsers({ perPage: 200 });
    if (listErr) {
      throw new Error(`globalSetup admin listUsers failed: ${listErr.message}`);
    }
    const existingAdmin = (listData?.users ?? []).find((u) => u.email === ADMIN_EMAIL);
    if (!existingAdmin) {
      throw new Error(
        `globalSetup admin createUser reported "already registered" but listUsers returned no matching ` +
        `row; adminErr=${JSON.stringify(createErr)}`,
      );
    }
    const { error: updateErr } = await service.auth.admin.updateUserById(existingAdmin.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (updateErr) {
      throw new Error(`globalSetup admin updateUserById failed: ${updateErr.message}`);
    }
    console.error('[globalSetup] admin updateUserById OK; email_confirm + password forced');
    await patchAdminProfile(existingAdmin.id, 'recovery');
    return;
  }
  // Non-idempotent error: blow up.
  throw new Error(`admin auth.admin.createUser failed: ${createErr.message}`);
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

  // Both admin and viewer use the service-role client so they share
  // password + email_confirm semantics; the older anon-signUp path for
  // admin left email_confirmed_at null and tripped T-RLS-3..5 signIn.
  const serviceClient = createClient(url, service, {
    realtime: { transport: ws as any },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Admin setup — service-role createUser with email_confirm: true.
  await ensureAdminAuthRow(serviceClient);

  // 2. Viewer setup — service-role createUser (already-proven path).
  await ensureViewerAuthRow(serviceClient);
}
