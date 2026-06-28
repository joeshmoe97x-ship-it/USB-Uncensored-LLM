import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { SecurityEvent } from '../types';
import { api } from '../lib/api';
import {
  AlertTriangle, Activity, ShieldAlert, Radio, Crosshair,
  Search, ChevronDown,
} from 'lucide-react';
import { formatTimestamp, formatTimeAgo } from '../lib/format';
import { DetailModal } from './DetailModal';

const SEVERITY: Record<string, { cls: string; label: string }> = {
  critical: { cls: 'bg-red-500/15 text-red-300 border-red-500/30',       label: 'Critical' },
  high:     { cls: 'bg-orange-500/15 text-orange-300 border-orange-500/30', label: 'High' },
  medium:   { cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',   label: 'Medium' },
  low:      { cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30',     label: 'Low' },
};

const TYPE_ICONS: Partial<Record<SecurityEvent['type'], ReactElement>> = {
  motion: <Activity className="w-3.5 h-3.5" />,
  tamper: <ShieldAlert className="w-3.5 h-3.5" />,
  intrusion: <AlertTriangle className="w-3.5 h-3.5" />,
  wireless_anomaly: <Radio className="w-3.5 h-3.5" />,
  weapon_detected: <Crosshair className="w-3.5 h-3.5 text-red-400 animate-pulse" />,
};

const SEVERITIES: SecurityEvent['severity'][] = ['low','medium','high','critical'];
const TYPES: SecurityEvent['type'][] = ['motion','tamper','intrusion','wireless_anomaly','weapon_detected'];

export default function EventsList() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [query, setQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SecurityEvent['severity'] | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<SecurityEvent['type'] | 'all'>('all');
  const [open, setOpen] = useState<SecurityEvent | null>(null);

  useEffect(() => {
    const fetch = () => api.getEvents().then(setEvents);
    fetch();
    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        const isWeapon = Math.random() > 0.7;
        api.createEvent({
          device_id: ['cam_01','cam_02','cam_03'][Math.floor(Math.random() * 3)] ?? 'cam_01',
          type: isWeapon ? 'weapon_detected' : (['motion','intrusion'] as const)[Math.floor(Math.random()*2)],
          severity: isWeapon ? 'critical' : (['low','medium','high'] as const)[Math.floor(Math.random()*3)],
          timestamp: new Date().toISOString(),
          ai_labels: isWeapon
            ? [['tactical_gear','long_rifle'],['pistol_hip'],['firearm_hands']][Math.floor(Math.random()*3)] ?? ['tactical_gear']
            : ['person'],
          evidence_ids: [],
        } as Partial<SecurityEvent>).then(fetch);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (q) {
        const haystack = (e.id + ' ' + e.device_id + ' ' + e.type + ' ' + (e.ai_labels ?? []).map(l => typeof l === 'string' ? l : l.label).join(' ')).toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [events, query, severityFilter, typeFilter]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    events.forEach((e) => { counts[e.severity]++; });
    return counts;
  }, [events]);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Security Events</h2>
          <p className="text-sm text-gray-400 mt-1">Live webhook intake from Frigate, IDS, and ONVIF bridges.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <Stat label="Total" value={events.length} tone="neutral" />
          <Stat label="Crit" value={stats.critical} tone="critical" />
          <Stat label="High" value={stats.high} tone="high" />
          <Stat label="Med" value={stats.medium} tone="medium" />
          <Stat label="Low" value={stats.low} tone="low" />
        </div>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by id, device, label..."
            className="w-full bg-[#0a0a14] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors"
          />
        </div>
        <Filter label="Severity" value={severityFilter} options={['all', ...SEVERITIES]} onChange={(v) => setSeverityFilter(v as typeof severityFilter)} />
        <Filter label="Type" value={typeFilter} options={['all', ...TYPES]} onChange={(v) => setTypeFilter(v as typeof typeFilter)} />
      </div>

      <div className="bg-[#0a0a14] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm min-w-[760px]">
            <thead className="bg-white/[0.02] text-gray-400 text-[10px] uppercase tracking-wider font-mono border-b border-white/5">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Device</th>
                <th className="px-4 py-3 font-medium">AI Labels</th>
                <th className="px-4 py-3 font-medium text-right">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-gray-500 font-mono">
                    No events match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((evt) => (
                  <tr key={evt.id} onClick={() => setOpen(evt)} className="hover:bg-white/[0.03] cursor-pointer transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">{evt.id}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-mono text-xs text-white">{formatTimestamp(evt.timestamp ?? '').split(', ')[1] ?? ''}</div>
                      <div className="text-[10px] text-gray-500">{formatTimeAgo(evt.timestamp ?? '')}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={'inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ' + (SEVERITY[evt.severity] ?? { cls: 'bg-gray-500/15 text-gray-300 border-gray-500/30', label: String(evt.severity).toUpperCase() }).cls}>
                        {(SEVERITY[evt.severity] ?? { cls: 'bg-gray-500/15 text-gray-300 border-gray-500/30', label: String(evt.severity).toUpperCase() }).label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">{TYPE_ICONS[evt.type] ?? <AlertTriangle className="w-3.5 h-3.5" />}</span>
                        <span className="capitalize">{evt.type.replace(/_/g, ' ')}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-blue-300">{evt.device_id}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(evt.ai_labels ?? []).map((l) => {
                          const text = typeof l === 'string' ? l : l.label;
                          return (
                            <span key={text} className="bg-white/[0.04] text-gray-300 px-1.5 py-0.5 rounded text-[10px] border border-white/10 font-mono">
                              {text}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {evt.evidence_ids.length > 0
                        ? <span className="text-emerald-300 font-mono text-xs">{evt.evidence_ids.length} files</span>
                        : <span className="text-gray-600 font-mono text-xs">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DetailModal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open ? open.type.replace(/_/g, ' ').toUpperCase() : ''}
        subtitle={open?.id}
      >
        {open && (
          <div className="space-y-4">
            <Field label="Timestamp" value={formatTimestamp(open.timestamp ?? '')} />
            <Field
              label="Severity"
              value={
                <span className={'px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ' + (SEVERITY[open.severity] ?? { cls: 'bg-gray-500/15 text-gray-300 border-gray-500/30', label: String(open.severity).toUpperCase() }).cls}>
                  {(SEVERITY[open.severity] ?? { cls: 'bg-gray-500/15 text-gray-300 border-gray-500/30', label: String(open.severity).toUpperCase() }).label}
                </span>
              }
            />
            <Field label="Source Device" value={<span className="font-mono text-blue-300">{open.device_id}</span>} />
            <Field
              label="AI Labels"
              value={
                <div className="flex flex-wrap gap-1">
                  {(open.ai_labels ?? []).map((l) => {
                    const text = typeof l === 'string' ? l : l.label;
                    return (
                      <span key={text} className="bg-white/[0.04] text-gray-300 px-1.5 py-0.5 rounded text-[11px] border border-white/10 font-mono">{text}</span>
                    );
                  })}
                </div>
              }
            />
            <Field label="Evidence" value={open.evidence_ids.length === 0 ? '—' : open.evidence_ids.join(', ')} />
          </div>
        )}
      </DetailModal>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mb-1">{label}</div>
      <div className="text-sm text-white">{value}</div>
    </div>
  );
}

function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const TONE: Record<string, string> = {
    motion:           'text-blue-300 border-blue-500/30 bg-blue-500/10',
    tamper:           'text-amber-300 border-amber-500/30 bg-amber-500/10',
    intrusion:        'text-orange-300 border-orange-500/30 bg-orange-500/10',
    wireless_anomaly: 'text-purple-300 border-purple-500/30 bg-purple-500/10',
    weapon_detected:  'text-red-300 border-red-500/30 bg-red-500/10',
    low:      'text-blue-300 border-blue-500/30 bg-blue-500/10',
    medium:   'text-amber-300 border-amber-500/30 bg-amber-500/10',
    high:     'text-orange-300 border-orange-500/30 bg-orange-500/10',
    critical: 'text-red-300 border-red-500/30 bg-red-500/10',
  };
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          'appearance-none bg-[#0a0a14] border border-white/10 rounded-lg pl-3 pr-8 py-2 text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-blue-500/40 transition-colors ' +
          (TONE[value] ?? 'text-gray-300')
        }
      >
        <option value="all" className="bg-[#0a0a14] text-gray-300">{label}: All</option>
        {options.filter((o) => o !== 'all').map((o) => (
          <option key={o} value={o} className="bg-[#0a0a14] text-gray-300">{label}: {o.replace(/_/g, ' ').toUpperCase()}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'neutral'|'critical'|'high'|'medium'|'low' }) {
  const TONE: Record<string, string> = {
    neutral: 'text-gray-300 bg-white/[0.03] border-white/10',
    critical: 'text-red-300 border-red-500/30 bg-red-500/10',
    high: 'text-orange-300 border-orange-500/30 bg-orange-500/10',
    medium: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
    low: 'text-blue-300 border-blue-500/30 bg-blue-500/10',
  };
  return (
    <div className={'px-2.5 py-1.5 rounded-lg border font-mono flex items-center gap-1.5 ' + TONE[tone]}>
      <span className="text-[9px] uppercase tracking-wider opacity-70">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}
