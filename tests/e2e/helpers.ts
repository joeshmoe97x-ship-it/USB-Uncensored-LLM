import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

/**
 * Read the trio of Supabase test env vars. Throws if any are missing so the
 * e2e specs fail fast with a single actionable message instead of cryptic
 * null-pointer errors downstream. Callers can therefore treat the return
 * value as a guaranteed-complete triple without re-validating.
 */
export interface SupabaseTestEnv {
  url: string;
  anon: string;
  service: string;
}

export function readSupabaseEnv(): SupabaseTestEnv {
  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    throw new Error(
      `Missing Supabase test env. Have ` +
      `VITE_SUPABASE_URL=${!!url} ` +
      `VITE_SUPABASE_ANON_KEY=${!!anon} ` +
      `SUPABASE_SERVICE_ROLE_KEY=${!!service}`,
    );
  }
  return { url, anon, service };
}

/** Anon client used ONLY for sign-in (returns a JWT for use as Bearer). */
export function createAnonClient(env: SupabaseTestEnv): SupabaseClient {
  return createClient(env.url, env.anon, {
    realtime: { transport: ws as any }, 
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Service-role client — full DB access. Use sparingly in tests. */
export function createServiceClient(env: SupabaseTestEnv): SupabaseClient {
  return createClient(env.url, env.service, {
    realtime: { transport: ws as any }, 
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Sign in via an anon client and return the access_token JWT, or `null` on
 * failure (network error, auth error, or no session in the response). Most
 * callers follow a null result with `test.skip(true, ...)` + `return` so an
 * unseeded environment skips the test instead of crashing the suite.
 */
export async function signInAndGetJwt(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<string | null> {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) return null;
  return data.session.access_token;
}

export interface AdminInvokeResult {
  status: number;
  body: string;
  /**
   * Best-effort JSON parse of the response body, or `null` if the body isn't
   * valid JSON. Shape is intentionally loose because admin-users returns
   * ad-hoc envelopes per action; callers narrow with their own predicates.
   */
  parsed: { ok?: boolean; error?: string; [k: string]: unknown } | null;
}

/**
 * POST to the admin-users Edge Function. Adds `Authorization: Bearer ...`
 * from `jwt` plus JSON Content-Type. Returns the raw response + best-effort
 * parsed body. There is intentionally no built-in `isAccepted` /
 * `isRejected` helper here because the per-role policy is what each test
 * actually wants to gate (varies per action, and the strict-vs-permissive
 * judgement is the security boundary under test).
 */
export async function adminInvoke(
  env: SupabaseTestEnv,
  jwt: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<AdminInvokeResult> {
  const res = await fetch(`${env.url}/functions/v1/admin-users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await res.text();
  let parsed: AdminInvokeResult['parsed'] = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    /* non-JSON body is allowed; callers decide if that means success/failure. */
  }
  return { status: res.status, body, parsed };
}
