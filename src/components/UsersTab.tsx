
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users as UsersIcon, UserPlus, MoreVertical, Trash2, Shield, Eye,
  Power, Search, Loader2, Check, type LucideIcon,
} from 'lucide-react';
import { Profile, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import {
  adminCreateUser, adminDeleteUser, adminResetPassword, adminUpdateUser,
} from '../lib/auth';
import { useToast } from './Toast';
import { DetailModal } from './DetailModal';
import { formatTimeAgo } from '../lib/format';

export default function UsersTab() {
  const { push } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [resetFor, setResetFor] = useState<Profile | null>(null);
  const [query, setQuery] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      // Admin can SELECT all profiles (RLS). We also joins the email by fetching
      // auth.users via the admin-users Edge Function.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Fetch emails via Edge Function for display only (admin-only).
      let enriched: Profile[] = data ?? [];
      try {
        const res = await supabase.functions.invoke('admin-users', {
          body: { action: 'list_users_for_admin' },
        });
        const map = (res.data as { ok: boolean; emails?: Record<string, string> } | null)?.emails;
        if (map && typeof map === 'object') {
          enriched = enriched.map((u) => ({ ...u, email: map[u.id] ?? u.email }));
        }
      } catch { /* graceful degrade if Edge Function is unavail for this op */ }
      setUsers(enriched);
    } catch (err) {
      push({ type: 'error', message: 'Could not load users', detail: String(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.toLowerCase();
    return users.filter((u) =>
      (u.display_name ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      u.role.includes(q),
    );
  }, [users, query]);

  const counts = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.role === 'admin' && u.status === 'active').length,
    viewers: users.filter((u) => u.role === 'viewer' && u.status === 'active').length,
    disabled: users.filter((u) => u.status === 'disabled').length,
  }), [users]);

  const handleAction = async (action: string, payload: object) => {
    try {
      if (action === 'create_user')   await adminCreateUser(payload as unknown as Parameters<typeof adminCreateUser>[0]);
      else if (action === 'delete_user')   await adminDeleteUser(payload as unknown as Parameters<typeof adminDeleteUser>[0]);
      else if (action === 'reset_password')await adminResetPassword((payload as { id: string; password: string }).id, (payload as { id: string; password: string }).password);
      else if (action === 'update_user')   await adminUpdateUser((payload as unknown as { id: string }).id, payload as unknown as Parameters<typeof adminUpdateUser>[1]);
      else throw new Error('Unknown action ' + action);
      push({ type: 'success', message: 'Saved' });
      await refresh();
    } catch (err) {
      push({ type: 'error', message: 'Action failed', detail: String(err) });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-blue-400" />
            Access Control
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage user accounts and roles. Backed by Supabase + RLS.</p>
        </div>
        <button
          data-testid="userstab-add-user-btn"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg"
        >
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total" value={counts.total} />
        <KpiCard label="Active Admins" value={counts.admins} tone="admin" />
        <KpiCard label="Active Viewers" value={counts.viewers} tone="viewer" />
        <KpiCard label="Disabled" value={counts.disabled} tone="warn" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          placeholder="Search by name, email, or role…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-white"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading users…
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg divide-y divide-slate-800">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">No users match your search.</div>
          )}
          {filtered.map((u) => {
            const isAdmin = u.role === 'admin';
            const initials = (u.display_name ?? u.email ?? '?').slice(0, 1).toUpperCase();
            return (
              <div key={u.id} className="p-4 hover:bg-slate-800/40 transition-colors flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-300">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{u.display_name ?? u.email ?? 'Unnamed'}</div>
                  <div className="text-xs text-slate-500 truncate">{u.email ?? u.id}</div>
                </div>
                <Pill tone={isAdmin ? 'admin' : 'viewer'}>{isAdmin ? 'Admin' : 'Viewer'}</Pill>
                <Pill tone={u.status === 'active' ? 'ok' : 'dim'}>{u.status === 'active' ? 'Active' : 'Disabled'}</Pill>
                <span className="text-[10px] text-slate-500 hidden md:inline">Last login: {u.last_login_at ? formatTimeAgo(u.last_login_at) : 'never'}</span>
                <div className="relative">
                  <button onClick={() => setMenuFor(menuFor === u.id ? null : u.id)} className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuFor === u.id && (
                    <div className="absolute right-0 mt-1 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-10 py-1" onMouseLeave={() => setMenuFor(null)}>
                      <MenuItem icon={Power}   label="Reset password"
                        onClick={() => { setResetFor(u); setMenuFor(null); }} />
                      <MenuItem icon={isAdmin ? Eye : Shield}
                        label={isAdmin ? 'Demote to viewer' : 'Promote to admin'}
                        onClick={() => {
                          setMenuFor(null);
                          handleAction('update_user', {
                            id: u.id,
                            role: (isAdmin ? 'viewer' : 'admin') as UserRole,
                          });
                        }}
                      />
                      <MenuItem icon={Power}   label={u.status === 'active' ? 'Disable' : 'Enable'}
                        tone="warn"
                        onClick={() => {
                          setMenuFor(null);
                          handleAction('update_user', {
                            id: u.id,
                            status: u.status === 'active' ? 'disabled' : 'active',
                          });
                        }}
                      />
                      <div className="border-t border-slate-800 my-1" />
                      <MenuItem icon={Trash2}  label="Delete user"
                        tone="danger"
                        onClick={() => { setConfirmDelete(u); setMenuFor(null); }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddUserModal
        open={addOpen}
        onClose={(refreshed) => { setAddOpen(false); if (refreshed) refresh(); }}
        onSubmit={async (input) => { await handleAction('create_user', input); }}
      />

      {resetFor && (
        <ResetPasswordModal
          userName={resetFor.display_name ?? resetFor.email ?? resetFor.id}
          onClose={() => setResetFor(null)}
          onSubmit={async (pw) => {
            await handleAction('update_user', { id: resetFor.id, password: pw });
            setResetFor(null);
          }}
        />
      )}

      {confirmDelete && (
        <DetailModal
          open
          onClose={() => setConfirmDelete(null)}
          title="Delete user?"
          subtitle={`This permanently deletes ${confirmDelete.display_name ?? confirmDelete.email ?? confirmDelete.id} from auth.users. Their cameras remain owned but become orphaned.`}
          footer={(
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded">Cancel</button>
              <button onClick={async () => { const id = confirmDelete.id; setConfirmDelete(null); await handleAction('delete_user', { id }); }} className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded inline-flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
        >
          <div className="space-y-2 text-sm text-slate-300">
            <p>This action is irreversible. The user will lose access immediately.</p>
          </div>
        </DetailModal>
      )}
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: number; tone?: 'admin' | 'viewer' | 'warn' }) {
  const color = tone === 'admin' ? 'text-blue-400' : tone === 'viewer' ? 'text-emerald-400' : tone === 'warn' ? 'text-amber-400' : 'text-white';
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: 'admin' | 'viewer' | 'ok' | 'dim' }) {
  const map: Record<string, string> = {
    admin: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    viewer: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    ok: 'bg-slate-700/40 border-slate-600 text-slate-300',
    dim: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  };
  return <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${map[tone]}`}>{children}</span>;
}

function MenuItem({ icon: Icon, label, onClick, tone }: { icon: LucideIcon; label: string; onClick: () => void; tone?: 'warn' | 'danger' }) {
  const c = tone === 'danger' ? 'text-red-300 hover:bg-red-500/10' : tone === 'warn' ? 'text-amber-200 hover:bg-amber-500/10' : 'text-slate-200 hover:bg-slate-700/40';
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left ${c}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function AddUserModal({ open, onClose, onSubmit }: { open: boolean; onClose: (refreshed?: boolean) => void; onSubmit: (i: { email: string; password: string; display_name?: string; role: UserRole }) => Promise<void> }) {
  const { push } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setEmail(''); setName(''); setPassword(''); setConfirm(''); setRole('viewer'); setErr(null); setBusy(false); }
  }, [open]);

  const submit = async () => {
    setErr(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr('Enter a valid email.');
    if (password.length < 8) return setErr('Password must be at least 8 characters.');
    if (password !== confirm) return setErr('Passwords do not match.');
    setBusy(true);
    try {
      await onSubmit({ email: email.trim(), password, display_name: name.trim() || undefined, role });
      push({ type: 'success', message: `Created ${email}` });
      onClose(true);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DetailModal
      open={open}
      onClose={() => onClose(false)}
      title="Add new user"
      subtitle="Sends credentials to the user. They can sign in immediately."
      footer={(
        <div className="flex justify-end gap-2">
          <button onClick={() => onClose(false)} className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded">Cancel</button>
          <button onClick={submit} disabled={busy} data-testid="userstab-add-submit" className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded inline-flex items-center gap-1">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Create user
          </button>
        </div>
      )}
    >
      <div className="grid gap-3">
        <Field label="Email">
          <input type="email" data-testid="userstab-add-email-input" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm" />
        </Field>
        <Field label="Display name (optional)">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm" />
        </Field>
        <Field label="Password">
          <input type="password" data-testid="userstab-add-password-input" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm" />
        </Field>
        <Field label="Confirm password">
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm" />
        </Field>
        <Field label="Role">
          <div className="grid grid-cols-2 gap-2">
            <RoleChoice icon={Eye}   label="Viewer" sub="Read-only cameras" active={role === 'viewer'} onClick={() => setRole('viewer')} dataTestid="userstab-add-role-viewer" />
            <RoleChoice icon={Shield} label="Admin"  sub="Full access" active={role === 'admin'} onClick={() => setRole('admin')} dataTestid="userstab-add-role-admin" />
          </div>
        </Field>
        {err && <div className="text-xs text-red-300 border border-red-500/30 bg-red-500/5 rounded p-2">{err}</div>}
      </div>
    </DetailModal>
  );
}

function ResetPasswordModal({ userName, onClose, onSubmit }: { userName: string; onClose: () => void; onSubmit: (pw: string) => Promise<void> }) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <DetailModal
      open
      onClose={onClose}
      title={`Reset password for ${userName}`}
      subtitle="The user will be prompted to sign in again on next request."
      footer={(
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm bg-slate-700 text-white rounded">Cancel</button>
          <button onClick={async () => {
            setErr(null);
            if (pw.length < 8) return setErr('Password must be at least 8 characters.');
            if (pw !== confirm) return setErr('Passwords do not match.');
            setBusy(true);
            try { await onSubmit(pw); } catch (e) { setErr(String(e)); } finally { setBusy(false); }
          }} className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded">
            {busy ? <Loader2 className="w-3 h-3 animate-spin inline-block" /> : 'Reset'}
          </button>
        </div>
      )}
    >
      <div className="grid gap-3">
        <Field label="New password"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm" /></Field>
        <Field label="Confirm password"><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm" /></Field>
        {err && <div className="text-xs text-red-300">{err}</div>}
      </div>
    </DetailModal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

function RoleChoice({ icon: Icon, label, sub, active, onClick, dataTestid }: { icon: LucideIcon; label: string; sub: string; active: boolean; onClick: () => void; dataTestid?: string }) {
  return (
    <button type="button" onClick={onClick} data-testid={dataTestid}
      className={`text-left p-3 rounded-lg border transition-colors ${active ? 'border-blue-500/60 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500'}`}>
      <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-blue-300" /><span className="font-medium text-sm text-white">{label}</span></div>
      <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>
    </button>
  );
}
