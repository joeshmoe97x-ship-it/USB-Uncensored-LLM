import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Camera, ShieldAlert, FileSearch, Settings, Shield,
  Server, Terminal, Menu, X, Eye, Search, Bell, AlertTriangle,
  Users, LogOut, ChevronDown,
} from 'lucide-react';
import CameraGrid from './components/CameraGrid';
import EventsList from './components/EventsList';
import EvidenceLocker from './components/EvidenceLocker';
import ThreatMonitor from './components/ThreatMonitor';
import DeploymentGuide from './components/DeploymentGuide';
import OsintShield from './components/OsintShield';
import UsersTab from './components/UsersTab';
import { ToastProvider, useToast } from './components/Toast';
import { CommandPalette, PaletteItem } from './components/CommandPalette';
import { LiveTicker } from './components/LiveTicker';
import { LoginScreen } from './components/LoginScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';

type TabId = 'cameras' | 'events' | 'evidence' | 'threats' | 'osint' | 'deployment' | 'users';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ToastProvider>
  );
}

function AppShell() {
  const { profile, loading, signOut, notConfigured, isAdmin } = useAuth();
  // Render gate: env missing → setup hint; booting → splash; unauthenticated → login.
  if (notConfigured) return <NotConfiguredScreen />;
  if (loading) return <SplashScreen />;
const { push } = useToast();
  const welcomePushedRef = useRef(false);

  // Base tabs visible to all authenticated users.
  const baseTabs = useMemo(
    () => [
      { id: 'cameras'    as const, label: 'Unified Cameras',  icon: Camera,           hint: 'Live & AI-overlaid streams',     shortcut: '1' },
      { id: 'events'     as const, label: 'Events API',       icon: LayoutDashboard, hint: 'Webhook intake & timeline',     shortcut: '2' },
      { id: 'evidence'   as const, label: 'Evidence Locker',  icon: FileSearch,      hint: 'Retrievable media bundles',     shortcut: '3' },
      { id: 'threats'    as const, label: 'Wireless Threats', icon: ShieldAlert,     hint: 'Deauth / jamming / rogue AP',   shortcut: '4' },
      { id: 'osint'      as const, label: 'OSINT Shield',     icon: Eye,             hint: 'Cross-reference watchlists',    shortcut: '5' },
    ],
    []
  );

  // Admin-only tabs (appended after the base tabs for predictable shortcut order).
  const adminTabs = useMemo(
    () => [
      { id: 'deployment' as const, label: 'Deployment Guide', icon: Terminal, hint: 'Architecture & integration',  shortcut: '6' },
      { id: 'users'      as const, label: 'Access Control',   icon: Users,    hint: 'Manage users & roles',        shortcut: '7' },
    ],
    []
  );

  const tabs = useMemo(
    () => (isAdmin ? [...baseTabs, ...adminTabs] : baseTabs),
    [baseTabs, adminTabs, isAdmin]
  );

  const [activeTab, setActiveTab] = useState<TabId>('cameras');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [bootTime] = useState(() => Date.now());

  useEffect(() => {
    if (!profile) {
      welcomePushedRef.current = false;
      return;
    }
    if (welcomePushedRef.current) return;
    welcomePushedRef.current = true;
    push({
      type: 'info',
      message: 'Welcome back, ' + profile.display_name,
      detail: 'Signed in as ' + profile.role + (isAdmin ? ' · full access' : ' · read-only viewer'),
    });
  }, [profile, isAdmin, push]);

  // If an admin gets demoted while mounted, fall back to a safe tab.
  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'admin' && (activeTab === 'users' || activeTab === 'deployment')) {
      setActiveTab('cameras');
    }
  }, [profile, activeTab]);

  const paletteItems: PaletteItem[] = useMemo(
    () => {
      const items: PaletteItem[] = tabs.map((t) => ({
        id: t.id,
        label: t.label,
        description: t.hint,
        icon: t.icon,
        keywords: [t.id, t.label.toLowerCase(), t.hint.toLowerCase()],
        action: () => setActiveTab(t.id),
      }));
      if (profile) {
        items.push({
          id: 'logout',
          label: 'Sign out',
          description: 'End your current session',
          icon: LogOut,
          keywords: ['logout', 'sign out', 'exit'],
          action: () => { setUserMenuOpen(false); signOut(); },
        });
      }
      return items;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabs, profile?.id, profile?.role]
  );

  // Global keyboard shortcuts: Cmd/Ctrl+K toggles palette; 1-7 jumps to tab.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!profile) return;
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (isMod || e.altKey) return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
        if (tag === 'BUTTON') return;
      }
      const keys = ['1','2','3','4','5','6','7'];
      const idx = keys.indexOf(e.key);
      if (idx >= 0 && idx < tabs.length) {
        e.preventDefault();
        setActiveTab(tabs[idx].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [profile, tabs]);

  // Close the user dropdown when clicking outside it.
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-usermenu]')) setUserMenuOpen(false);
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [userMenuOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05050b] flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="text-[10px] font-mono uppercase tracking-[0.3em] text-blue-300"
        >
          batcomputer · initializing
        </motion.div>
      </div>
    );
  }

  if (!profile) {
    return <LoginScreen />;
  }

  const onSignOut = () => {
    setUserMenuOpen(false);
    signOut();
    push({ type: 'info', message: 'Signed out' });
  };

  const active = tabs.find((t) => t.id === activeTab) ?? tabs[0];
  const ActiveIcon = active.icon;
  const initials = (profile.display_name ?? profile.email ?? '?')
    .split(/\s+/)
    .map((s: string) => s[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} />
      <div className="min-h-screen bg-[#0a0a12] text-gray-100 flex font-sans selection:bg-blue-500/30">
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <aside className={
          'fixed lg:static inset-y-0 left-0 w-64 bg-[#0a0a14] border-r border-white/5 flex flex-col z-50 transform transition-transform duration-300 ' +
          (isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
        }>
          <div className="p-5 border-b border-white/5 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-blue-500/30 blur-lg rounded-full animate-pulse" />
                  <Shield className="w-8 h-8 text-blue-400 relative" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold tracking-tight text-white truncate">OmniSight</h1>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">BATCOMPUTER · v3.0</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 ml-0.5">Unified VMS & API Gateway</p>
            </div>
            <button
              className="lg:hidden text-gray-400 hover:text-white p-1 shrink-0"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }}
                  className={
                    'group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ' +
                    (isActive
                      ? 'bg-gradient-to-r from-blue-600/15 to-blue-600/0 text-blue-200 border-blue-500/30 shadow-[inset_0_1px_0_rgba(59,130,246,0.18)]'
                      : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-100 border-transparent')
                  }
                >
                  <Icon className={'w-4 h-4 shrink-0 ' + (isActive ? 'text-blue-300' : 'text-gray-500 group-hover:text-gray-300')} />
                  <span className="flex-1 text-left truncate">{tab.label}</span>
                  {tab.shortcut && (
                    <span className={'text-[10px] font-mono opacity-60 ' + (isActive ? 'text-blue-300' : 'text-gray-600')}>⌘{tab.shortcut}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/5 shrink-0">
            <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <Server className="w-3 h-3" /> System Status
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-300 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                </div>
              </div>
              <div className="space-y-1.5 text-[11px] font-mono">
                <StatusRow label="API Gateway" value="Online" tone="success" />
                <StatusRow label="ONVIF Bridge" value="Active" tone="success" />
                <StatusRow label="Frigate NVR" value="Streaming" tone="success" />
                <StatusRow label="WIDS Sensor" value="Armed" tone="success" />
                <StatusRow label="Storage" value="4.2 TB Free" tone="neutral" />
                <StatusRow label="Uptime" value={formatUptime(bootTime)} tone="neutral" />
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 h-screen">
          <header className="h-16 bg-[#0a0a14]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="lg:hidden text-gray-400 hover:text-white p-2 -ml-2"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="hidden sm:flex w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 items-center justify-center shrink-0">
                  <ActiveIcon className="w-4 h-4 text-blue-300" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-white truncate">{active.label}</h2>
                  <p className="text-[11px] text-gray-500 truncate">{active.hint}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <LiveTicker onJump={(t) => setActiveTab(t as TabId)} />
              <button
                onClick={() => setPaletteOpen(true)}
                className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 px-2.5 py-1.5 rounded-lg transition-colors"
                title="Jump to a section (Cmd+K)"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
                <kbd className="font-mono text-[10px] border border-white/10 px-1 py-0.5 rounded text-gray-500">⌘K</kbd>
              </button>
              <button className="relative text-gray-400 hover:text-white p-2 transition-colors" aria-label="Alerts">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              </button>
              <button className="text-gray-400 hover:text-white p-2 transition-colors" aria-label="Settings">
                <Settings className="w-4 h-4" />
              </button>
              <div className="relative hidden sm:block" data-usermenu>
                <button
                  onClick={(e) => { e.stopPropagation(); setUserMenuOpen((o) => !o); }}
                  className="flex items-center gap-2 hover:bg-white/[0.04] rounded-lg pl-1 pr-2 py-1 transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <div className={
                    'w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0 ' +
                    (profile.role === 'admin'
                      ? 'bg-gradient-to-br from-purple-500 to-blue-500'
                      : 'bg-gradient-to-br from-gray-600 to-gray-700')
                  }>
                    {initials || '?'}
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="text-xs text-gray-200 font-semibold leading-tight">{profile.display_name}</div>
                    <div className={'text-[10px] font-mono uppercase tracking-wider leading-tight ' + (profile.role === 'admin' ? 'text-purple-300' : 'text-emerald-300')}>
                      {profile.role}
                    </div>
                  </div>
                  <ChevronDown className={'w-3.5 h-3.5 text-gray-500 transition-transform ' + (userMenuOpen ? 'rotate-180' : '')} />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1.5 w-64 bg-[#0a0a14] border border-white/10 rounded-xl shadow-2xl shadow-black/60 z-40 overflow-hidden"
                      role="menu"
                    >
                      <div className="p-3 border-b border-white/5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Signed in as</div>
                        <div className="text-sm text-white font-semibold truncate">{profile.display_name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">@{profile?.display_name ?? profile?.email}</div>
                      </div>
                      <button
                        data-testid="app-signout"
                        onClick={onSignOut}
                        className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-300 hover:bg-red-500/10 transition-colors"
                        role="menuitem"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                        <span className="ml-auto text-[10px] font-mono uppercase text-gray-600">end session</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar relative">
            <div className="max-w-6xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  {activeTab === 'cameras'    && <CameraGrid />}
                  {activeTab === 'events'     && <EventsList />}
                  {activeTab === 'evidence'   && <EvidenceLocker />}
                  {activeTab === 'threats'    && <ThreatMonitor />}
                  {activeTab === 'osint'      && <OsintShield />}
                  {activeTab === 'deployment' && isAdmin && <DeploymentGuide />}
                  {activeTab === 'users'      && isAdmin && <UsersTab />}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="max-w-6xl mx-auto mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-gray-600">
              <span>BATCOMPUTER · OMNISIGHT v3.0 · runtime nominal</span>
              <span className="flex items-center gap-2"><AlertTriangle className="w-3 h-3" /> logged: {new Date().toISOString().replace('T', ' ').slice(0, 19)}Z</span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

function StatusRow({ label, value, tone }: { label: string; value: string; tone: 'success' | 'warning' | 'error' | 'neutral' }) {
  const cls =
    tone === 'success' ? 'text-emerald-300' :
    tone === 'warning' ? 'text-amber-300' :
    tone === 'error'   ? 'text-red-300' : 'text-gray-300';
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className={'flex items-center gap-1.5 ' + cls}>
        {tone === 'success' && <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />}
        {value}
      </span>
    </div>
  );
}

function formatUptime(start: number): string {
  const ms = Date.now() - start;
  const m = Math.floor(ms / 60000);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return h + 'h ' + rm + 'm';
}

export default App;
function NotConfiguredScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="max-w-lg w-full bg-slate-900/70 border border-amber-500/30 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Supabase not configured
        </h2>
        <p className="text-sm text-slate-400 mt-2">No VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY detected in your .env. OmniSight cannot reach the auth backend.</p>
        <ol className="mt-4 space-y-1.5 text-sm text-slate-300 list-decimal list-inside">
          <li>Copy <code className="bg-slate-800 px-1 rounded">.env.example</code> to <code className="bg-slate-800 px-1 rounded">.env</code>.</li>
          <li>Run <code className="bg-slate-800 px-1 rounded">supabase start</code> in the app directory (boots the local Postgres stack via Docker).</li>
          <li>Copy the printed <strong>API URL</strong> + <strong>anon key</strong> into <code className="bg-slate-800 px-1 rounded">.env</code> as <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.</li>
          <li>Run <code className="bg-slate-800 px-1 rounded">bash scripts/bootstrap-admin.sh</code> to seed the admin account.</li>
          <li>Restart <code className="bg-slate-800 px-1 rounded">npm run dev</code>.</li>
        </ol>
      </div>
    </div>
  );
}
function SplashScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-blue-400 animate-pulse text-sm uppercase tracking-widest">Loading session...</div>
    </div>
  );
}

