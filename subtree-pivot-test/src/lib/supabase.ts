import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Read from Vite env (VITE_* are exposed to the browser; these are the
// safe-to-expose keys. SUPABASE_SERVICE_ROLE_KEY must NEVER appear in any
// client bundle — server-only).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const SUPABASE_CONFIGURED = Boolean(url && anon);

if (!SUPABASE_CONFIGURED && typeof console !== 'undefined') {
  console.warn(
    '[omnisight] Supabase env not configured. Set VITE_SUPABASE_URL + ' +
    'VITE_SUPABASE_ANON_KEY in your .env (see .env.example).',
  );
}

// Use a placeholder URL when unconfigured so createClient does not throw on
// app boot — the auth context surfaces a clear "not configured" error to the UI.
export const supabase: SupabaseClient = createClient(
  url || 'http://localhost:54321',
  anon || 'public-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'omnisight.auth',
    },
  },
);
