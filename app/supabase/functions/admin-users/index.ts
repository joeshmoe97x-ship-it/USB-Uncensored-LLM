// OmniSight Edge Function: admin user-management actions.
// Promote a logged-in admin (anon client forwards user JWT) to the service-role
// client so it can call supabase.auth.admin.{createUser,updateUserById,deleteUser}.
//
// Actions supported:
//   create_user   { email, password, display_name?, role }
//   update_user   { id, role?, status?, password?, display_name? }
//   delete_user   { id }
//   grant_access  { camera_id, user_id }
//   revoke_access { camera_id, user_id }
//
// Local dev:  supabase functions serve admin-users      (no deploy needed)
// Remote:     supabase functions deploy admin-users      (JWT verify ENABLED by default;
//            the function's internal assertAdmin() + getUser() check is the canonical gate;
//            the prior --no-verify-jwt flag was a dev-path leftover that should NOT be
//            propagated to production — defense-in-depth removes a single point of failure
//            if the internal getUser() check is ever bypassed by a future contributor)
//
// The function does its own JWT validation via getUser().

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function assertAdmin(req) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) {
    throw new Error("Edge Function misconfigured: missing SUPABASE_URL / SUPABASE_*_KEY env vars");
  }
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) throw new Error("Unauthorized: no valid session");
  const { data: profile, error: profileErr } = await adminClient
    .from("profiles")
    .select("role, status")
    .eq("id", userData.user.id)
    .single();
  if (profileErr || !profile) throw new Error("Unauthorized: profile not found");
  if (profile.role !== "admin" || profile.status !== "active") {
    throw new Error("Forbidden: admin role required");
  }
  return { adminClient, callerId: userData.user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")    return json({ error: "POST only" }, 405);
  try {
    const { adminClient, callerId } = await assertAdmin(req);
    // Accept both payload shapes: `{action, payload: {...}}` (new contract
    // documented in src/lib/auth.ts#AdminAction) AND `{action, ...payload}`
    // (flat shape used by tests/e2e/helpers.ts#adminInvoke). The fallback
    // resolves the legacy flat shape INTO `payload` so per-action destructures
    // (`payload.camera_id` / `payload.user_id` / etc.) work in both modes.
    const { action, payload: payloadRaw, ...rest } = await req.json();
    const payload = payloadRaw ?? rest;

    if (action === "create_user") {
      const { email, password, display_name, role } = payload || {};
      if (!email || !password) return json({ error: "email + password required" }, 400);
      const safeRole = role === "admin" ? "admin" : "viewer";
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: display_name || email.split("@")[0], role: safeRole },
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, user_id: data.user?.id, email: data.user?.email });
    }

    if (action === "update_user") {
      const { id, role, status, password, display_name } = payload || {};
      if (!id) return json({ error: "id required" }, 400);
      const updates = {};
      if (password) updates.password = password;
      const userMeta = {};
      if (display_name) userMeta.display_name = display_name;
      if (role)        userMeta.role = role;
      if (Object.keys(userMeta).length) updates.user_metadata = userMeta;
      const { data, error } = await adminClient.auth.admin.updateUserById(id, updates);
      if (error) return json({ error: error.message }, 400);
      const patch = {};
      if (role)   patch.role   = role;
      if (status) patch.status = status;
      if (Object.keys(patch).length) {
        await adminClient.from("profiles").update(patch).eq("id", id);
      }
      return json({ ok: true, user: data.user });
    }

    if (action === "delete_user") {
      const { id } = payload || {};
      if (!id) return json({ error: "id required" }, 400);
      const { error } = await adminClient.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "grant_access") {
      const { camera_id, user_id } = payload || {};
      if (!camera_id || !user_id) return json({ error: "camera_id + user_id required" }, 400);
      const { error } = await adminClient
        .from("camera_access")
        .insert({ camera_id, user_id, granted_by: callerId });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "revoke_access") {
      const { camera_id, user_id } = payload || {};
      if (!camera_id || !user_id) return json({ error: "camera_id + user_id required" }, 400);
      const { error } = await adminClient
        .from("camera_access")
        .delete()
        .eq("camera_id", camera_id)
        .eq("user_id", user_id);
      if (error) return json({ error: error.message }, 400);
      // Returns a strict contract envelope for the happy path so consumers
      // (including tests/e2e/auth-rls.spec.ts test 4) can rely on a uniform
      // shape. `revoked_at` is the ISO timestamp of the revocation request,
      // not the row’s persisted `granted_at`. Symmetric with `grant_access`
      // for future parity (could be extended to `{ ok: true, granted_at: ... }`).
      return json({ ok: true, revoked_at: new Date().toISOString() });
    }

    if (action === 'list_users_for_admin') {
      const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 200 });
      if (error) return json({ error: error.message }, 400);
      const emails: Record<string, string> = {};
      for (const u of data?.users ?? []) {
        if (u.id && u.email) emails[u.id] = u.email;
      }
      return json({ ok: true, emails });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.startsWith("Unauthorized") || msg.startsWith("Forbidden") ? 403 : 400;
    return json({ error: msg }, status);
  }
});
