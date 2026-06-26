import { useEffect, useMemo, useState } from 'react';
import { Camera as CameraType, SecurityEvent } from '../types';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import {
  Video, WifiOff, Settings, Maximize2, ShieldAlert,
  Activity, Cpu, Volume2, VolumeX, Camera as CameraIcon,
} from 'lucide-react';
import { useToast } from './Toast';
import { DetailModal } from './DetailModal';

const BRAND = {
  eseecloud:    { label: 'ESEECLOUD',    cls: 'text-blue-300 bg-blue-500/10 border-blue-500/30' },
  huntervision: { label: 'HUNTERVISION', cls: 'text-orange-300 bg-orange-500/10 border-orange-500/30' },
  ajcloud:      { label: 'AJCLOUD',      cls: 'text-purple-300 bg-purple-500/10 border-purple-500/30' },
  onvif:        { label: 'ONVIF',        cls: 'text-gray-300 bg-gray-500/10 border-gray-500/30' },
} as const;

// Deterministic per-camera codec/latency/fps so refreshes don't flicker.
function fakeStats(cam: CameraType) {
  const seed = cam.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const latency = 18 + (seed % 14);
  const fps = 28 + (seed % 5);
  const kbps = 1800 + (seed * 13 % 1200);
  const codec = (seed % 2) === 0 ? 'H.265' : 'H.264';
  const sig = -42 - (seed % 18);
  return { latency, fps, kbps, codec, sig };
}

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const top = pos.startsWith('t');
  const left = pos.endsWith('l');
  return (
    <span
      className={
        'absolute w-2.5 h-2.5 border-red-500 ' +
        (top ? 'top-[-1px] border-t-2 ' : 'bottom-[-1px] border-b-2 ') +
        (left ? 'left-[-1px] border-l-2' : 'right-[-1px] border-r-2')
      }
    />
  );
}

