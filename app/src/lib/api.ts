// API: cameras come from Supabase (RLS-aware). Events / Evidence / Threats
// are kept as in-memory demo data for now — they reference the camera `name`
// captured at event time, so the UI shows the correct camera label even after
// the camera ID switches to a UUID.
import { supabase } from './supabase';
import type {
  Camera, CameraAccess, SecurityEvent, Evidence, Threat, EvidenceMeta,
} from '../types';

// ----------------------------------------------------------------------------
// Back-compat shims (factory pattern)
//
// Each entity had a hand-rolled helper that allocated a fresh property-descriptor
// closure PER ROW. At 1k+ rows that cost adds up: a closure allocation + a
// `defineProperties` traversal per object, per read path.
//
// generateLegacyWrapper<T>(aliases) builds the descriptor map ONCE per entity
// type at module load, then reapplies it across every row via Object.defineProperties
// (which is an idempotent, allocation-free lookup against the cached map).
//
// SAFETY: getters are enumerable:true so React and JSON.stringify see them.
// Callers that POST/PATCH wrapped objects BACK to Supabase must use a plain
// Partial<...> patch instead of a `...camera` spread; legacy aliases would
// otherwise leak into the SQL payload (see camerasApi.update below).
// ----------------------------------------------------------------------------

function generateLegacyWrapper<T extends object>(aliases: Record<string, keyof T>) {
  // Pre-build the descriptor map ONCE at module load. Object.defineProperties
  // reuses these identical descriptors across every row, so we never allocate
  // a fresh closure-bound getter per call.
  const descriptors: PropertyDescriptorMap = {};
  for (const alias of Object.keys(aliases)) {
    const canonical = aliases[alias] as string;
    descriptors[alias] = {
      configurable: true,
      enumerable: true,
      get(this: T) { return (this as T)[canonical as keyof T]; },
    };
  }
  // Inner function reuses the OUTER T so callers that pass
  // `Partial<Camera>` or a supabase `Row` keep their entity-specific shape
  // across the .map(...) call site (preserves structural compatibility).
  return function applyLegacy(target: T): T {
    Object.defineProperties(target, descriptors);
    return target;
  };
}

const withLegacyCamera = generateLegacyWrapper<Camera>({
  device_id:  'id',
  ip_address: 'ip',
});

const withLegacyEvent = generateLegacyWrapper<{ happened_at: string; camera_id: string }>({
  timestamp: 'happened_at',
  device_id: 'camera_id',
});

const withLegacyEvidence = generateLegacyWrapper<{ captured_at: string; meta: unknown }>({
  timestamp: 'captured_at',
  metadata:  'meta',
});

// signal_info is a structured object (not a 1:1 key remap) so we build by hand.
function withLegacyThreat<T extends {
  detected_at: string;
  notes?: string;
  channel?: number;
  rssi_dbm?: number;
  source_mac: string;
  target_mac?: string;
}>(threat: T): T {
  Object.defineProperties(threat as object, {
    timestamp:   { configurable: true, enumerable: true, get() { return (this as T).detected_at; } },
    details:     { configurable: true, enumerable: true, get() { return (this as T).notes ?? ''; } },
    signal_info: { configurable: true, enumerable: true, get() {
      const self = this as T;
      return {
        channel:       self.channel,
        rssi_dbm:      self.rssi_dbm,
        bssid:         self.source_mac,
        target_bssid:  self.target_mac,
      };
    } },
  });
  return threat;
}



// ------------------------------ Cameras ---------------------------------

async function fetchCameras(): Promise<Camera[]> {
  const { data, error } = await supabase
    .from('cameras')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Camera[];
}

export const camerasApi = {
  list:   async () => (await fetchCameras()).map(withLegacyCamera),
  list_raw: () => fetchCameras(),
  create: async (c: Omit<Camera, 'id' | 'created_at'>) => withLegacyCamera((await supabase.from('cameras').insert(c).select('*').single()).data as Camera),
  update: async (id: string, patch: Partial<Camera>) => {
    // SAFETY: strip any legacy alias fields the caller may have spread from a
    // wrapped object — they would otherwise appear in the UPDATE payload and
    // hit `column "device_id" does not exist` in PostgreSQL.
    const { device_id: _d, ip_address: _i, ...cleanPatch } = patch as Partial<Camera> & { device_id?: unknown; ip_address?: unknown };
    const result = await supabase
      .from('cameras')
      .update(cleanPatch)
      .eq('id', id)
      .select('*')
      .single();
    if (result.error) throw result.error;
    return withLegacyCamera(result.data as Camera);
  },
  remove: (id: string) =>
    supabase.from('cameras').delete().eq('id', id).then(({ error }) => { if (error) throw error; }),

  // CameraAccess surface — RLS-aware SELECT of public.camera_access rows.
  // Admin (or camera owner) can read all rows; non-admin non-owners only see
  // their own grants. The UI in app/src/components/UsersTab.tsx uses this
  // to enumerate the per-camera viewer list before reaching for the typed
  // edge-action adminGrantAccess / adminRevokeAccess wrappers.
  //
  // Scope: no pagination, no per-camera/per-user filter. Acceptable for the
  // MVP demo (≤50 rows). Production scale (>10k rows) would want a range-
  // bounded fetch or cursor pagination.
  listAccess: async (): Promise<CameraAccess[]> => {
    const { data, error } = await supabase
      .from('camera_access')
      .select('*')
      .order('granted_at', { ascending: false }); // newest-first for UI grouping
    if (error) throw error;
    return (data ?? []) as unknown as CameraAccess[];
  },
};

// -------------- Events / Evidence / Threats (in-memory demo) ------------

