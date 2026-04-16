import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Broadcast, Pulse
} from '@phosphor-icons/react';
import { KeysightSigGenReplica } from '../components/instruments/KeysightSigGenReplica';
import { RSAnalyzerReplica } from '../components/instruments/RSAnalyzerReplica';
import { KeysightAnalyzerReplica } from '../components/instruments/KeysightAnalyzerReplica';
import { RSSigGenReplica } from '../components/instruments/RSSigGenReplica';
const API = `http://${globalThis.location.hostname}:8787`;

// ─────────────────────────────────── Types ────────────────────────────────────
interface MarkerData { index: number; active: boolean; x: number; y: number; }
interface SGStatus {
  freq_hz: number; power_dbm: number; rf_state: boolean;
  am_state: boolean; fm_state: boolean; pulse_state: boolean;
  alc_state: boolean; ref_clock: string; arb_state: boolean; idn: string;
}
interface SAStatus {
  center_hz: number; span_hz: number; ref_level_dbm: number;
  rbw_hz: number; vbw_hz: number; sweep_time_s: number; points: number;
  attenuation_db: number; attenuation_auto: boolean; detector: string;
  avg_state: boolean; avg_count: number; preamp: boolean;
  markers: MarkerData[]; idn: string;
  trace?: { freq: number; amp: number }[];
}

// ─────────────────────────────── Main Page ───────────────────────────────────
const MasterControlPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'keysight' | 'rs'>('keysight');
  const [activeInstrument, setActiveInstrument] = useState<'siggen' | 'analyzer'>('siggen');
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const [sgStatus, setSgStatus] = useState<Partial<SGStatus>>({});
  const [saStatus, setSaStatus] = useState<Partial<SAStatus>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connectWs = () => {
      const ws = new WebSocket(`ws://${window.location.hostname}:8787/ws`);
      ws.onopen = () => setWsStatus('connected');
      ws.onclose = () => { setWsStatus('offline'); setTimeout(connectWs, 5000); };
      ws.onerror = () => setWsStatus('offline');
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'instrument_status') {
            if (msg.data.siggen) setSgStatus(msg.data.siggen);
            if (msg.data.analyzer) setSaStatus(msg.data.analyzer);
          }
          if (msg.type === 'opc_sync') {
            setIsSyncing(msg.active);
          }
        } catch {
          console.warn("Malformed WebSocket message received");
        }
      };
      wsRef.current = ws;
    };
    connectWs();
    return () => wsRef.current?.close();
  }, []);

  // Poll for trace data periodically when on analyzer tab
  useEffect(() => {
    if (activeInstrument !== 'analyzer') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/instrument-control/analyzer/trace?manufacturer=${activeTab}`);
        if (res.ok) {
          const data = await res.json();
          if (data.trace) {
            setSaStatus(prev => ({ ...prev, trace: data.trace }));
          }
        }
    } catch {
      console.warn("Failed to update trace data from hardware");
    }
    }, 1000); // 1.0s trace refresh for offline stability
    return () => clearInterval(interval);
  }, [activeInstrument, activeTab]);

  const TABS = [
    { id: 'keysight', label: 'keysight', sub: 'EXG/MXG/PXA/UXA/VNA', color: 'blue' },
    { id: 'rs', label: 'rohde & schwarz', sub: 'FSW/FSV/SMW/SMB/ZNA', color: 'rose' },
  ] as const;




  return (
    <div className="max-w-screen-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Top Bar - Liquid Glass Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-8">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-neon-cyan/10 rounded-2xl border border-neon-cyan/20 text-neon-cyan shadow-[0_0_40px_rgba(0,245,255,0.1)]">
            <Cpu weight="duotone" size={32} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
              Master Instrument Control
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-1 w-1 rounded-full bg-neon-cyan" />
              <p className="text-[10px] text-text-dim font-black tracking-[0.2em] uppercase">
                RangeReady RF V6.0 · Apex-Supervised Interface
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* WS Status Badge */}
          <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full border glass-panel transition-all duration-500 ${
            wsStatus === 'connected' ? 'border-neon-cyan/30 text-neon-cyan' : 
            wsStatus === 'connecting' ? 'border-yellow-500/30 text-yellow-500' : 'border-red-500/30 text-red-500'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse bg-current shadow-[0_0_12px_currentColor]`} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {wsStatus === 'connected' ? 'Hardware Synchronized' : wsStatus === 'connecting' ? 'Calibrating Link...' : 'Link Severed'}
            </span>
          </div>

          {/* OPC Sync Pulse */}
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-700 ${
            isSyncing 
              ? 'bg-neon-cyan/10 border-neon-cyan/50 text-neon-cyan shadow-[0_0_25px_rgba(0,245,255,0.2)]' 
              : 'bg-white/5 border-white/5 text-white/20'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-neon-cyan animate-ping' : 'bg-white/20'}`} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">
              {isSyncing ? 'OPC Handshake Active' : 'Bus Idle'}
            </span>
          </div>

          {/* Manufacturer Navigation */}
          <div className="flex glass-panel p-1 border border-white/5">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center px-8 py-3 rounded-xl transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10'
                    : 'text-text-dim hover:text-white hover:bg-white/5'
                }`}>
                <span className={`text-[11px] font-black uppercase tracking-tight ${activeTab === tab.id ? 'text-neon-cyan' : ''}`}>{tab.label}</span>
                <span className="text-[8px] font-bold opacity-40 tracking-wider mt-0.5">{tab.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'keysight' ? (
        <KeysightPanel 
          activeInstrument={activeInstrument} 
          setActiveInstrument={setActiveInstrument}
          sgStatus={sgStatus} 
          saStatus={saStatus}
          wsStatus={wsStatus}
        />
      ) : (
        <RSPanel 
          activeInstrument={activeInstrument} 
          setActiveInstrument={setActiveInstrument}
          sgStatus={sgStatus} 
          saStatus={saStatus}
          wsStatus={wsStatus}
        />
      )}
    </div>
  );
};

// ──────────────────────────────── Keysight Panel ─────────────────────────────
interface PanelProps {
  activeInstrument: 'siggen' | 'analyzer';
  setActiveInstrument: (v: 'siggen' | 'analyzer') => void;
  sgStatus: Partial<SGStatus>;
  saStatus: Partial<SAStatus>;
  wsStatus: 'connecting' | 'connected' | 'offline';
}

const KeysightPanel: React.FC<PanelProps> = ({ activeInstrument, setActiveInstrument, sgStatus, saStatus, wsStatus }) => (
  <div className="space-y-8">
    {/* Instrument Class Navigation */}
    <div className="flex glass-panel p-1 w-fit border border-white/5">
      {(['siggen', 'analyzer'] as const).map(tab => (
        <button key={tab} onClick={() => setActiveInstrument(tab)}
          className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
            activeInstrument === tab 
              ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/20 shadow-[0_0_20px_rgba(0,245,255,0.1)]' 
              : 'text-text-dim hover:text-white hover:bg-white/5'
          }`}>
          {tab === 'siggen' ? <Broadcast size={18} weight="duotone"/> : <Pulse size={18} weight="duotone"/>}
          {tab === 'siggen' ? 'Signal Source Control' : 'Signal Analysis Center'}
        </button>
      ))}
    </div>

    {activeInstrument === 'siggen' 
      ? <KeysightSigGenReplica status={sgStatus} wsStatus={wsStatus} />
      : <KeysightAnalyzerReplica status={saStatus} wsStatus={wsStatus} />
    }
  </div>
);

