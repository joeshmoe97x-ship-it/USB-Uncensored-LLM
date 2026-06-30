// Domain types. Kept in one place so the SQL schema (supabase/migrations),
// the client API, and UI components share a single source of truth.

// ------------------------------ Cameras ---------------------------------

export type CameraStatus = 'online' | 'offline' | 'degraded' | 'maintenance';

export interface Camera {
  id: string;
  /** @deprecated Read `id` instead. components.legacyShape() populates this automatically. */
  device_id?: string;
  /** @deprecated Read `ip` instead. components.legacyShape() populates this automatically. */
  ip_address?: string;
  owner_id: string;
  name: string;
  brand?: string;
  model?: string;
  ip?: string;
  location?: string;
  status: CameraStatus;
  stream_url?: string;
  codec?: string;
  resolution?: string;
  fps?: number;
  created_at?: string;
}

// ------------------------------- Events ---------------------------------

export type SecurityEventType =
  
  | 'fence_breach'
  | 'fire_smoke'
  | 'intrusion'
  | 'line_crossing'
  | 'loitering'
  | 'motion'
  | 'object_left'
  | 'tamper'
  | 'weapon_detected'
  | 'wireless_anomaly'
;

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface AILabelStructured { label: string; confidence: number; bbox?: [number, number, number, number]; }
export type AILabel = string | AILabelStructured;

export interface SecurityEvent {
  id: string;
  /** @deprecated Read `camera_id` instead. */
  device_id?: string;
  camera_id: string;
  camera_name: string;
  type: SecurityEventType;
  severity: Severity;
  title: string;
  description: string;
  ai_labels?: AILabel[];
  evidence_ids: string[];
  happened_at: string;
  /** @deprecated Read `happened_at` instead. seed/api populate both. */
  timestamp?: string;
  acknowledged: boolean;
}

// ------------------------------ Evidence --------------------------------

export type EvidenceType =
  | 'video' | 'snapshot' | 'audio' | 'log' | 'pcap'
  /** @deprecated Alias of `video`. */ | 'video_clip'
  /** @deprecated Alias of `log`. */ | 'log_bundle';

export interface EvidenceMeta {
  width?: number;
  height?: number;
  duration_s?: number;
  sha256?: string;
  size_bytes?: number;
  duration?: number;
  resolution?: string;
  file_size?: number;

}

export interface Evidence {
  id: string;
  event_id: string;
  /** @deprecated Maps to `captured_at` when absent. */
  generated_at?: string;
  type: EvidenceType;
  /** @deprecated URL to a populated report (e.g. PDF/JSON) for this evidence. */
  report_url?: string;
  /** @deprecated Seconds until the report_url download expires. */
  expires_in?: number;
  status: 'processing' | 'ready' | 'archived';
  captured_at: string;
  /** @deprecated Read `captured_at` instead. */
  timestamp?: string;
  url: string;
  meta: EvidenceMeta;
  /** @deprecated Read `meta` instead. */
  metadata?: EvidenceMeta;
  chain_of_custody: Array<{ at: string; actor: string; action: string; }>;
}

// ------------------------------- Threats --------------------------------

export type ThreatType = 'deauth_attack' | 'jamming' | 'rogue_ap' | 'mac_spoofing';

export interface Threat {
  id: string;
  type: ThreatType;
  severity: Severity;
  source_mac: string;
  target_mac?: string;
  channel?: number;
  rssi_dbm?: number;
  detected_at: string;
  /** @deprecated Read `detected_at` instead. */
  timestamp?: string;
  resolved: boolean;
  notes?: string;
  /** @deprecated Aggregate of {channel, rssi_dbm, source_mac, target_mac}; populated by seed/data layer. */
  signal_info?: {
    channel?: number;
    /** @deprecated Alias of `rssi_dbm`. */
    rssi?: number;
    rssi_dbm?: number;
    bssid?: string;
    source_mac?: string;
    target_mac?: string;
    /** @deprecated Alias of `bssid`. */
    target_bssid?: string;
    encryption?: string;
    frequency?: number;
  };
  /** @deprecated Read `notes` instead. */
  details?: string;
}

// ----------------------------- AI Summary -------------------------------

/**
 * One-paragraph operational summary produced by `app/src/lib/aiSummary.ts`'s
 * `generateThreatSummary()` helper. The browser fetch hits the local Ollama
 * runtime at `http://127.0.0.1:11434` per `install.sh`'s
 * `OLLAMA_HOST="127.0.0.1:11434"` + `OLLAMA_ORIGINS="*"` exports. No API key,
 * no remote call, no prompt-injection surface (free-text fields are
 * deliberately stripped before constructing the prompt).
 */
export interface AiSummary {
  /** The summarized text returned by the model (2-3 sentences by prompt). */
  text: string;
  /** Ollama model tag -- e.g. "llama3.2:3b" per the install.sh catalog. */
  model: string;
  /** Number of threats sampled to construct this summary. */
  threat_count: number;
  /** Round-trip latency in milliseconds (fetch start -> response parsed). */
  duration_ms: number;
  /** ISO timestamp of when the response was received. */
  generated_at: string;
}

// ----------------------------- Users / Profiles -------------------------

export type UserRole = 'admin' | 'viewer';
export type UserStatus = 'active' | 'disabled';

/**
 * Row in public.profiles (mirrored from auth.users.id).
 * This is the ONLY user shape the client deals with.
 */
export interface Profile {
  id: string;
  display_name: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  last_login_at: string | null;
  email?: string; // joined from auth.users via SQL view in some flows; client may derive
}

/** Back-compat alias: previous code referenced {User}; renamed to {Profile}. */
export type User = Profile;

// --------------------------- Camera access ------------------------------

/**
 * Row in public.camera_access (the many-to-many table that grants per-user
 * visibility for shared cameras). Mirrors the schema at
 * app/supabase/migrations/20250101000000_init_schema.sql#L38-46:
 *   id          uuid primary key default gen_random_uuid()
 *   camera_id   uuid references public.cameras(id) on delete cascade
 *   user_id     uuid references auth.users(id) on delete cascade
 *   granted_by  uuid references auth.users(id)        (nullable)
 *   granted_at  timestamptz not null default now()    (audit timestamp)
 *   unique (camera_id, user_id)                       (no dupes per pair)
 *
 * RLS policy: SELECT permitted when user_id = auth.uid() OR is_admin() OR
 * is_camera_owner(camera_id); INSERT/DELETE permitted when is_admin() OR
 * is_camera_owner(camera_id). Source: same migration#L121-148.
 *
 * The granting dance (UI grants admin → user X access to camera C) lands
 * here so admin actions route through the typed envelope boundary in
 * app/src/lib/auth.ts#adminGrantAccess rather than mutating this table
 * directly. UI consumers read this shape via App.camaras.api.ts's
 * camerasApi.listAccess() (added in feat(cameraAccess-api)).
 */
export interface CameraAccess {
  id: string;
  camera_id: string;
  user_id: string;
  // granted_by is a nullable audit column (per SQL at
  // supabase/migrations/20250101000000_init_schema.sql#L43). Edge function
  // grant_access now stamps callerId (non-null in the standard flow), but
  // historical rows + transient grant_attempts can carry null — type the
  // column faithfully to mirror Profile.last_login_at: string | null.
  granted_by: string | null;
  granted_at: string;
}
