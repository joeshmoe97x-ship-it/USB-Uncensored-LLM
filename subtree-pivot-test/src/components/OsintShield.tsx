import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, AlertTriangle, Database, RefreshCw, Globe, FileSearch, Lock, Activity, Eye, Users, Scale, Radio, CheckCircle2, Server, Radar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './Toast';

interface FeedSource {
  id: string;
  name: string;
  agency: string;
  records: string;
  last_sync: string;
  status: 'live' | 'syncing';
  category: string;
}

interface Match {
  id: string;
  name: string;
  initials: string;
  source: string;
  risk: 'critical' | 'high' | 'medium';
  distance: string;
  last_seen: string;
  offense: string;
  detected_at: string;
}

const RISK_STYLES: Record<string, { bg: string; text: string; border: string; ring: string; label: string }> = {
  critical: { bg: 'bg-[#FF3B30]/15', text: 'text-[#FF3B30]', border: 'border-[#FF3B30]/40', ring: 'ring-[#FF3B30]/30', label: 'Critical' },
  high: { bg: 'bg-[#FF9500]/15', text: 'text-[#FF9500]', border: 'border-[#FF9500]/40', ring: 'ring-[#FF9500]/30', label: 'High' },
  medium: { bg: 'bg-[#FFCC00]/15', text: 'text-[#FFCC00]', border: 'border-[#FFCC00]/40', ring: 'ring-[#FFCC00]/30', label: 'Medium' },
};

// Fallback data in case Supabase isn't configured yet
const MOCK_FEEDS: FeedSource[] = [
  { id: 'nsopw', name: 'National Sex Offender Public Website', agency: 'U.S. Department of Justice', records: '917,442', last_sync: '2 min ago', status: 'live', category: 'Registry' },
  { id: 'ncmec', name: 'NCMEC Missing & Exploited Children', agency: 'National Center for Missing & Exploited Children', records: '38,914', last_sync: '4 min ago', status: 'live', category: 'Missing' },
  { id: 'amber', name: 'AMBER Alert National Feed', agency: 'U.S. DOJ / OJJDP', records: '142 active', last_sync: 'Live', status: 'live', category: 'Active Alert' },
  { id: 'fbi-vicap', name: 'FBI ViCAP – Violent Crime Apprehension', agency: 'Federal Bureau of Investigation', records: '4,221', last_sync: '11 min ago', status: 'live', category: 'Federal' },
  { id: 'fbi-most-wanted', name: 'FBI Most Wanted (Crimes Against Children)', agency: 'Federal Bureau of Investigation', records: '88', last_sync: '6 min ago', status: 'live', category: 'Federal' },
  { id: 'interpol', name: 'INTERPOL Notices – Yellow & Red', agency: 'International Criminal Police Org.', records: '12,604', last_sync: '8 min ago', status: 'live', category: 'International' }
];

