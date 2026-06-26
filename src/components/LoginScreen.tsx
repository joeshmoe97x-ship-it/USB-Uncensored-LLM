import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, User as UserIcon, Eye, EyeOff, AlertTriangle, Activity, Loader2, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function LoginScreen() {
  const { signIn, notConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter email and password.');
      return;
    }
    if (notConfigured) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart Vite.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch {
      // Generic message — Supabase raw errors can leak enumeration data
      // (e.g. "Email rate limit exceeded") and don't help the user anyway.
      setError('Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(245,158,11,0.10),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 mb-3">
            <Shield className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">OmniSight</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Unified Surveillance Command</p>
          <div className="inline-flex items-center gap-2 mt-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Encrypted Session</span>
          </div>
        </div>

        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-sm font-semibold text-white mb-4">Sign in</h2>

          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1">Email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  data-testid="login-email-input"
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@omnisight.local"
                  className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
                />
              </div>
            </label>

            <label className="block">
              <span className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1">Password</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  data-testid="login-password-input"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            {error && (
              <div className="flex gap-2 items-start p-2.5 rounded-lg border border-red-500/30 bg-red-500/5 text-xs text-red-300">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              data-testid="login-submit"
              disabled={submitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-800">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Seeded Credentials</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-blue-300 font-mono">admin@omnisight.local</span><span className="text-slate-500 font-mono">admin123</span></div>
              <div className="flex justify-between text-xs"><span className="text-emerald-300 font-mono">viewer@omnisight.local</span><span className="text-slate-500 font-mono">viewer123</span></div>
            </div>
            <p className="text-[10px] text-slate-600 mt-3 leading-relaxed">Run <code className="text-slate-400 bg-slate-800/60 px-1 rounded">scripts/bootstrap-admin.sh</code> after <code className="text-slate-400 bg-slate-800/60 px-1 rounded">supabase start</code> to seed these accounts.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}