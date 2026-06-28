import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { SecurityEvent } from '../types';
import { Radio, Zap, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { formatTimeAgo } from '../lib/format';

const TONE: Record<string, string> = {
  critical: 'text-red-300 border-red-500/30 bg-red-500/10',
  high:     'text-orange-300 border-orange-500/30 bg-orange-500/10',
  medium:   'text-amber-300 border-amber-500/30 bg-amber-500/10',
  low:      'text-blue-300 border-blue-500/30 bg-blue-500/10',
};

export function LiveTicker({ onJump }: { onJump: (tab: string) => void }) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  useEffect(() => {
    api.getEvents().then(setEvents);
    const intv = setInterval(() => api.getEvents().then(setEvents), 2000);
    return () => clearInterval(intv);
  }, []);

  const recent = events.slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        All Channels Quiet
      </div>
    );
  }

  const top = recent[0];
  const tone = TONE[top.severity] ?? TONE.low;
  const Icon = top.type === ('weapon_detected' as any) ? ShieldAlert : top.type === ('wireless_anomaly' as any) ? Radio : Zap;

  return (
    <button
      onClick={() => onJump('events')}
      className={'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-mono uppercase tracking-wider transition-all hover:brightness-110 ' + tone}
      title="Latest event — click to jump"
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="font-semibold normal-case">{top.type.replace(/_/g, ' ')}</span>
      <span className="opacity-60">·</span>
      <span className="opacity-90">{formatTimeAgo(top.timestamp ?? '')}</span>
      <ArrowUpRight className="w-3 h-3 opacity-70" />
    </button>
  );
}