class MockTail {
  events:    SecurityEvent[] = [];
  evidence:  Evidence[]      = [];
  threats:   Threat[]        = [];

  async listEvents(): Promise<SecurityEvent[]> {
    return [...this.events]
      .sort((a, b) => b.happened_at.localeCompare(a.happened_at))
      .map(withLegacyEvent) as unknown as SecurityEvent[];
  }
  async getEvent(id: string) {
    const e = this.events.find((x) => x.id === id);
    return e ? withLegacyEvent(e) : undefined;
  }
  async createEvent(e: Partial<SecurityEvent>): Promise<SecurityEvent> {
    // Default-fill: callers can pass a partial event (just the meaningful
    // fields like `type` / `severity` / `ai_labels` / `evidence_ids`) and the
    // server stamps id + happened_at + acknowledged=false. Deprecated
    // aliases (`device_id` / `timestamp`) fall through to their canonical
    // siblings when the caller prefers the legacy naming.
    const nowIso = new Date().toISOString();
    const camera_id = e.camera_id ?? e.device_id ?? '';
    const happened_at = e.happened_at ?? e.timestamp ?? nowIso;
    const event: SecurityEvent = {
      id: e.id ?? ('evt-' + Math.random().toString(36).slice(2, 12)),
      device_id: e.device_id ?? camera_id,
      camera_id,
      camera_name: e.camera_name ?? 'Unknown',
      type: e.type ?? 'motion',
      severity: e.severity ?? 'low',
      title: e.title ?? 'Auto-generated event',
      description: e.description ?? '',
      ai_labels: e.ai_labels ?? [],
      evidence_ids: e.evidence_ids ?? [],
      happened_at,
      timestamp: e.timestamp ?? happened_at,
      acknowledged: e.acknowledged ?? false,
    };
    this.events = [event, ...this.events];
    return event;
  }

  async listEvidence(): Promise<Evidence[]> {
    return [...this.evidence]
      .sort((a, b) => b.captured_at.localeCompare(a.captured_at))
      .map(withLegacyEvidence) as unknown as Evidence[];
  }
  async getEvidenceDownloadUrl(id: string): Promise<{ expires_in: number }> {
    // Demo: throw-when-not-found retained for parity with the prior `Promise<string>`
    // contract, but the response envelope is now `{ expires_in }` per the spec
    // shared with `camaras/app/docs/ops-notes.md`. In production this would carry a
    // signed URL too — kept narrower here because EvidenceLocker.tsx doesn't
    // currently consume the URL string at the call site.
    const ev = this.evidence.find((e) => e.id === id);
    if (!ev) throw new Error('Evidence not found');
    return { expires_in: 3600 };
  }
  async createEvidence(e: Evidence): Promise<Evidence> {
    this.evidence = [e, ...this.evidence];
    return e;
  }
  async generateReport(scope: string): Promise<{ generated_at: string; report_url: string }> {
    return {
      generated_at: new Date().toISOString(),
      report_url: `mock://omnisight/reports/${scope}/${Date.now()}.json`,
    };
  }

  async listThreats(): Promise<Threat[]> {
    return [...this.threats].sort((a, b) => b.detected_at.localeCompare(a.detected_at)).map(withLegacyThreat);
  }
  async createThreat(t: Threat): Promise<Threat> {
    this.threats = [t, ...this.threats];
    return t;
  }
}

export const mockTail = new MockTail();

// Boot once: seed demo events/evidence/threats with hedged camera labels so
// they survive the switch from local cameras to supabase-backed ones.
const SEED_NOW = () => new Date().toISOString();

(function seed() {
  // Empty by default — admins add camera data via the dashboard.
  // We seed a couple of sample events with no camera link so the EventsList
  // tab has interesting demo content out of the box.
  mockTail.events.push({
    id: 'evt-seed-001',
    camera_id: '',
    camera_name: 'Front Lobby',
    type: 'motion', severity: 'low', title: 'After-hours motion cluster', description: 'Three motion events in 4s near the loading bay door.',
    ai_labels: [{ label: 'person', confidence: 0.81 }], evidence_ids: [],
    happened_at: SEED_NOW(), acknowledged: false,
  });
  mockTail.events.push({
    id: 'evt-seed-002',
    camera_id: '',
    camera_name: 'Server Room',
    type: 'tamper', severity: 'high', title: 'Camera housing tilted 12°', description: 'Mounted housing was visibly misaligned when re-bounding box recalibrated.',
    evidence_ids: [], happened_at: SEED_NOW(), acknowledged: false,
  });
  mockTail.threats.push({
    id: 'thr-seed-001', type: 'rogue_ap', severity: 'medium',
    source_mac: 'AA:BB:CC:DD:EE:01', channel: 6, rssi_dbm: -64,
    detected_at: SEED_NOW(), resolved: false, notes: 'Open SSID detected near loading dock.',
  });
})();

export const api = {
  getCameras: () => camerasApi.list(),
  getCamera:  async (id: string): Promise<Camera | null> => {
    const { data, error } = await supabase.from('cameras').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? (withLegacyCamera(data as Camera & { ip?: string }) as Camera) : null;
  },
  getEvents: () => mockTail.listEvents(),
  getEvent:  (id: string) => mockTail.getEvent(id),
  createEvent: (e: Partial<SecurityEvent>) => mockTail.createEvent(e),
  getEvidenceList: () => mockTail.listEvidence(),
  createEvidence: (e: Evidence) => mockTail.createEvidence(e),
  getEvidenceDownloadUrl: (id: string) => mockTail.getEvidenceDownloadUrl(id),
  generateReport: (scope = 'all') => mockTail.generateReport(scope),
  getThreats: () => mockTail.listThreats(),
  createThreat: (t: Threat) => mockTail.createThreat(t),
};
