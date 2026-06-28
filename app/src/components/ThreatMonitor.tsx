import { useEffect, useState } from 'react';
import { Threat } from '../types';
import { api } from '../lib/api';
import {
  ShieldAlert, Wifi, Target, Activity, Ban, CheckCircle2,
  Signal, Clock,
} from 'lucide-react';
import { formatTimeAgo, formatTimestamp } from '../lib/format';
import { useToast } from './Toast';

const TYPE_META: Record<Threat['type'], { label: string; cls: string; Icon: typeof ShieldAlert }> = {
  deauth_attack: { label: 'Deauth Attack', cls: 'border-red-500/30 bg-red-500/10 text-red-300',     Icon: ShieldAlert },
  jamming:        { label: 'Jamming',       cls: 'border-orange-500/30 bg-orange-500/10 text-orange-300', Icon: Signal },
  rogue_ap:       { label: 'Rogue AP',      cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300', Icon: Wifi },
  mac_spoofing:   { label: 'MAC Spoofing',  cls: 'border-purple-500/30 bg-purple-500/10 text-purple-300', Icon: Activity },
};

export default function ThreatMonitor() {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [acked, setAcked] = useState<Set<string>>(new Set());
  const { push } = useToast();

  useEffect(() => { api.getThreats().then(setThreats); }, []);

  const blockMac = (mac: string, id: string) => {
    setBlocked((b) => { const s = new Set(b); s.add(mac); return s; });
    setAcked((a) => { const s = new Set(a); s.add(id); return s; });
    push({ type: 'success', message: 'MAC blocked', detail: mac + ' added to firewall blacklist' });
  };

  const ack = (id: string) => {
    setAcked((a) => { const s = new Set(a); s.add(id); return s; });
    push({ type: 'info', message: 'Threat acknowledged' });
  };

  const stats = {
    total: threats.length,
    active: threats.filter((t) => !acked.has(t.id)).length,
    blocked: blocked.size,
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Wireless Threat Layer</h2>
          <p className="text-sm text-gray-400 mt-1">
            Sniffing <code className="text-blue-300 font-mono">wlan0mon</code> for 802.11 attacks via scapy + nzyme.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Pill label="Active" value={stats.active} tone={stats.active > 0 ? 'danger' : 'success'} />
          <Pill label="Blocked" value={stats.blocked} tone="warning" />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full text-xs font-bold text-red-300 uppercase tracking-wider font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> WIDS Armed
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3">
        {threats.map((threat) => {
          const meta = TYPE_META[threat.type as keyof typeof TYPE_META] ?? { label: String(threat.type ?? 'Unknown').toUpperCase(), cls: 'border-gray-500/30 bg-gray-500/10 text-gray-300', Icon: ShieldAlert };
          const Icon = meta.Icon;
          const isBlocked = blocked.has(threat.signal_info?.target_mac ?? threat.target_mac);
          const isAck = acked.has(threat.id);
          const sigPct = Math.max(0, Math.min(100, ((threat.signal_info?.rssi ?? (threat.signal_info?.rssi ?? threat.signal_info?.rssi_dbm ?? 0) + 90) / 60) * 100));
          const sigColor =
            threat.signal_info?.rssi ?? (threat.signal_info?.rssi ?? threat.signal_info?.rssi_dbm ?? 0) > -50 ? 'bg-red-500' :
            threat.signal_info?.rssi ?? (threat.signal_info?.rssi ?? threat.signal_info?.rssi_dbm ?? 0) > -70 ? 'bg-amber-500' : 'bg-emerald-500';
          return (
            <div
              key={threat.id}
              className={
                'bg-[#0a0a14] border rounded-xl p-5 relative overflow-hidden transition-colors ' +
                (isBlocked ? 'border-emerald-500/30' : 'border-red-500/20')
              }
            >
              {!isAck && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse" />}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={'p-2 rounded-lg border shrink-0 ' + meta.cls}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2 flex-wrap">
                      <span className={isBlocked ? 'text-emerald-300' : 'text-red-300'}>{meta.label}</span>
                      {isBlocked && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                          BLOCKED
                        </span>
                      )}
                      {isAck && !isBlocked && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-gray-400">
                          ACKED
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-300 mt-0.5">{threat.details}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-mono text-gray-500">
                    <Clock className="inline w-3 h-3 mr-1" />{formatTimeAgo(threat.timestamp)}
                  </div>
                  <div className="text-[10px] font-mono text-gray-600 mt-0.5">{formatTimestamp(threat.timestamp)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-black/30 rounded-lg p-3 border border-white/5">
                <Stat icon={<Target className="w-3.5 h-3.5" />} label="Target MAC" value={threat.signal_info?.target_mac ?? threat.target_mac} mono />
                <Stat
                  icon={<Activity className="w-3.5 h-3.5" />}
                  label="RSSI"
                  value={threat.signal_info?.rssi ?? (threat.signal_info?.rssi ?? threat.signal_info?.rssi_dbm ?? 0) + ' dBm'}
                >
                  <div className="mt-1.5 h-1 rounded-full bg-white/5 overflow-hidden">
                    <div className={'h-full ' + sigColor} style={{ width: sigPct + '%' }} />
                  </div>
                </Stat>
                <Stat icon={<Wifi className="w-3.5 h-3.5" />} label="Frequency" value={threat.signal_info?.frequency ?? 0} mono />
                <Stat icon={<Signal className="w-3.5 h-3.5" />} label="Sensor" value={threat.source_mac} mono />
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  disabled={isBlocked}
                  onClick={() => blockMac(threat.signal_info?.target_mac ?? threat.target_mac, threat.id)}
                  className={
                    'px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border transition-colors flex items-center gap-1.5 ' +
                    (isBlocked
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 cursor-not-allowed'
                      : 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30')
                  }
                >
                  <Ban className="w-3.5 h-3.5" /> {isBlocked ? 'Blocked' : 'Block MAC'}
                </button>
                <button
                  disabled={isAck}
                  onClick={() => ack(threat.id)}
                  className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border-white/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledge
                </button>
                <button className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border-white/10 transition-colors">
                  PCAP Download
                </button>
              </div>
            </div>
          );
        })}

        {threats.length === 0 && (
          <div className="p-12 text-center border border-dashed border-white/10 rounded-xl">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-300" />
            </div>
            <h3 className="text-emerald-300 font-semibold text-sm">Spectral field is clear.</h3>
            <p className="text-gray-500 text-xs font-mono mt-1">No active wireless threats detected on monitored bands.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, mono, children }: { icon: React.ReactNode; label: string; value: string | number | undefined; mono?: boolean; children?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[9px] text-gray-500 uppercase tracking-wider">
        {icon} {label}
      </div>
      <div className={'text-sm mt-0.5 ' + (mono ? 'font-mono text-white' : 'text-white')}>{value}</div>
      {children}
    </div>
  );
}

function Pill({ label, value, tone }: { label: string; value: number; tone: 'success' | 'danger' | 'warning' }) {
  const cls =
    tone === 'success' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' :
    tone === 'warning' ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' :
    'text-red-300 bg-red-500/10 border-red-500/30';
  return (
    <div className={'px-2.5 py-1.5 rounded-lg border font-mono flex items-center gap-1.5 ' + cls}>
      <span className="text-[9px] uppercase tracking-wider opacity-70">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}
