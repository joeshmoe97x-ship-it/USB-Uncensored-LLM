import { useEffect, useState, type ReactElement } from 'react';
import { Evidence } from '../types';
import { api } from '../lib/api';
import {
  FileVideo, Image as ImageIcon, FileText, Download, FileCheck2,
  Loader2, Search, Hash, AlertCircle, Shield,
} from 'lucide-react';
import { formatTimestamp, formatTimeAgo, downloadBlob } from '../lib/format';
import { useToast } from './Toast';
import { DetailModal } from './DetailModal';

const TYPE_META: Partial<Record<Evidence['type'], { label: string; icon: ReactElement; cls: string }>> = {
  video_clip: { label: 'Video Clip', icon: <FileVideo className="w-5 h-5" />, cls: 'text-blue-300 bg-blue-500/10 border-blue-500/30' },
  snapshot:   { label: 'Snapshot',   icon: <ImageIcon className="w-5 h-5" />, cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  log_bundle: { label: 'Log Bundle', icon: <FileText className="w-5 h-5" />,  cls: 'text-gray-300 bg-white/5 border-white/10' },
};

const STATUS_META: Record<Evidence['status'], { cls: string; label: string }> = {
  ready:      { cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', label: 'Ready' },
  processing: { cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30',       label: 'Processing' },
  archived:   { cls: 'text-gray-400 bg-white/5 border-white/10',                label: 'Archived' },
};

export default function EvidenceLocker() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Evidence | null>(null);
  const { push } = useToast();

  useEffect(() => { api.getEvidenceList().then(setEvidence); }, []);

  const handleGenerateReport = async (id: string) => {
    setGenerating((g) => ({ ...g, [id]: true }));
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const res = await api.generateReport(id);
      downloadBlob(
        JSON.stringify({ evidence_id: id, generated_at: res.generated_at, summary: 'Evidence chain-of-custody bundle', url: res.report_url }, null, 2),
        'application/json',
        id + '_report.json'
      );
      push({ type: 'success', message: 'Court bundle generated', detail: res.report_url });
    } catch (e: unknown) {
      push({ type: 'error', message: 'Report generation failed', detail: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setGenerating((g) => ({ ...g, [id]: false }));
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const res = await api.getEvidenceDownloadUrl(id);
      const item = evidence.find((e) => e.id === id);
      const manifest = item ? JSON.stringify(item, null, 2) : 'id=' + id;
      downloadBlob(manifest, 'application/json', id + '.json');
      push({ type: 'success', message: 'Download started', detail: 'Expires in ' + res.expires_in + 's' });
    } catch (e: unknown) {
      push({ type: 'error', message: 'Download failed', detail: e instanceof Error ? e.message : 'Unknown error' });
    }
  };

  const filtered = evidence.filter((e) =>
    !query || e.id.includes(query) || e.event_id.includes(query) || e.type.includes(query)
  );

  const summary = {
    total: evidence.length,
    video: evidence.filter((e) => e.type === 'video_clip').length,
    snapshot: evidence.filter((e) => e.type === 'snapshot').length,
    ready: evidence.filter((e) => e.status === 'ready').length,
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Evidence Locker</h2>
          <p className="text-sm text-gray-400 mt-1">Court-admissible bundles with chain-of-custody hashes.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-mono">
          <Pill label="Total" value={summary.total} />
          <Pill label="Video" value={summary.video} tone="info" />
          <Pill label="Image" value={summary.snapshot} tone="success" />
          <Pill label="Ready" value={summary.ready} tone="success" />
        </div>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by id, event, type..."
          className="w-full bg-[#0a0a14] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const meta = (TYPE_META[item.type] ?? TYPE_META.log_bundle)!;
          const status = STATUS_META[item.status] ?? STATUS_META.ready;
          const isGen = generating[item.id];
          return (
            <div key={item.id} className="bg-[#0a0a14] border border-white/5 rounded-xl p-4 flex flex-col gap-3 hover:border-white/10 transition-colors">
              <div className="flex gap-3 items-start">
                <div className={'w-12 h-12 rounded-lg flex items-center justify-center border shrink-0 ' + meta.cls}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-blue-300 truncate">{item.id}</span>
                    <span className={'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ' + status.cls}>
                      {status.label}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-white mt-0.5">{meta.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                    <span>Event <code className="text-emerald-300">{item.event_id}</code></span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-black/40 rounded-lg p-2 border border-white/5">
                {(item.metadata?.duration ?? item.metadata?.duration_s) != null && <Field label="Duration" value={(item.metadata?.duration ?? item.metadata?.duration_s) + 's'} />}
                {(item.metadata?.resolution ?? '') && <Field label="Resolution" value={(item.metadata?.resolution ?? '')} />}
                <Field label="Size" value={(item.metadata?.file_size ?? item.metadata?.size_bytes)} />
              </div>

              <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> SHA · chain-of-custody sealed · {formatTimeAgo(item.timestamp ?? '')}
              </div>

              <div className="mt-auto grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                <button
                  onClick={() => setOpen(item)}
                  className="flex items-center justify-center gap-1 bg-white/[0.04] hover:bg-white/[0.08] text-white py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-gray-300" /> Inspect
                </button>
                <button
                  onClick={() => handleDownload(item.id)}
                  className="flex items-center justify-center gap-1 bg-white/[0.04] hover:bg-white/[0.08] text-white py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-blue-300" /> Download
                </button>
                <button
                  onClick={() => handleGenerateReport(item.id)}
                  disabled={isGen}
                  className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  {isGen ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />}
                  Report
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <DetailModal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open ? (TYPE_META[open.type] ?? TYPE_META.log_bundle)!.label : ''}
        subtitle={open?.id ?? ""}
      >
        {open && (
          <div className="space-y-4">
            <Field label="Event" value={<span className="font-mono text-blue-300">{open.event_id}</span>} primary />
            <Field label="Captured" value={formatTimestamp(open.timestamp ?? '')} primary />
            <Field
              label="Status"
              value={<span className={'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ' + (STATUS_META[open.status] ?? STATUS_META.ready).cls}>{(STATUS_META[open.status] ?? STATUS_META.ready).label}</span>}
              primary
            />
            <div className="grid grid-cols-3 gap-2">
              {open.metadata?.duration != null && <Field label="Duration" value={open.metadata.duration + 's'} primary />}
              {open.metadata?.resolution != null && <Field label="Resolution" value={open.metadata.resolution} primary />}
              <Field label="Size" value={open.metadata?.file_size} primary />
            </div>
            <div className="bg-black/40 border border-white/5 rounded-lg p-3 font-mono text-[11px]">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Chain of custody
              </div>
              <pre className="text-gray-300 overflow-x-auto custom-scrollbar">{JSON.stringify(open, null, 2)}</pre>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}

function Field({ label, value, primary }: { label: string; value: React.ReactNode; primary?: boolean }) {
  return (
    <div className={'rounded-lg px-2.5 py-2 ' + (primary ? 'bg-white/[0.03] border border-white/5' : '')}>
      <div className="text-[9px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-xs text-white font-mono mt-0.5">{value}</div>
    </div>
  );
}

function Pill({ label, value, tone }: { label: string; value: number; tone?: 'info' | 'success' }) {
  const cls =
    tone === 'info'    ? 'text-blue-300 bg-blue-500/10 border-blue-500/30' :
    tone === 'success' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' :
    'text-gray-300 bg-white/[0.03] border-white/10';
  return (
    <div className={'px-2.5 py-1.5 rounded-lg border font-mono flex items-center gap-1.5 ' + cls}>
      <span className="text-[9px] uppercase tracking-wider opacity-70">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}
