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

// -------------------- admin user mgmt via Edge --------------------------

export type AdminAction =
  | { action: 'create_user';   payload: { email: string; password: string; display_name?: string; role: UserRole } }
  | { action: 'update_user';   payload: { id: string; role?: UserRole; status?: 'active' | 'disabled'; password?: string; display_name?: string } }
  | { action: 'delete_user';   payload: { id: string } }
  | { action: 'grant_access';  payload: { camera_id: string; user_id: string } }
  | { action: 'revoke_access'; payload: { camera_id: string; user_id: string } };

export async function invokeAdmin(body: AdminAction): Promise<{ ok: boolean; [k: string]: unknown }> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    // Supabase FunctionsFetchError is thrown for network failures / DNS / 5xx.
    // Function 4xx responses (e.g. action not found) become FunctionsHttpError
    // and carry error.context with the status — we DO want to surface those
    // verbatim because they are real, actionable response errors.
    const e = error as Error & { name?: string; context?: { status?: number }; cause?: unknown };
    const isFetchError = e.name === 'FunctionsFetchError' || e.name === 'FunctionsRelayError';
    const status = e.context?.status;
    const isNetwork = isFetchError || status === 0 || status === undefined;
    if (isNetwork) {
      throw new Error(
        'Edge Function "admin-users" is not reachable. ' +
        'Run `supabase functions serve admin-users` (local) or ' +
        '`supabase functions deploy admin-users --no-verify-jwt` (remote).',
      );
    }
    throw new Error(e.message || 'Edge Function call failed.');
  }
  return (data ?? { ok: true }) as { ok: boolean; [k: string]: unknown };
}

// -------------------- admin-only helpers -------------------------------

// Typed response envelopes mirroring the edge function's happy-path JSON.
// Source-of-truth is app/supabase/functions/admin-users/index.ts lines 84 /
// 104 / 112 (create_user / update_user / delete_user respectively). Optional
// fields surfaced as `?` for parity with invokeAdmin's wide return.
export type AdminCreateUserResponse = { ok: boolean; user_id?: string; email?: string };
export type AdminUpdateUserResponse = { ok: boolean; user?: unknown };
export type AdminDeleteUserResponse = { ok: boolean };

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
