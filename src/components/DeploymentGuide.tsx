import { useState, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Server, Cpu, Wifi, FileCode2, Copy, Download, ExternalLink } from 'lucide-react';
import { useToast } from './Toast';

const SNIPPETS = {
  compose: `version: '3.9'
services:
  # 1. API Gateway & Backend
  omnisight-api:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/omnisight
    depends_on:
      - db

  # 2. AI & NVR (Frigate)
  frigate:
    image: ghcr.io/blakeblackshear/frigate:stable
    shm_size: "64m"
    devices:
      - /dev/bus/usb:/dev/bus/usb  # For Coral TPU
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - ./frigate/config.yml:/config/config.yml
      - ./storage/frigate:/media/frigate
    ports:
      - "5000:5000"
      - "8554:8554"  # RTSP feeds

  # 3. Database
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=omnisight`,
  backend: `from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import datetime

app = FastAPI(title="OmniSight API Gateway")

class SecurityEvent(BaseModel):
    device_id: str
    type: str  # motion, tamper, intrusion
    severity: str
    timestamp: str
    ai_labels: List[str]
    evidence_ids: List[str] = []

class ThreatEvent(BaseModel):
    device_id: str
    type: str  # deauth_attack, rogue_ap
    details: str
    signal_info: dict

@app.post("/events")
async def receive_event(event: SecurityEvent):
    # 1. Save to database
    # db.save(event)

    # 2. Broadcast to frontend via WebSockets
    # await websocket_manager.broadcast(event.json())

    # 3. Trigger alerts if critical
    if event.severity == "critical":
        # send_sms_or_email()
        pass

    return {"status": "success", "event_id": "evt_generated_id"}

@app.post("/threats")
async def receive_threat(threat: ThreatEvent):
    # Log wireless anomalies from Kismet/nzyme
    return {"status": "logged"}`,
  frigate: `mqtt:
  enabled: False

cameras:
  # Camera 1: EseeCloud (Assuming you extracted RTSP)
  driveway_cam:
    ffmpeg:
      inputs:
        - path: rtsp://admin:password@192.168.1.105:554/stream1
          roles:
            - detect
            - record
    detect:
      width: 1280
      height: 720
      fps: 5
    objects:
      track:
        - person
        - car

# Webhook to our API Gateway
# Frigate will POST to this URL when an object is detected
notification:
  endpoints:
    - url: http://omnisight-api:8000/events
      format: json`,
  wireless: `#!/usr/bin/env python3
import requests
from scapy.all import *

API_URL = "http://localhost:8000/threats"
TARGET_BSSID = "AA:BB:CC:DD:EE:FF"  # Your WiFi Network

def packet_handler(pkt):
    # Detect Deauthentication Packets (Type 0, Subtype 12)
    if pkt.haslayer(Dot11Deauth):
        threat_data = {
            "device_id": "wids_sensor_01",
            "type": "deauth_attack",
            "details": f"Deauth detected targeting {pkt.addr1}",
            "signal_info": {
                "target_mac": pkt.addr1,
                "source_mac": pkt.addr2,
                "rssi": pkt.dBm_AntSignal if hasattr(pkt, 'dBm_AntSignal') else 0
            }
        }
        try:
            requests.post(API_URL, json=threat_data)
            print("Threat reported to OmniSight API")
        except Exception as e:
            print(f"Failed to report threat: {e}")

print("Starting OmniSight Wireless IDS on wlan0mon...")
sniff(iface="wlan0mon", prn=packet_handler, store=0)`,
};

const SECTIONS = [
  { id: 'architecture' as const, label: 'Architecture', sub: 'Docker Compose',   icon: Server,   lang: 'yaml'   as const, code: SNIPPETS.compose,    file: 'docker-compose.yml' },
  { id: 'backend'      as const, label: 'API Gateway',  sub: 'FastAPI entrypoint', icon: FileCode2, lang: 'python' as const, code: SNIPPETS.backend,    file: 'backend/main.py' },
  { id: 'ingestion'    as const, label: 'AI / NVR',     sub: 'Frigate config',     icon: Cpu,      lang: 'yaml'   as const, code: SNIPPETS.frigate,    file: 'frigate/config.yml' },
  { id: 'wireless'     as const, label: 'Wireless IDS', sub: 'scapy sniffer',      icon: Wifi,     lang: 'python' as const, code: SNIPPETS.wireless,   file: 'wireless_ids.py' },
];

type Lang = 'yaml' | 'python';
type SectionId = typeof SECTIONS[number]['id'];

