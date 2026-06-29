// Thin wrapper around the Supabase JS client + admin Edge Function.
// App code should import from here, not from './supabase' directly, so it can
// be swapped out (mock for tests) without touching consumers.
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import type { Profile, UserRole } from '../types';

// ---------------------------- auth.session ------------------------------

export async function signIn(email: string, password: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession() {
  return supabase.auth.getSession();
}

// ----------------------- profile read/update ----------------------------

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export async function updateOwnProfile(patch: Partial<Profile>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');
  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (error) throw error;
}

// ---------------------- camera list (RLS-aware) -------------------------

export async function listCameras() {
  if (!SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase.from('cameras').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// -------------------- shared edge invoker -------------------------------

// Shared wrapper around `supabase.functions.invoke` extracted from
// `invokeAdmin` and `listUserEmails` so both call sites share one dual-mode
// network-vs-FunctionHttp error unwrap. With `fix(adminActions)` (8545185),
// six admin* wrappers (adminCreateUser / adminUpdateUser / adminDeleteUser /
// adminResetPassword / adminGrantAccess / adminRevokeAccess) all funnel
// through invokeAdmin, which delegates to invokeEdge here. `listUserEmails`
// delegates to invokeEdge directly (its body shape isn't an AdminAction
// variant — list_users_for_admin isn't in the discriminated union).
//
// T is the typed response shape; constraint `T extends { ok: boolean }` so
// the defensive `data ?? { ok: true }` fallback is always type-compatible.
// All current callers' typed envelopes satisfy this constraint because
// they all carry an `ok: boolean` (or `ok?: boolean` for envelope-flat
// successors).
//
// Error unwrap contract (preserved verbatim from the prior invokeAdmin
// implementation; this helper is the single source of truth):
//   - FunctionsFetchError or FunctionsRelayError (network layer) =>
//     throw "Edge Function \"<name>\" is not reachable" with the
//     local/remote serve hints (try-serve for local or deploy for prod).
//   - FunctionsHttpError (4xx with a JSON error body from the edge) =>
//     throw e.message verbatim so 400-action-not-found bubbles up as an
//     actionable, real response error.
//   - All other errors => throw e.message || 'Edge Function call failed.'
export async function invokeEdge<T extends { ok: boolean }>(
  name: string,
  body: Record<string, any>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const e = error as Error & { name?: string; context?: { status?: number } };
    const isFetchError = e.name === 'FunctionsFetchError' || e.name === 'FunctionsRelayError';
    const isNetwork = isFetchError || !e.context?.status;
    if (isNetwork) {
      throw new Error(
        `Edge Function "${name}" is not reachable. ` +
        `Run \`supabase functions serve ${name}\` (local) or ` +
        `\`supabase functions deploy ${name} --no-verify-jwt\` (remote).`,
      );
    }
    throw new Error(e.message || 'Edge Function call failed.');
  }
  return (data ?? { ok: true }) as T;
}

// -------------------- admin user mgmt via Edge --------------------------

export type AdminAction =
  | { action: 'create_user';   payload: { email: string; password: string; display_name?: string; role: UserRole } }
  | { action: 'update_user';   payload: { id: string; role?: UserRole; status?: 'active' | 'disabled'; password?: string; display_name?: string } }
  | { action: 'delete_user';   payload: { id: string } }
  | { action: 'grant_access';  payload: { camera_id: string; user_id: string } }
  | { action: 'revoke_access'; payload: { camera_id: string; user_id: string } };

export async function invokeAdmin(body: AdminAction): Promise<{ ok: boolean; [k: string]: unknown }> {
  // Thin delegation to invokeEdge; preserves the typed AdminAction union on
  // `body` (caller-facing API unchanged). The wide-typed return preserves
  // back-compat for the six admin* wrappers that cast `res as <Envelope>`.
  return invokeEdge<{ ok: boolean; [k: string]: unknown }>('admin-users', body);
}

// -------------------- admin-only helpers -------------------------------

// Typed response envelopes mirroring the edge function's happy-path JSON.
// Source-of-truth is app/supabase/functions/admin-users/index.ts lines 84 /
// 104 / 112 (create_user / update_user / delete_user respectively). Optional
// fields surfaced as `?` for parity with invokeAdmin's wide return.
//
// AdminUpdateUserResponse.user is typed as `Partial<Profile>` rather than
// the previous `unknown` so future consumer code can read shaped fields
// like res.user.email / res.user.role directly without an extra cast.
//
// IMPORTANT — fields present vs. NOT present in the response:
//   The edge function returns `{ ok: true, user: data.user }` where
//   `data.user` is a Supabase auth.User object lifted from
//   `adminClient.auth.admin.updateUserById(id, updates)`
//   (supabase/functions/admin-users/index.ts L104). Partial<Profile> is
//   used here as a consumption-friendly SUPERSET PROJECTION onto common
//   fields, NOT as a row-fidelity type. Consumers should treat res.user
//   as the INTERSECTION of <Supabase auth.User> and <Profile>:
//     Present on Supabase auth.User AND on Profile:
//       id (string), email (string | null — Supabase allows null for
//             phone-only auth)
//     Present only via user_metadata (Supabase user_metadata object
//       mirrors Profile fields by design — see admin-users/index.ts L78):
//         display_name (string), role (UserRole)
//     NOT present (Profile-only, lives on public.profiles SQL row, NOT
//       in Supabase auth.User): status, last_login_at, created_at
//     NOT present by design (Supabase-only, intentionally excluded from
//       the envelope): email_confirmed_at, phone, app_metadata, aud,
//       identities[], encrypted_password
//   All Profile fields are marked optional because the edge response is
//   partial by nature; consumers should narrow before reading.
export type AdminCreateUserResponse = { ok: boolean; user_id?: string; email?: string };
export type AdminUpdateUserResponse = { ok: boolean; user?: Partial<Profile> };
export type AdminDeleteUserResponse = { ok: boolean };
export type AdminGrantAccessResponse = { ok: boolean };
// revoke_access surfaces `revoked_at` (the request timestamp, NOT the row's
// persisted granted_at) per supabase/functions/admin-users/index.ts#L137.
// grant_access has no equivalent field yet; the `granted_at` symmetric
// extension is deferred.
export type AdminRevokeAccessResponse = { ok: boolean; revoked_at?: string };

export async function adminCreateUser(input: { email: string; password: string; display_name?: string; role: UserRole }): Promise<AdminCreateUserResponse> {
  const res = await invokeAdmin({ action: 'create_user', payload: input });
  return res as AdminCreateUserResponse;
}

export async function adminUpdateUser(id: string, patch: { role?: UserRole; status?: 'active' | 'disabled'; password?: string; display_name?: string }): Promise<AdminUpdateUserResponse> {
  const res = await invokeAdmin({ action: 'update_user', payload: { id, ...patch } });
  return res as AdminUpdateUserResponse;
}

export async function adminDeleteUser(id: string): Promise<AdminDeleteUserResponse> {
  const res = await invokeAdmin({ action: 'delete_user', payload: { id } });
  return res as AdminDeleteUserResponse;
}

export async function adminResetPassword(id: string, newPassword: string): Promise<AdminUpdateUserResponse> {
  // adminResetPassword maps to the same edge-function action (update_user
  // with password patch), so it shares AdminUpdateUserResponse's envelope.
  const res = await invokeAdmin({ action: 'update_user', payload: { id, password: newPassword } });
  return res as AdminUpdateUserResponse;
}

export async function adminGrantAccess(input: { camera_id: string; user_id: string }): Promise<AdminGrantAccessResponse> {
  const res = await invokeAdmin({ action: 'grant_access', payload: input });
  return res as AdminGrantAccessResponse;
}

export async function adminRevokeAccess(input: { camera_id: string; user_id: string }): Promise<AdminRevokeAccessResponse> {
  const res = await invokeAdmin({ action: 'revoke_access', payload: input });
  return res as AdminRevokeAccessResponse;
}

// Thin wrapper around the `list_users_for_admin` edge action.
//
// Returns just the emails dictionary the UI actually needs, sparing
// UsersTab from inline casting. Mirrors invokeAdmin's network-error
// handling for parity (local dev / unreachable edge function surfaces
// the same actionable message). Source-of-truth for the envelope is
// app/supabase/functions/admin-users/index.ts#list_users_for_admin:
// happy path returns `{ ok: true, emails: Record<string, string> }`,
// failure returns `{ error: <message> }` with HTTP 400.
//
// Returns `{}` on missing/empty `emails` instead of throwing — the
// consumer (UsersTab) gracefully degrades when emails aren't available,
// so an empty map here is the natural behaviour, not an error.
export async function listUserEmails(): Promise<Record<string, string>> {
  // Thin delegation to invokeEdge; unwraps the typed envelope at the
  // auth.ts boundary and returns just the emails dictionary the UI
  // actually needs (graceful-degrade `{}` on missing/empty).
  const res = await invokeEdge<{ ok: boolean; emails?: Record<string, string> }>('admin-users', {
    action: 'list_users_for_admin',
  });
  return res.emails ?? {};
}