export default function CameraGrid() {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Record<string, SecurityEvent>>({});
  const [focused, setFocused] = useState<CameraType | null>(null);
  const [muted, setMuted] = useState(true);
  const { push } = useToast();

  useEffect(() => {
    // Initial fetch — may be empty if mounted before sign-in completes.
    // CameraGrid lives at the App-level so it does NOT re-mount on auth
    // change; without the onAuthStateChange re-fetch below it would render
    // the empty anon request Response[] for an admin who signed in post-mount.
    api.getCameras().then(setCameras);
    // Re-fetch on auth state transitions. SIGNED_IN + TOKEN_REFRESHED
    // re-attach the user's JWT to subsequent REST calls so the cameras_select
    // RLS USING-clause (is_admin() | has_camera_access(id) | owner_id == auth.uid())
    // evaluates under the NEW JWT and the admin sees both cameras. SIGNED_OUT
    // clears the grid (no leakage of the previous user's cameras).
    const authSub = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        api.getCameras().then(setCameras);
      } else if (event === 'SIGNED_OUT') {
        setCameras([]);
      }
    });
    const interval = setInterval(() => {
      api.getEvents().then((events) => {
        const recent = events.filter(
          (e) => e.type === 'weapon_detected' && new Date(e.timestamp).getTime() > Date.now() - 6000
        );
        const map: Record<string, SecurityEvent> = {};
        recent.forEach((w) => { if (!map[w.device_id]) map[w.device_id] = w; });
        setActiveAlerts(map);
      });
    }, 1000);
    return () => {
      // supabase-js v2.45.x: onAuthStateChange returns {data: {subscription}}.
      // unsubscribe is always defined on the v2 subscription, so the trailing
      // `?.()` is redundant; cleaned up to just `authSub?.data?.subscription?.unsubscribe()`.
      // The optional chain on `data`/`subscription` is retained so older
      // shimmed versions that return `{subscription}` directly still no-op
      // cleanly rather than throw on `.data` of undefined.
      authSub?.data?.subscription?.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const summary = useMemo(() => {
    const online = cameras.filter((c) => c.status === 'online').length;
    return { online, total: cameras.length, alerts: Object.keys(activeAlerts).length };
  }, [cameras, activeAlerts]);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Unified Camera Grid
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider px-2 py-0.5 border border-white/10 rounded-full">live</span>
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Aggregating <span className="text-white font-mono">EseeCloud</span> ·{' '}
            <span className="text-white font-mono">HunterVision</span> ·{' '}
            <span className="text-white font-mono">AJCloud</span> ·{' '}
            <span className="text-white font-mono">ONVIF</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Pill label="Online" value={summary.online + '/' + summary.total} tone="success" />
          <Pill label="Alerts" value={String(summary.alerts)} tone={summary.alerts > 0 ? 'danger' : 'neutral'} />
          <button
            onClick={() => push({ type: 'success', message: 'Source added', detail: 'New RTSP feed is being ingested by Frigate.' })}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <CameraIcon className="w-4 h-4" /> Add Source
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cameras.map((cam) => {
          const alert = activeAlerts[cam.id ?? ''];
          const brand = BRAND[cam.brand];
          const stats = fakeStats(cam);
          return (
            <div
              data-testid="camera-card"
              key={cam.id}
              className={
                'bg-[#0a0a14] border rounded-xl overflow-hidden flex flex-col relative transition-colors ' +
                (alert
                  ? 'border-red-500/40 shadow-[0_0_0_1px_rgba(239,68,68,0.18),0_8px_32px_-12px_rgba(239,68,68,0.5)]'
                  : 'border-white/5')
              }
            >
              <div
                className="relative aspect-video bg-black flex items-center justify-center border-b border-white/5 group overflow-hidden cursor-pointer"
                onClick={() => cam.status === 'online' && setFocused(cam)}
              >
                {cam.status === 'online' ? (
                  <>
                    <video
                      src={cam.stream_url}
                      autoPlay loop muted={muted} playsInline
                      className={
                        'w-full h-full object-cover transition-all duration-300 ' +
                        (alert ? 'opacity-60 grayscale contrast-125' : 'opacity-90 group-hover:opacity-100')
                      }
                    />
                    {/* Surveillance overlays */}
                    <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay bg-[repeating-linear-gradient(180deg,transparent_0_3px,white_3px_4px)]" />
                    <div className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay bg-[radial-gradient(circle_at_50%_50%,white_1px,transparent_2px)] bg-[length:6px_6px]" />

                    {/* Lethal threat overlay */}
                    {alert && (
                      <div className="absolute inset-0 border-4 border-red-500 pointer-events-none flex flex-col items-center justify-center bg-red-500/10">
                        <div className="absolute top-3 bg-red-600 text-white px-3 py-1.5 font-bold flex items-center gap-2 animate-pulse uppercase tracking-wider text-[11px] shadow-[0_0_24px_rgba(220,38,38,0.7)] rounded">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Lethal Threat · {(alert.ai_labels ?? []).map(x => typeof x === 'string' ? x : x.label).join(' + ').replace(/_/g, ' ')}
                        </div>
                        <div
                          className="absolute w-32 h-44 border border-red-500/80 bg-red-500/10 rounded-sm"
                          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                        >
                          <div className="absolute -top-5 left-[-1px] bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 whitespace-nowrap font-mono tracking-wider rounded-sm">TARGET ACQUIRED</div>
                          <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />
                        </div>
                      </div>
                    )}

                    {/* HUD top-left: brand & channel */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className={'text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono ' + brand.cls}>
                        {brand.label}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 backdrop-blur text-white border border-white/10 tracking-wider">
                        CH-{cam.id.split('_')[1]}
                      </span>
                    </div>
                    {/* HUD top-right: REC + fps */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      {!alert && (
                        <span className="bg-black/70 backdrop-blur px-1.5 py-1 rounded text-[9px] font-mono text-white flex items-center gap-1 border border-white/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
                        </span>
                      )}
                      <span className="bg-black/70 backdrop-blur px-1.5 py-1 rounded text-[9px] font-mono text-white border border-white/10">
                        {stats.fps}fps
                      </span>
                    </div>
                    {/* HUD bottom-left: technical readout */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between text-[9px] font-mono text-white/80">
                      <div className="bg-black/70 backdrop-blur px-2 py-1 rounded border border-white/10 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3 h-3" /> {stats.codec} · {stats.kbps} kbps
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Cpu className="w-3 h-3" /> {stats.latency}ms · σ {stats.sig}dBm
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
                          className="p-1.5 bg-black/70 backdrop-blur rounded text-white border border-white/10 hover:bg-black/90"
                          aria-label={muted ? 'Unmute' : 'Mute'}
                        >
                          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFocused(cam); }}
                          className="p-1.5 bg-black/70 backdrop-blur rounded text-white border border-white/10 hover:bg-black/90"
                          aria-label="Expand"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-600 flex flex-col items-center gap-2 select-none">
                    <WifiOff className="w-8 h-8" />
                    <span className="text-sm font-mono uppercase tracking-wider">Stream Offline</span>
                    <span className="text-[10px] text-gray-700 font-mono">Last seen 3m ago</span>
                  </div>
                )}
              </div>

              {/* Footer nameplate */}
              <div className={'px-3.5 py-3 flex items-center justify-between gap-2 ' + (alert ? 'bg-red-500/[0.06]' : '')}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Video className={'w-3.5 h-3.5 ' + (alert ? 'text-red-400' : 'text-gray-400')} />
                    <h3 data-testid="camera-name" className={'text-sm font-bold truncate ' + (alert ? 'text-red-300' : 'text-white')}>{cam.name}</h3>
                  </div>
                  <div className={'text-[10px] font-mono ' + (alert ? 'text-red-400/70' : 'text-gray-500')}>
                    {cam.ip_address} · {alert?.evidence_ids.length ?? 0} evidence
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => push({ type: 'info', message: 'Snapshot captured', detail: 'Stored ' + cam.name + ' frame to evidence locker.' })}
                    className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                    aria-label="Snapshot"
                  >
                    <CameraIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                    aria-label="Settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <DetailModal
        open={!!focused}
        onClose={() => setFocused(null)}
        title={focused?.name ?? ''}
        subtitle={focused?.ip_address}
        maxWidthClass="max-w-3xl"
      >
        {focused && (
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative border border-white/10">
              <video src={focused.stream_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay bg-[repeating-linear-gradient(180deg,transparent_0_3px,white_3px_4px)]" />
              <div className="absolute top-3 left-3 text-[10px] font-mono bg-black/70 px-2 py-1 rounded text-white border border-white/10">
                {BRAND[focused.brand].label} · {focused.id}
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-mono">
                <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded animate-pulse">LIVE</span>
                <span className="bg-black/70 text-white border border-white/10 px-1.5 py-0.5 rounded">{fakeStats(focused).fps}fps</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <Stat label="Codec" value={fakeStats(focused).codec} />
              <Stat label="Bitrate" value={fakeStats(focused).kbps + ' kbps'} />
              <Stat label="Latency" value={fakeStats(focused).latency + ' ms'} />
              <Stat label="Signal" value={fakeStats(focused).sig + ' dBm'} />
            </div>
            <p className="text-xs text-gray-500">
              Stream is being ingested by Frigate on <code className="text-blue-300">rtsp://omnisight-api:8000</code> and re-emitted for the dashboard via WebRTC.
            </p>
          </div>
        )}
      </DetailModal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-white mt-0.5">{value}</div>
    </div>
  );
}

function Pill({ label, value, tone }: { label: string; value: string; tone: 'success' | 'danger' | 'neutral' }) {
  const cls =
    tone === 'success' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' :
    tone === 'danger'  ? 'text-red-300 bg-red-500/10 border-red-500/30' :
    'text-gray-300 bg-white/[0.03] border-white/10';
  return (
    <div className={'text-[11px] font-mono px-2.5 py-1.5 rounded-lg border flex items-center gap-2 ' + cls}>
      <span className="opacity-70 uppercase tracking-wider text-[9px]">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}