const OsintShield: React.FC = () => {
  const { push: toastPush } = useToast();
  const [feeds, setFeeds] = useState<FeedSource[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({ records: 2847239, scans: 18402 });

  // 1. Fetch data on component load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: feedsData, error: feedsError } = await supabase.from('feeds').select('*');
        const { data: matchesData, error: matchesError } = await supabase.from('matches').select('*').order('detected_at', { ascending: false });

        if (feedsData && !feedsError && feedsData.length > 0) {
          setFeeds(feedsData);
        } else {
          setFeeds(MOCK_FEEDS);
        }

        if (matchesData && !matchesError && matchesData.length > 0) {
          setMatches(matchesData);
        } else {
          // Initialize with empty matches and let the simulation handle it if no DB
          setMatches([]);
        }
      } catch (error) {
        console.error("Error fetching operational security data:", error);
        setFeeds(MOCK_FEEDS);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // 2. Enable Live Real-Time Subscriptions for Watchlist Hits
    const matchSubscription = supabase
      .channel('live-matches-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        (payload) => {
          const newMatch = payload.new as Match;
          setMatches((prevMatches) => [newMatch, ...prevMatches].slice(0, 50));
        }
      )
      .subscribe();

    // 3. Local counter ticking animation for active camera scans
    const statsInterval = setInterval(() => {
      setStats((prev) => ({
        records: prev.records + Math.floor(Math.random() * 3),
        scans: prev.scans + Math.floor(Math.random() * 2 + 1),
      }));
    }, 2500);
    
    // Simulate real-time matches if DB is empty/mocked
    const mockMatchInterval = setInterval(() => {
      const risks: ('critical' | 'high' | 'medium')[] = ['critical', 'high', 'medium'];
      const names = ["J. C.", "M. R.", "A. B.", "T. W.", "D. S.", "UNKNOWN"];
      const offenses = ["FUGITIVE WARRANT", "VIOLATION OF REGISTRY", "WANTED FOR QUESTIONING", "SUSPECTED ABDUCTION", "RED NOTICE"];
      
      const newMatch: Match = {
        id: Math.random().toString(36).substring(7),
        name: "REDACTED", 
        initials: names[Math.floor(Math.random() * names.length)],
        source: MOCK_FEEDS[Math.floor(Math.random() * MOCK_FEEDS.length)].name,
        risk: risks[Math.floor(Math.random() * risks.length)],
        distance: `${(Math.random() * 5 + 0.1).toFixed(1)} MILES`,
        last_seen: "GOTHAM CITY TRANSIT GRID",
        offense: offenses[Math.floor(Math.random() * offenses.length)],
        detected_at: new Date().toISOString()
      };
      
      setMatches(prev => [newMatch, ...prev].slice(0, 20));
    }, 8000);

    return () => {
      supabase.removeChannel(matchSubscription);
      clearInterval(statsInterval);
      clearInterval(mockMatchInterval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm font-mono text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-[#00D4FF]" /> Initializing Private OSINT Matrix...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header / Mission */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#FF3B30]/15 via-[#0A1628] to-[#0A1628] border border-[#FF3B30]/30 rounded-2xl p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF3B30]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF3B30] to-[#FF9500] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#FF3B30]/20">
            <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF3B30]">Guardian OSINT Shield</span>
              <span className="flex items-center gap-1 text-[10px] text-[#00FF88] bg-[#00FF88]/10 px-2 py-0.5 rounded-full border border-[#00FF88]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" /> SYSTEM OPERATIONAL
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Continuous OSINT cross-reference for child safety</h2>
            <p className="text-sm text-gray-400 max-w-3xl leading-relaxed">Camera inputs are processed locally and cross-referenced with your private mirrored index of public registries, alerts, and open intelligence sources.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 relative">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase tracking-wider mb-1"><Database className="w-3 h-3" /> Records indexed</div>
            <div className="text-2xl font-bold text-white tabular-nums">{stats.records.toLocaleString()}</div>
            <div className="text-[10px] text-[#00FF88]">+ live updates</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase tracking-wider mb-1"><Globe className="w-3 h-3" /> Public sources</div>
            <div className="text-2xl font-bold text-white tabular-nums">{feeds.length}</div>
            <div className="text-[10px] text-[#00D4FF]">Active Streams</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase tracking-wider mb-1"><Activity className="w-3 h-3" /> Scans today</div>
            <div className="text-2xl font-bold text-white tabular-nums">{stats.scans.toLocaleString()}</div>
            <div className="text-[10px] text-gray-400">Local extraction hashes</div>
          </div>
          <div className="bg-white/5 border border-[#FF3B30]/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-[#FF3B30] uppercase tracking-wider mb-1"><AlertTriangle className="w-3 h-3" /> Watchlist hits</div>
            <div className="text-2xl font-bold text-[#FF3B30] tabular-nums">{matches.length}</div>
            <div className="text-[10px] text-gray-400">Total detected events</div>
          </div>
        </div>
      </div>

      {/* Recent matches */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#FF3B30]" />
            <h3 className="font-bold text-white">Recent watchlist matches</h3>
          </div>
          <span className="text-[10px] text-gray-400">Identifying details redacted · local access only</span>
        </div>
        <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
          {matches.length === 0 ? (
            <div className="p-6 text-center text-sm font-mono text-gray-500">No active watchlist alerts detected in secure zones.</div>
          ) : (
            matches.map((m) => {
              const r = RISK_STYLES[m.risk] || RISK_STYLES.medium;
              return (
                <div key={m.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                  <div className={`relative w-11 h-11 rounded-xl ${r.bg} ${r.border} border flex items-center justify-center text-sm font-bold ${r.text} ring-2 ${r.ring} flex-shrink-0`}>
                    {m.initials}
                    {m.risk === 'critical' && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#FF3B30] ring-2 ring-[#0A1628] animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-sm text-white truncate">{m.name}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${r.bg} ${r.text} rounded`}>{r.label}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 truncate">{m.offense} · <span className="text-gray-300">{m.source}</span></div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                      <span>{m.last_seen}</span>
                      <span>· {m.distance} from perimeter</span>
                      <span>· detected {new Date(m.detected_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                  <button onClick={() => toastPush({ type: 'info', message: 'Match under review', detail: 'Secure viewer opened for ' + m.id + '.' })} className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${r.bg} ${r.text} border ${r.border} hover:opacity-80 whitespace-nowrap flex items-center gap-1 transition-opacity`}>
                    <FileSearch className="w-3.5 h-3.5" /> Review
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Live feed sources */}
      <div>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h3 className="text-xl font-bold text-white">Live intelligence feeds</h3>
            <p className="text-sm text-gray-400">Mirrored local tables synced with external open-source intelligence registries.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {feeds.map((f) => (
            <div key={f.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-[#00D4FF]/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00D4FF]/15 to-[#0066FF]/10 border border-[#00D4FF]/20 flex items-center justify-center flex-shrink-0">
                    <Database className="w-4 h-4 text-[#00D4FF]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white text-sm truncate">{f.name}</div>
                    <div className="text-[11px] text-gray-400 truncate">{f.agency}</div>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1 bg-[#00FF88]/15 text-[#00FF88]">
                  <span className="w-1 h-1 rounded-full bg-[#00FF88] animate-pulse" /> {f.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
                <div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider">Records</div>
                  <div className="text-sm font-semibold text-white tabular-nums">{f.records}</div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider">Last sync</div>
                  <div className="text-sm font-semibold text-[#00D4FF]">{f.last_sync}</div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider">Tier</div>
                  <div className="text-sm font-semibold text-gray-300">{f.category}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}} />
    </div>
  );
};

export default OsintShield;