// ────────────────────────────────── R&S Panel ─────────────────────────────────
const RSPanel: React.FC<PanelProps> = ({ activeInstrument, setActiveInstrument, sgStatus, saStatus, wsStatus }) => (
  <div className="space-y-6">
    <div className="flex gap-2 p-1.5 bg-[#0B0F19] rounded-2xl border border-white/5 w-fit">
      {(['siggen', 'analyzer'] as const).map(tab => (
        <button key={tab} onClick={() => setActiveInstrument(tab)}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
            activeInstrument === tab ? 'bg-rose-600 text-white' : 'text-text-tertiary hover:text-white hover:bg-white/5'
          }`}>
          {tab === 'siggen' ? <Broadcast size={14}/> : <Pulse size={14}/>}
          {tab === 'siggen' ? 'Signal Generator (SMW/SMB/SMBV)' : 'Spectrum Analyzer (FSW/FSV/FPS)'}
        </button>
      ))}
    </div>

    {activeInstrument === 'siggen' 
      ? <RSSigGenReplica status={sgStatus} wsStatus={wsStatus} />
      : <RSAnalyzerReplica status={saStatus} wsStatus={wsStatus} />
    }
  </div>
);



// ─────────────────────────── Shared Components ───────────────────────────────
export { MasterControlPage };
export default MasterControlPage;
