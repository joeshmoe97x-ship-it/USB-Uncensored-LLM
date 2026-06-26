import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User as SbUser } from '@supabase/supabase-js';
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase';
import { fetchProfile, signIn as svcSignIn, signOut as svcSignOut } from '../lib/auth';
import type { Profile } from '../types';

export interface AuthCtx {
  /** Supabase auth user (email, id, metadata). null when logged out. */
  user: SbUser | null;
  /** App-level profile row from public.profiles. */
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  /** True if Supabase env vars are missing — UI should show a config error screen. */
  notConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Convenience: profile.role === 'admin' && status === 'active' */
  isAdmin: boolean;
}

const noop = async () => {};
const defaultValue: AuthCtx = {
  user: null,
  profile: null,
  session: null,
  loading: true,
  notConfigured: !SUPABASE_CONFIGURED,
  signIn: noop,
  signOut: noop,
  refreshProfile: noop,
  isAdmin: false,
};

const AuthContext = createContext<AuthCtx>(defaultValue);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const p = await fetchProfile(userId);
      if (cancelledRef.current) return;
      setProfile(p);
      if (p) {
        // Best-effort update of last_login_at; ignore failures.
        await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', userId);
      }
    } catch {
      if (!cancelledRef.current) setProfile(null);
    }
  }, []);

  useEffect(() => {
    // cancelledRef guards every post-await setState to prevent React 19 strict-mode
    // double-mount + late-arriving responses from touching stale state.
    cancelledRef.current = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelledRef.current) return;
        setSession(data.session);
        if (data.session?.user) await loadProfile(data.session.user.id);
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_evt, newSession) => {
      if (cancelledRef.current) return;
      setSession(newSession);
      if (newSession?.user) await loadProfile(newSession.user.id);
      else setProfile(null);
    });

    return () => {
      cancelledRef.current = true;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn: AuthCtx['signIn'] = useCallback(async (email, password) => {
    await svcSignIn(email, password);
  }, []);

  const signOut = useCallback(async () => {
    await svcSignOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [loadProfile, session]);

  const isAdmin = useMemo(
    () => Boolean(profile && profile.role === 'admin' && profile.status === 'active'),
    [profile],
  );

  const value: AuthCtx = {
    user: session?.user ?? null,
    profile,
    session,
    loading,
    notConfigured: !SUPABASE_CONFIGURED,
    signIn,
    signOut,
    refreshProfile,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
