import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users as UsersIcon, UserPlus, MoreVertical, Trash2, Shield, Eye,
  Power, Search, Loader2, Check, Video, UserMinus, type LucideIcon,
} from 'lucide-react';
import { Profile, UserRole } from '../types';
import type { Camera, CameraAccess } from '../types';
import { supabase } from '../lib/supabase';
import {
  adminCreateUser, adminDeleteUser, adminResetPassword, adminUpdateUser,
  adminGrantAccess, adminRevokeAccess,
  listUserEmails,
} from '../lib/auth';
import { camerasApi } from '../lib/api';
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

  // Camera-access surface state — populated alongside the user-fetch path
  // below; consumed by the Camera Viewers section in the JSX. The fetches
  // happen in parallel with profile reads so any failure there does not
  // block the user listing (`camerasApi.listAccess` gracefully degrades on
  // RLS/edge failure to console.warn without throwing up).
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [accessTree, setAccessTree] = useState<CameraAccess[]>([]);
  const [cameraQuery, setCameraQuery] = useState('');
  const [manageCamera, setManageCamera] = useState<Camera | null>(null);

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
      // Typed wrapper exposes Promise<Record<string, string>> directly so
      // no inline envelope cast is needed and no runtime shape check
      // (`map && typeof map === 'object'`) is necessary — the wrapper's
      // type contract guarantees the map is an object when present.
      let enriched: Profile[] = data ?? [];
      try {
        const emails = await listUserEmails();
        enriched = enriched.map((u) => ({ ...u, email: emails[u.id] ?? u.email }));
      } catch { /* graceful degrade if Edge Function is unavail for this op */ }
      setUsers(enriched);
      // Camera + access-tree fetch — runs in parallel so the user list and
      // the camera-access section populate together. Independent try/catch
      // because camera_access is auxiliary; failure here should not block
      // the user-list refresh.
      try {
        const [cams, accs] = await Promise.all([
          camerasApi.list(),
          camerasApi.listAccess(),
        ]);
        setCameras(cams);
        setAccessTree(accs);
      } catch (e) {
        console.warn('Failed to fetch camera_access:', e);
      }
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

  // Camera-access memos (mirror the user-list memo shape above; named
  // separately to keep the two filtered lists distinct).
  const filteredCameras = useMemo(() => {
    if (!cameraQuery.trim()) return cameras;
    const q = cameraQuery.toLowerCase();
    return cameras.filter((c) =>
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.brand ?? '').toLowerCase().includes(q) ||
      (c.location ?? '').toLowerCase().includes(q) ||
      (c.model ?? '').toLowerCase().includes(q),
    );
  }, [cameras, cameraQuery]);

  const cameraCounts = useMemo(() => {
    const activeGrants = accessTree.length;
    const camerasWithViewers = new Set(accessTree.map((a) => a.camera_id)).size;
    return {
      total: cameras.length,
      activeGrants,
      camerasWithViewers,
      // Defensive Math.max against the rare RLS-race when
      // camerasWithViewers > cameras.length (cross-fetch skew between
      // camerasApi.list() and camerasApi.listAccess() results). Without the
      // clamp the KPI could render a negative value.
      unassigned: Math.max(0, cameras.length - camerasWithViewers),
    };
  }, [cameras, accessTree]);

  const handleAction = async (action: string, payload: unknown) => {
    try {
      // Wide payload (unknown) at the dispatch boundary; each branch narrows
      // back to its action-specific shape via direct `as Parameters<…>`
      // casts. With source `unknown`, the casts don't need the
      // `as unknown as` escape — TS2322 only fires when source and target
      // share no overlap (e.g. `object` vs `{ email: string }`); `unknown`
      // is the universal top type so direct casts compile cleanly.
      if (action === 'create_user')   await adminCreateUser(payload as Parameters<typeof adminCreateUser>[0]);
      else if (action === 'delete_user')   await adminDeleteUser(payload as Parameters<typeof adminDeleteUser>[0]);
      else if (action === 'reset_password')await adminResetPassword((payload as { id: string; password: string }).id, (payload as { id: string; password: string }).password);
      else if (action === 'update_user')   await adminUpdateUser((payload as { id: string }).id, payload as Parameters<typeof adminUpdateUser>[1]);
      else throw new Error('Unknown action ' + action);
      push({ type: 'success', message: 'Saved' });
      await refresh();
    } catch (err) {
      push({ type: 'error', message: 'Action failed', detail: String(err) });
    }
  };

  // Per-camera-viewer action handlers — wrap the typed admin* wrappers
  // with the same toast/success/error shape as handleAction above, but
  // scoped to grant_access / revoke_access. Each handler triggers a
  // refresh() so the camera_counts + filteredCameras re-derive on the
  // updated accessTree.
  const handleGrantAccess = async (cameraId: string, userId: string) => {
    try {
      await adminGrantAccess({ camera_id: cameraId, user_id: userId });
      push({ type: 'success', message: 'Camera access granted.' });
      await refresh();
    } catch (err) {
      push({ type: 'error', message: 'Failed to grant access', detail: String(err) });
    }
  };
  const handleRevokeAccess = async (cameraId: string, userId: string) => {
    try {
      await adminRevokeAccess({ camera_id: cameraId, user_id: userId });
      push({ type: 'success', message: 'Camera access revoked.' });
      await refresh();
    } catch (err) {
      push({ type: 'error', message: 'Failed to revoke access', detail: String(err) });
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

      {/* ---------- Camera Viewers section ---------- */}
      <div className="border-t border-slate-800 pt-6 mt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Camera Viewers</h2>
        </div>
        <p className="text-xs text-slate-400">
          Grant or revoke per-camera visibility for viewers. Routes through the typed
          <code className="mx-1 px-1.5 py-0.5 bg-slate-900/60 rounded text-slate-300">adminGrantAccess</code> /
          <code className="mx-1 px-1.5 py-0.5 bg-slate-900/60 rounded text-slate-300">adminRevokeAccess</code>
          edge wrappers; backended by <code className="px-1 bg-slate-900/60 rounded text-slate-300">public.camera_access</code>
          with admin / owner RLS.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Cameras" value={cameraCounts.total} />
          <KpiCard label="Active Grants" value={cameraCounts.activeGrants} tone="admin" />
          <KpiCard label="Cameras w/ Viewers" value={cameraCounts.camerasWithViewers} tone="viewer" />
          <KpiCard label="Unassigned" value={cameraCounts.unassigned} tone="warn" />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            placeholder="Search cameras by name, brand, model, or location…"
            value={cameraQuery}
            onChange={(e) => setCameraQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-white"
            data-testid="camera-access-search-input"
          />
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg divide-y divide-slate-800">
          {filteredCameras.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              {cameraQuery.trim()
                ? 'No cameras match your search.'
                : cameras.length === 0
                  ? 'No cameras configured yet.'
                  : 'No cameras.'}
            </div>
          )}
          {      filteredCameras.map((camera) => {
            const viewersHere = accessTree.filter((a) => a.camera_id === camera.id);
            return (
              <div key={camera.id} className="p-4 hover:bg-slate-800/40 transition-colors flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                  <Video className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{camera.name}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {[camera.brand, camera.model, camera.location].filter(Boolean).join(' · ') || 'Unknown brand / model'}
                  </div>
                </div>
                <Pill tone={camera.status === 'online' ? 'ok' : camera.status === 'offline' ? 'dim' : 'dim'}>
                  {camera.status}
                </Pill>
                <span className="text-xs text-slate-400 hidden md:inline whitespace-nowrap">
                  {viewersHere.length} {viewersHere.length === 1 ? 'viewer' : 'viewers'}
                </span>
                <button
                  onClick={() => setManageCamera(camera)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-700 hover:border-slate-500 rounded text-slate-300 hover:text-white"
                  data-testid={`camera-access-manage-${camera.id}`}
                >
                  <UsersIcon className="w-3 h-3" /> Manage viewers
                </button>
              </div>
            );
          })}
        </div>
      </div>

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

      {manageCamera && (
        <ManageAccessModal
          camera={manageCamera}
          allUsers={users}
          currentAccess={accessTree.filter((a) => a.camera_id === manageCamera.id)}
          onClose={() => setManageCamera(null)}
          onGrant={(userId) => handleGrantAccess(manageCamera.id, userId)}
          onRevoke={(userId) => handleRevokeAccess(manageCamera.id, userId)}
        />
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

/**
 * Camera-Viewers per-camera management modal.
 *
 * Opens when an admin clicks "Manage viewers" on a camera row in the new
 * Camera Viewers section above. Shows:
 *   1. A grant-new-viewer dropdown (active users not yet on this camera).
 *   2. A current-viewers list with revoke buttons (one per access row).
 *
 * Both grant and revoke route through adminGrantAccess/adminRevokeAccess
 * (typed wrappers from auth.ts). The parent closes the modal and re-runs
 * refresh() after each mutation, so the accessTree re-derives and the
 * KPI cards + per-camera viewer count stay in sync.
 */
function ManageAccessModal({
  camera, allUsers, currentAccess, onClose, onGrant, onRevoke,
}: {
  camera: Camera;
  allUsers: Profile[];
  currentAccess: CameraAccess[];
  onClose: () => void;
  onGrant: (userId: string) => Promise<void> | void;
  onRevoke: (userId: string) => Promise<void> | void;
}) {
  const { push } = useToast();
  const [pickedUserId, setPickedUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Currently-granted user ids, expanded to a set for O(1) filter in
  // grantableUsers below. Re-derives on currentAccess change.
  const grantedUserIds = useMemo(
    () => new Set(currentAccess.map((a) => a.user_id)),
    [currentAccess],
  );

  // Grantable = active users with no existing access for this camera.
  // Disabled users are intentionally excluded so an admin can't grant
  // access to a disabled account and waste the motion.
  const grantableUsers = useMemo(
    () => allUsers.filter((u) => u.status === 'active' && !grantedUserIds.has(u.id)),
    [allUsers, grantedUserIds],
  );

  const handleGrant = async () => {
    if (!pickedUserId) return;
    setBusy(true);
    setErr(null);
    try {
      // Parent owns user-visible feedback (single toast on success/error);
      // modal-only handler here manages busy flag and local error display.
      // Calling push() here too would cause a duplicate toast.
      await onGrant(pickedUserId);
      setPickedUserId('');
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (userId: string) => {
    setBusy(true);
    setErr(null);
    try {
      // See handleGrant note: parent already toasts on success; modal-only
      // busy + local error handling only.
      await onRevoke(userId);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DetailModal
      open
      onClose={onClose}
      title={`Manage viewers — ${camera.name}`}
      subtitle={
        currentAccess.length === 0
          ? `No viewers yet on this camera. Grant access below to share live video.`
          : `${currentAccess.length} viewer${currentAccess.length === 1 ? '' : 's'} currently have access.`
      }
      footer={(
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded">Close</button>
        </div>
      )}
    >
      <div className="space-y-4">
        {/* Grant new viewer */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-2">Grant new viewer</h3>
          {grantableUsers.length === 0 ? (
            <p className="text-xs text-slate-500">
              {allUsers.length === 0
                ? 'No users configured yet.'
                : 'Every active user already has access.'}
            </p>
          ) : (
            <div className="flex gap-2">
              <select
                value={pickedUserId}
                onChange={(e) => setPickedUserId(e.target.value)}
                disabled={busy}
                data-testid="camera-access-grant-select"
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
              >
                <option value="">Select a user…</option>
                {grantableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name ?? u.email ?? u.id}
                    {u.role === 'admin' ? '  (admin)' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={handleGrant}
                disabled={!pickedUserId || busy}
                data-testid="camera-access-grant-btn"
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded inline-flex items-center gap-1 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                Grant
              </button>
            </div>
          )}
        </div>

        {/* Current viewers list */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-2">
            Current viewers ({currentAccess.length})
          </h3>
          {currentAccess.length === 0 ? (
            <p className="text-xs text-slate-500">No viewers assigned.</p>
          ) : (
            <div className="space-y-1">
              {currentAccess.map((access) => {
                const viewer = allUsers.find((u) => u.id === access.user_id);
                const display = viewer?.display_name ?? viewer?.email ?? access.user_id;
                const viewerRole = viewer?.role ?? 'viewer';
                return (
                  <div key={access.id} className="flex items-center gap-3 px-3 py-2 bg-slate-950/50 border border-slate-800 rounded">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{display}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{viewerRole}</span>
                        {access.granted_at && (
                          <span>· granted {formatTimeAgo(access.granted_at)}</span>
                        )}
                        {viewer?.status === 'disabled' && (
                          <span className="text-amber-300">· disabled</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(access.user_id)}
                      disabled={busy}
                      data-testid={`camera-access-revoke-${access.user_id}`}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-red-500/30 text-red-300 hover:bg-red-500/10 rounded disabled:opacity-50"
                    >
                      <UserMinus className="w-3 h-3" />
                      Revoke
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {err && <div className="text-xs text-red-300 border border-red-500/30 bg-red-500/5 rounded p-2">{err}</div>}
      </div>
    </DetailModal>
  );
}
