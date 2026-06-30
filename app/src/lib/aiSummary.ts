// app/src/lib/aiSummary.ts
//
// Browser-side AI summarization for the OmniSight SPA. Generates a one-paragraph
// LLM summary of the current wireless-threat list by fetching the LOCAL Ollama
// runtime at http://127.0.0.1:11434. Matches the install.sh runtime contract:
//   - install.sh line 374 exports  OLLAMA_HOST="127.0.0.1:11434"
//   - install.sh line 373 exports  OLLAMA_ORIGINS="*"  (CORS-wide-open for browser)
//
// SECURITY POSTURE
// ----------------
// - This module runs in the BROWSER context. The Ollama runtime binds to
//   127.0.0.1, so network exposure is limited to the local host. The "API key"
//   leak problem that affects OpenAI/Anthropic does NOT apply to local Ollama:
//   there is no API key to leak.
// - The caller (ThreatMonitor.tsx) gates this helper behind `useAuth().isAdmin`
//   so non-admin operators cannot initiate the GPU/CPU-bound inference.
// - Prompt-injection mitigation: only TYPE ENUMS + COUNT + NUMERIC SIGNAL
//   metrics + TRUNCATED MAC OUI PREFIXES are sent to the model. Free-text
//   attacker-controlled fields (`notes`, `details`, raw `target_bssid`) are
//   EXPLICITLY OMITTED from the prompt payload. MAC addresses are masked to
//   keep only the OUI so a chatty model cannot echo back spoofable full MACs.

import type { Threat, AiSummary } from '../types';

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
/** Default model tag per install.sh's catalog (see MODEL_{}_NUM env contract). */
const DEFAULT_MODEL = 'llama3.2:3b';
/** Hard ceiling on a single /api/generate call. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Privacy-preserving MAC truncator. Keeps the OUI (first 3 octets), masks the
 * device-specific NIC half so a chatty LLM cannot echo back a spoofable MAC.
 *
 *   "AA:BB:CC:DD:EE:01" -> "AA:BB:CC:**:**:**"
 */
function maskMac(mac: string | undefined): string | undefined {
  if (!mac) return undefined;
  const OUI_RE = /^([0-9A-F]{2}:){3}[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}$/i;
  if (!OUI_RE.test(mac)) return undefined;
  return mac.slice(0, 9) + ':**:**:**';
}

/**
 * Project the Threat rows down to the bare-minimum fields that are useful
 * for an LLM summary. Everything attacker-controlled (free-text strings)
 * is EXCLUDED to keep the prompt-injection surface near zero.
 */
function sanitizeForPrompt(threats: Threat[]) {
  return threats.map((t) => ({
    type: t.type,
    severity: t.severity,
    target_mac: maskMac(t.target_mac ?? t.signal_info?.target_mac),
    source_mac: maskMac(t.source_mac ?? t.signal_info?.source_mac),
    channel: t.channel ?? t.signal_info?.channel,
    rssi_dbm: t.rssi_dbm ?? t.signal_info?.rssi_dbm,
    // EXPLICITLY OMITTED:
    //   t.notes / t.details -- free-text attacker-controlled
    //   t.signal_info.bssid / target_bssid -- raw scope MACs would re-leak
    detected_at: t.detected_at,
  }));
}

/**
 * Construct the prompt. Hard-coded system instructions; the dynamic JSON
 * payload is fenced in a ```json block so the model treats it as data,
 * not as further instructions.
 */
function buildPrompt(sanitized: ReturnType<typeof sanitizeForPrompt>): string {
  return [
    'You are a security-operations assistant reading from a Wireless Intrusion Detection System (WIDS).',
    'Below is a JSON list of recent wireless threat observations. MAC addresses have been redacted to the OUI prefix only.',
    'Write a concise (2-3 sentence) operational summary highlighting:',
    '  1. The most common threat TYPE and what it indicates in this context.',
    '  2. Any TARGET-MAC OUI repetition that suggests a single attacker is making multiple attempts.',
    '  3. One actionable next step for the SOC operator.',
    'Do NOT invent MAC addresses, channel numbers, or RSSI values. Only cite what is in the data. Keep it under 90 words.',
    '',
    '```json',
    JSON.stringify(sanitized, null, 2),
    '```',
    '',
    'Operational summary:',
  ].join('\n');
}

/**
 * Call /api/generate on the local Ollama runtime, returning a typed
 * AiSummary envelope. Throws on transport / non-2xx / empty-response / timeout;
 * callers decide whether to render an error toast or fall back to a
 * self-summarized view.
 */
export async function generateThreatSummary(
  threats: Threat[],
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<AiSummary> {
  const model = opts.model ?? DEFAULT_MODEL;
  const sanitized = sanitizeForPrompt(threats);
  const prompt = buildPrompt(sanitized);
  const startedAt = performance.now();

  // Compose an internal-timeout AbortController with any caller-supplied signal.
  const internal = new AbortController();
  const timeoutId = setTimeout(
    () => internal.abort(new Error('Ollama request timed out after ' + REQUEST_TIMEOUT_MS + 'ms')),
    REQUEST_TIMEOUT_MS,
  );
  const onCallerAbort = () => internal.abort(opts.signal?.reason);
  if (opts.signal) {
    if (opts.signal.aborted) internal.abort(opts.signal.reason);
    else opts.signal.addEventListener('abort', onCallerAbort, { once: true });
  }

  try {
    const res = await fetch(DEFAULT_OLLAMA_URL + '/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: internal.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        'Ollama responded ' + res.status + (body ? ': ' + body.slice(0, 200) : '')
      );
    }
    const json = (await res.json()) as { model?: string; response?: string };
    const text = String(json.response ?? '').trim();
    if (!text) throw new Error('Ollama returned an empty response.');
    const durationMs = Math.round(performance.now() - startedAt);
    return {
      text,
      model: json.model ?? model,
      threat_count: threats.length,
      generated_at: new Date().toISOString(),
      duration_ms: durationMs,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Ollama request was cancelled or timed out after ' + REQUEST_TIMEOUT_MS + 'ms.');
    }
    if (err instanceof TypeError) {
      // Browser fetch into a dead port throws TypeError("Failed to fetch").
      throw new Error(
        'Cannot reach Ollama at ' + DEFAULT_OLLAMA_URL + '. Start it with `bash start.sh`.',
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    if (opts.signal) opts.signal.removeEventListener('abort', onCallerAbort);
  }
}

/**
 * Lightweight reachability check. Useful for "AI Offline" UX before the
 * user clicks Summarize (and to detect Ollama-side model-pull readiness
 * after `install.sh`'s `ollama create` step).
 */
export async function isOllamaReachable(opts: { signal?: AbortSignal } = {}): Promise<boolean> {
  try {
    const res = await fetch(DEFAULT_OLLAMA_URL + '/api/tags', {
      method: 'GET',
      signal: opts.signal,
    });
    return res.ok;
  } catch {
    return false;
  }
}