function highlight(code: string, lang: Lang): ReactNode {
  const PATTERNS: Array<{ re: RegExp; cls: string }> = lang === 'python'
    ? [
        { re: /#[^\n]*/g, cls: 'text-gray-500 italic' },
        { re: /"""[\s\S]*?"""|'''[\s\S]*?'''/g, cls: 'text-amber-300' },
        { re: /"[^"\n]*"|'[^'\n]*'/g, cls: 'text-amber-300' },
        { re: /\b(?:from|import|async|await|def|class|return|if|else|elif|for|while|in|not|and|or|try|except|raise|with|as|pass|None|True|False|self)\b/g, cls: 'text-blue-300' },
        { re: /@[a-zA-Z_]\w*(?:\.\w+)?/g, cls: 'text-purple-300' },
        { re: /\b\d+(?:\.\d+)?\b/g, cls: 'text-emerald-300' },
      ]
    : [
        { re: /#[^\n]*/g, cls: 'text-gray-500 italic' },
        { re: /"[^"\n]*"|'[^"\n]*'/g, cls: 'text-amber-300' },
        { re: /^[ \t]*[A-Za-z_][\w-]*(?=:)/gm, cls: 'text-cyan-300' },
        { re: /\b(?:true|false|null|yes|no|on|off|version|services)\b/gi, cls: 'text-purple-300' },
        { re: /\b\d+(?:\.\d+)?\b/g, cls: 'text-emerald-300' },
      ];

  const segs: Array<{ text: string; cls?: string }> = [];
  let cursor = 0;
  for (const { re, cls } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      if (m.index > cursor) segs.push({ text: code.slice(cursor, m.index) });
      segs.push({ text: m[0], cls });
      cursor = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  if (cursor < code.length) segs.push({ text: code.slice(cursor) });
  return segs.map((s, i) => s.cls ? <span key={i} className={s.cls}>{s.text}</span> : <span key={i}>{s.text}</span>);
}

export default function DeploymentGuide() {
  const [activeId, setActiveId] = useState<SectionId>('architecture');
  const { push } = useToast();
  const section = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(section.code);
      push({ type: 'success', message: 'Copied to clipboard', detail: section.file });
    } catch {
      push({ type: 'error', message: 'Could not copy', detail: 'Clipboard API unavailable' });
    }
  };

  const download = () => {
    const blob = new Blob([section.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = section.file.split('/').pop() ?? 'snippet.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    push({ type: 'info', message: 'File downloaded', detail: section.file });
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          Production Deployment Guide
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider px-2 py-0.5 border border-white/10 rounded-full">v3.0</span>
        </h2>
        <p className="text-sm text-gray-400 mt-2 max-w-3xl">
          The actual code and configurations needed to build the OmniSight middleware layer that aggregates your proprietary cameras, Frigate NVR, and Wireless IDS into a single dashboard.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s, idx) => {
          const Icon = s.icon;
          const active = activeId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={
                'group flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-xl text-sm font-medium transition-all border ' +
                (active
                  ? 'bg-blue-600/15 text-blue-200 border-blue-500/40 shadow-[inset_0_1px_0_rgba(59,130,246,0.18)]'
                  : 'bg-white/[0.02] text-gray-300 border-white/5 hover:bg-white/[0.05] hover:text-white')
              }
            >
              <span className={'text-[10px] font-mono ' + (active ? 'text-blue-300' : 'text-gray-500')}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <Icon className={'w-4 h-4 ' + (active ? 'text-blue-300' : 'text-gray-400')} />
              <div className="text-left">
                <div className="font-semibold">{s.label}</div>
                <div className={'text-[10px] font-mono uppercase tracking-wider ' + (active ? 'text-blue-300/80' : 'text-gray-500')}>{s.sub}</div>
              </div>
            </button>
          );
        })}
      </div>

      <motion.div
        key={activeId}
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="bg-[#0a0a14] border border-white/5 rounded-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex gap-1.5 shrink-0">
              <span className="w-3 h-3 rounded-full bg-red-500/60" />
              <span className="w-3 h-3 rounded-full bg-amber-500/60" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
            </div>
            <div className="text-sm font-mono text-gray-400 ml-2 truncate">{section.file}</div>
            <span className="text-[10px] font-mono text-gray-500 px-1.5 py-0.5 rounded border border-white/10 uppercase tracking-wider shrink-0">{section.lang}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={download}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Save
            </button>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-md transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar bg-[#08080d]">
          <pre className="text-[12.5px] leading-relaxed font-mono p-4 min-w-max">
            <code>
              {section.code.split('\n').map((line, i) => (
                <div key={i} className="flex hover:bg-white/[0.02] -mx-4 px-4">
                  <span className="select-none text-gray-700 w-8 shrink-0 pr-3 text-right text-[11px]">{i + 1}</span>
                  <span className="flex-1 whitespace-pre text-gray-300">{highlight(line, section.lang)}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Capability icon={<Server className="w-4 h-4" />}   title="Self-hosted"      desc="Raspberry Pi 4, Intel NUC, or any x86 server." />
        <Capability icon={<Cpu className="w-4 h-4" />}      title="GPU optional"     desc="Coral TPU recommended for Frigate detection." />
        <Capability icon={<Wifi className="w-4 h-4" />}     title="Monitor-mode WiFi" desc="USB adapter with monitor mode for IDS." />
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <ExternalLink className="w-3.5 h-3.5" />
        For full reference see{' '}
        <a className="text-blue-300 hover:underline" href="https://frigate.video" target="_blank" rel="noreferrer">frigate.video</a>{' / '}
        <a className="text-blue-300 hover:underline" href="https://nzyme.org" target="_blank" rel="noreferrer">nzyme.org</a>.
      </div>
    </div>
  );
}

function Capability({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-lg">
      <div className="text-blue-300 shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
