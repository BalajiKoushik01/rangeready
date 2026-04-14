import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Cpu, Broadcast, Power, Sliders, Target, 
  WaveSquare, MagnifyingGlass, Plus, Trash, ArrowRight,
  Timer, Gauge, Pulse
} from '@phosphor-icons/react';

const API = `http://${window.location.hostname}:8787`;

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

  const sendCommand = useCallback(async (endpoint: string, body: Record<string, unknown>) => {
    try {
      const res = await fetch(`${API}/api/instrument-control${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return res.ok ? await res.json() : null;
    } catch { 
      return null; 
    }
  }, []);

  const TABS = [
    { id: 'keysight', label: 'Keysight', sub: 'EXG/MXG/PXA/UXA/VNA', color: 'blue' },
    { id: 'rs', label: 'Rohde & Schwarz', sub: 'FSW/FSV/SMW/SMB/ZNA', color: 'rose' },
  ] as const;



  const wsColor = { connecting: 'yellow', connected: 'emerald', offline: 'red' }[wsStatus];

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6 animate-in fade-in duration-700">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-5">
          <div className="p-3.5 bg-accent-blue/10 rounded-2xl border border-accent-blue/20 text-accent-blue shadow-[0_0_30px_rgba(30,111,217,0.1)]">
            <Cpu weight="duotone" size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">Master Instrument Control</h1>
            <p className="text-[10px] text-text-tertiary font-black tracking-widest uppercase mt-0.5">
              Full-Spectrum Remote Interface · Keysight + R&S · VXI-11 / Raw Socket
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* WS Status */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border bg-black/30 ${
            wsStatus === 'connected' ? 'border-emerald-500/30' : 
            wsStatus === 'connecting' ? 'border-yellow-500/30' : 'border-red-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse bg-${wsColor}-500 shadow-[0_0_8px_var(--tw-shadow-color)]`} />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/60">
              {wsStatus === 'connected' ? 'Live Sync' : wsStatus === 'connecting' ? 'Connecting...' : 'Offline'}
            </span>
          </div>

          {/* Manufacturer Tabs */}
          <div className="flex bg-[#0B0F19] p-1.5 rounded-2xl border border-white/5 shadow-inner">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center px-6 py-3 rounded-xl transition-all ${
                  activeTab === tab.id 
                    ? tab.color === 'blue' ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20'
                      : 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                    : 'text-text-tertiary hover:text-white hover:bg-white/5'
                }`}>
                <span className="text-[11px] font-black uppercase tracking-tight">{tab.label}</span>
                <span className="text-[8px] font-bold opacity-60 tracking-wider">{tab.sub}</span>
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
          sendCommand={sendCommand}
        />
      ) : (
        <RSPanel 
          activeInstrument={activeInstrument} 
          setActiveInstrument={setActiveInstrument}
          sgStatus={sgStatus} 
          saStatus={saStatus}
          sendCommand={sendCommand}
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
  sendCommand: (ep: string, body: Record<string, unknown>) => Promise<unknown>;
}

const KeysightPanel: React.FC<PanelProps> = ({ activeInstrument, setActiveInstrument, sgStatus, saStatus, sendCommand }) => (
  <div className="space-y-6">
    {/* Sub-tabs */}
    <div className="flex gap-2 p-1.5 bg-[#0B0F19] rounded-2xl border border-white/5 w-fit">
      {(['siggen', 'analyzer'] as const).map(tab => (
        <button key={tab} onClick={() => setActiveInstrument(tab)}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
            activeInstrument === tab ? 'bg-accent-blue text-white' : 'text-text-tertiary hover:text-white hover:bg-white/5'
          }`}>
          {tab === 'siggen' ? <Broadcast size={14}/> : <Pulse size={14}/>}
          {tab === 'siggen' ? 'Signal Generator (EXG/MXG/PSG)' : 'Spectrum Analyzer (MXA/PXA/UXA)'}
        </button>
      ))}
    </div>

    {activeInstrument === 'siggen' 
      ? <SigGenControl status={sgStatus} sendCommand={sendCommand} manufacturer="keysight" />
      : <SpectrumAnalyzerControl status={saStatus} sendCommand={sendCommand} manufacturer="keysight" />
    }
  </div>
);

// ────────────────────────────────── R&S Panel ─────────────────────────────────
const RSPanel: React.FC<PanelProps> = ({ activeInstrument, setActiveInstrument, sgStatus, saStatus, sendCommand }) => (
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
      ? <SigGenControl status={sgStatus} sendCommand={sendCommand} manufacturer="rs" />
      : <SpectrumAnalyzerControl status={saStatus} sendCommand={sendCommand} manufacturer="rs" />
    }
  </div>
);

// ─────────────────────── Signal Generator Control ─────────────────────────────
interface SigGenControlProps {
  status: Partial<SGStatus>;
  sendCommand: (ep: string, body: Record<string, unknown>) => Promise<unknown>;
  manufacturer: 'keysight' | 'rs';
}

const SigGenControl: React.FC<SigGenControlProps> = ({ status, sendCommand, manufacturer }) => {
  const [freq, setFreq] = useState('1000');
  const [freqUnit, setFreqUnit] = useState<'Hz' | 'kHz' | 'MHz' | 'GHz'>('MHz');
  const [power, setPower] = useState('-20');
  const [amDepth, setAmDepth] = useState('30');
  const [fmDev, setFmDev] = useState('10000');
  const [pulseWidth, setPulseWidth] = useState('1');
  const [pulsePeriod, setPulsePeriod] = useState('10');
  const [pulseWidthUnit, setPulseWidthUnit] = useState('ms');
  const [lastCmd, setLastCmd] = useState('Ready');

  const unitMultiplier = { Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9 };

  const api = (path: string, body: Record<string, unknown>) => {
    setLastCmd(`Sending: ${path.split('/').pop()}`);
    sendCommand(path, body).then(r => setLastCmd(r ? '✓ Done' : '✗ Error'));
  };

  const applyFreq = () => api('/siggen/frequency', {
    freq_hz: parseFloat(freq) * unitMultiplier[freqUnit], manufacturer
  });
  const applyPower = () => api('/siggen/power', { power_dbm: parseFloat(power), manufacturer });
  const toggleRF = () => api('/siggen/rf', { state: !status?.rf_state, manufacturer });



  return (
    <div className="grid grid-cols-12 gap-6">
      {/* LCD Display */}
      <div className="col-span-12 xl:col-span-8">
        <div className="relative rounded-[2rem] border-[10px] border-[#1E2D45] bg-[#090d17] shadow-2xl overflow-hidden" style={{ minHeight: '420px' }}>
          <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,1) 3px, rgba(255,255,255,1) 4px)',
          }} />
          
          <div className="relative z-10 p-8 h-full flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-[12px] font-black text-white/40 uppercase tracking-widest">
                {manufacturer === 'keysight' ? 'KEYSIGHT N5172B EXG' : 'ROHDE & SCHWARZ SMB100A'}
              </span>
              <div className="flex items-center gap-3">
                {[
                  ['RF ON', status?.rf_state],
                  ['MOD ON', status?.am_state || status?.fm_state || status?.pulse_state],
                  ['ALC', status?.alc_state],
                ].map(([label, active]) => (
                  <div key={label as string} className={`px-3 py-1 rounded-md text-[10px] font-black tracking-widest border transition-all ${
                    active ? 'bg-white text-[#090d17] border-white' : 'text-white/20 border-white/10'
                  }`}>{label}</div>
                ))}
              </div>
            </div>

            {/* Main readout */}
            <div className="flex-1 flex flex-col justify-center gap-8">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">CW Frequency</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${status?.rf_state ? 'text-emerald-400 animate-pulse' : 'text-white/20'}`}>
                    {status?.rf_state ? '● RF ACTIVE' : '○ RF OFF'}
                  </span>
                </div>
                <div className="text-[5.5rem] font-black text-white tracking-tighter leading-none font-mono" 
                     style={{ textShadow: '0 0 30px rgba(255,255,255,0.15)' }}>
                  {status?.freq_hz != null 
                    ? status.freq_hz >= 1e9 
                      ? `${(status.freq_hz!/1e9).toFixed(6)}` 
                      : `${(status.freq_hz!/1e6).toFixed(3)}`
                    : "1000.000"}
                  <span className="text-3xl font-light opacity-30 ml-4">
                    {status?.freq_hz != null && status.freq_hz >= 1e9 ? 'GHz' : 'MHz'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Output Level</span>
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">ALC {status?.alc_state ? 'ON' : 'OFF'}</span>
                </div>
                <div className="text-[3.5rem] font-black text-white/80 tracking-tighter leading-none font-mono"
                     style={{ textShadow: '0 0 20px rgba(255,255,255,0.1)' }}>
                  {status?.power_dbm?.toFixed(2) ?? '-20.00'}
                  <span className="text-2xl font-light opacity-30 ml-3">dBm</span>
                </div>
              </div>
            </div>

            {/* Softkeys */}
            <div className="grid grid-cols-6 gap-2 border-t border-white/5 pt-4">
              {['Frequency', 'Amplitude', 'Sweep', 'Modulation', 'LF Out', 'ARB / IQ'].map((sk, i) => (
                <button key={i} 
                  onClick={() => i === 5 && setLastCmd('Open ARB Manager...')}
                  className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="w-full h-0.5 bg-white/10 rounded-full group-hover:bg-white/30 transition-colors" />
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-tight group-hover:text-white/70 transition-colors text-center leading-tight">{sk}</span>
                  <div className="w-full h-0.5 bg-white/10 rounded-full group-hover:bg-white/30 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="col-span-12 xl:col-span-4 space-y-4">
        {/* RF Toggle */}
        <button onClick={toggleRF} className={`w-full py-5 rounded-2xl border flex items-center justify-center gap-4 transition-all font-black text-[11px] uppercase tracking-widest ${
          status?.rf_state 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
        }`}>
          <Power size={22} weight="bold" />
          RF Output {status?.rf_state ? 'ON — Click to Disable' : 'OFF — Click to Enable'}
        </button>

        {/* Frequency Control */}
        <ControlSection title="Frequency" icon={<Gauge size={16} />}>
          <div className="flex gap-2">
            <input value={freq} onChange={e => setFreq(e.target.value)} type="number"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono text-sm outline-none focus:border-accent-blue" />
            <select value={freqUnit} onChange={e => setFreqUnit(e.target.value as 'Hz'|'kHz'|'MHz'|'GHz')}
              className="bg-[#0B0F19] border border-white/10 rounded-xl px-3 text-white text-sm font-black outline-none focus:border-accent-blue">
              {['Hz', 'kHz', 'MHz', 'GHz'].map(u => <option key={u}>{u}</option>)}
            </select>
            <button onClick={applyFreq} className="px-4 py-2 bg-accent-blue text-white rounded-xl font-black text-[11px] hover:bg-accent-blue/80 transition-colors">SET</button>
          </div>
        </ControlSection>

        {/* Power Control */}
        <ControlSection title="Output Level" icon={<Sliders size={16} />}>
          <div className="flex gap-2">
            <input value={power} onChange={e => setPower(e.target.value)} type="number" step="0.1"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono text-sm outline-none focus:border-accent-blue" />
            <span className="flex items-center text-white/40 font-black text-sm">dBm</span>
            <button onClick={applyPower} className="px-4 py-2 bg-accent-blue text-white rounded-xl font-black text-[11px] hover:bg-accent-blue/80 transition-colors">SET</button>
          </div>
        </ControlSection>

        {/* Modulation */}
        <ControlSection title="Modulation" icon={<WaveSquare size={16} />}>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: 'AM', active: status?.am_state, cmd: () => api('/siggen/modulation', { state: !status?.am_state, type: 'AM', depth: parseFloat(amDepth), manufacturer }) },
              { label: 'FM', active: status?.fm_state, cmd: () => api('/siggen/modulation', { state: !status?.fm_state, type: 'FM', deviation: parseFloat(fmDev), manufacturer }) },
              { label: 'Pulse', active: status?.pulse_state, cmd: () => api('/siggen/modulation', { state: !status?.pulse_state, type: 'PULSE', manufacturer }) },
            ].map(({ label, active, cmd }) => (
              <button key={label} onClick={cmd}
                className={`py-3 rounded-xl font-black text-[11px] uppercase tracking-wider border transition-all ${
                  active ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                }`}>
                {label} {active ? '●' : '○'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest block">AM Depth (%)</span>
              <input value={amDepth} onChange={e => setAmDepth(e.target.value)} type="number"
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white font-mono text-xs outline-none focus:border-accent-blue" />
            </div>
            <div className="space-y-1">
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest block">FM Dev (Hz)</span>
              <input value={fmDev} onChange={e => setFmDev(e.target.value)} type="number"
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white font-mono text-xs outline-none focus:border-accent-blue" />
            </div>
          </div>
        </ControlSection>

        {/* Pulse Gen */}
        <ControlSection title="Pulse Generator" icon={<Timer size={16} />}>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="space-y-1">
              <span className="text-[8px] font-black text-white/30 uppercase block">Period ({pulseWidthUnit})</span>
              <input value={pulsePeriod} onChange={e => setPulsePeriod(e.target.value)} type="number"
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white font-mono text-xs outline-none focus:border-accent-blue" />
            </div>
            <div className="space-y-1">
              <span className="text-[8px] font-black text-white/30 uppercase block">Width ({pulseWidthUnit})</span>
              <input value={pulseWidth} onChange={e => setPulseWidth(e.target.value)} type="number"
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white font-mono text-xs outline-none focus:border-accent-blue" />
            </div>
          </div>
          <div className="flex gap-2">
            <select value={pulseWidthUnit} onChange={e => setPulseWidthUnit(e.target.value)}
              className="bg-[#0B0F19] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs font-black outline-none">
              {['ns', 'us', 'ms', 's'].map(u => <option key={u}>{u}</option>)}
            </select>
            <button onClick={() => {
              const mult = { ns: 1e-9, us: 1e-6, ms: 1e-3, s: 1 }[pulseWidthUnit] || 1e-3;
              api('/siggen/pulse-params', { period: parseFloat(pulsePeriod) * mult, width: parseFloat(pulseWidth) * mult, manufacturer });
            }} className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg font-black text-[10px] uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all">
              Apply Pulse
            </button>
          </div>
        </ControlSection>

        {/* Status */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/20 rounded-xl border border-white/5">
          <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Last Command</span>
          <span className="text-[10px] font-black text-white uppercase tracking-wider">{lastCmd}</span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────── Spectrum Analyzer Control ────────────────────────────
interface SAControlProps {
  status: Partial<SAStatus>;
  sendCommand: (ep: string, body: Record<string, unknown>) => Promise<unknown>;
  manufacturer: 'keysight' | 'rs';
}

const SpectrumAnalyzerControl: React.FC<SAControlProps> = ({ status, sendCommand, manufacturer }) => {
  const [center, setCenter] = useState('1000');
  const [span, setSpan] = useState('100');
  const [freqUnit, setFreqUnit] = useState<'MHz' | 'GHz'>('MHz');
  const [refLevel, setRefLevel] = useState('0');
  const [atten, setAtten] = useState('10');
  const [attenAuto, setAttenAuto] = useState(true);
  const [avgCount, setAvgCount] = useState('10');
  const [avgOn, setAvgOn] = useState(false);
  const [detector, setDetector] = useState('POS');
  const [selectedMarker, setSelectedMarker] = useState(1);
  const [lastCmd, setLastCmd] = useState('Ready');

  const mult = freqUnit === 'GHz' ? 1e9 : 1e6;
  const markers: MarkerData[] = status?.markers || Array.from({length: 6}, (_, i) => ({
    index: i + 1, active: false, x: 0, y: -200
  }));

  const api = (path: string, body: Record<string, unknown>) => {
    setLastCmd(`→ ${path.split('/').pop()}`);
    sendCommand(path, body).then(r => setLastCmd(r ? '✓ Done' : '✗ Error'));
  };

  const applyFreq = () => api('/analyzer/frequency', {
    center_hz: parseFloat(center) * mult,
    span_hz: parseFloat(span) * mult,
    manufacturer
  });

  const DETECTORS_KS = ['NORM', 'AVER', 'POS', 'SAMP', 'NEG'];
  const DETECTORS_RS = ['POS', 'NEG', 'SAMP', 'RMS', 'AVER', 'QPE', 'LPN'];
  const detectors = manufacturer === 'keysight' ? DETECTORS_KS : DETECTORS_RS;

  const TRACE_MODES = ['WRIT', 'MAXH', 'MINH', 'AVER', 'VIEW', 'BLAN'];

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Spectrum Display */}
      <div className="col-span-12 xl:col-span-8">
        <div className="rounded-[2rem] border border-white/10 bg-[#050709] overflow-hidden shadow-2xl" style={{ minHeight: '480px' }}>
          {/* Display Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <span className="text-[11px] font-black text-white/30 uppercase tracking-widest">
              {manufacturer === 'keysight' ? 'MXA N9020B / PXA N9030B' : 'R&S FSV3000 / FSW85'}
            </span>
            <div className="flex items-center gap-4 text-[10px] font-black">
              <span className="text-amber-400">{status?.center_hz != null ? `CF: ${(status.center_hz!/1e6).toFixed(3)} MHz` : 'CF: ---'}</span>
              <span className="text-white/40">{status?.span_hz != null ? `SPAN: ${(status.span_hz!/1e6).toFixed(1)} MHz` : 'SPAN: ---'}</span>
              <span className="text-white/40">{status?.ref_level_dbm != null ? `REF: ${status.ref_level_dbm} dBm` : 'REF: ---'}</span>
              <span className="text-emerald-400">{status?.rbw_hz != null ? `RBW: ${(status.rbw_hz!/1e3).toFixed(0)} kHz` : 'RBW: ---'}</span>
            </div>
          </div>

          {/* Trace Area */}
          <div className="relative" style={{ height: '320px' }}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {/* 10x10 Grid */}
              {Array.from({length: 11}).map((_, i) => (
                <line key={`v${i}`} x1={`${i*10}%`} y1="0" x2={`${i*10}%`} y2="100%"
                  stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              ))}
              {Array.from({length: 11}).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={`${i*10}%`} x2="100%" y2={`${i*10}%`}
                  stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              ))}
              {/* Reference level line */}
              <line x1="0" y1="10%" x2="100%" y2="10%" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4,4" />
              
              {/* Trace — yellow for T1 (R&S style), blue for Keysight */}
              <polyline fill="none"
                stroke={manufacturer === 'rs' ? '#FACC15' : '#3B82F6'}
                strokeWidth="1.5"
                filter={`drop-shadow(0 0 6px ${manufacturer === 'rs' ? 'rgba(250,204,21,0.4)' : 'rgba(59,130,246,0.4)'})`}
                points={status?.trace 
                  ? status.trace.map((p, i) => {
                      const x = (i / (status.trace!.length - 1)) * 100;
                      const y = Math.max(0, Math.min(100, (p.amp + 110) / 1.2 * -1 + 95));
                      return `${x}%,${y}%`;
                    }).join(' ')
                  : Array.from({length: 100}, (_, i) => {
                      const x = (i / 99) * 100;
                      // Fallback static line if no trace data
                      return `${x}%,90%`;
                    }).join(' ')}
              />
              
              {/* Markers diamonds — positioned precisely from real data */}
              {markers.filter(m => m.active).map((m) => {
                const colors = ['#F43F5E', '#3B82F6', '#22C55E', '#F59E0B', '#A78BFA', '#06B6D4'];
                const col = colors[(m.index - 1) % colors.length];
                
                // Map marker frequency/amplitude to SVG coordinates
                let xPct = 50;
                let yPct = 50;
                
                if (status.span_hz && status.center_hz) {
                  const start = status.center_hz - status.span_hz / 2;
                  xPct = ((m.x - start) / status.span_hz) * 100;
                }
                
                if (status.ref_level_dbm) {
                  const ref = status.ref_level_dbm;
                  // Assumes 100dB total scale (10dB/div)
                  yPct = (ref - m.y) / 100 * 100;
                }

                if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) return null;

                return (
                  <g key={m.index} transform={`translate(${xPct}%, ${yPct}%)`}>
                    <polygon points="0,-6 6,0 0,6 -6,0" fill={col} opacity="0.9" stroke="white" strokeWidth="0.5" />
                    <text x="8" y="-8" fill={col} fontSize="10" fontWeight="900" className="drop-shadow-sm">M{m.index}</text>
                  </g>
                );
              })}
            </svg>

            {/* Y Axis Labels */}
            <div className="absolute left-2 top-0 h-full flex flex-col justify-between py-2 pointer-events-none">
              {[10, 0, -10, -20, -30, -40, -50, -60, -70, -80, -100].map(v => (
                <span key={v} className="text-[8px] font-black text-white/20 font-mono">{v}</span>
              ))}
            </div>
          </div>

          {/* Bottom Status Row (1:1 replica of hardware) */}
          <div className="grid grid-cols-6 gap-px border-t border-white/5 bg-white/5">
            {[
              { label: 'Center', value: status?.center_hz != null ? `${(status.center_hz/1e6).toFixed(3)} MHz` : '1000.000 MHz' },
              { label: 'Span', value: status?.span_hz != null ? `${(status.span_hz/1e6).toFixed(1)} MHz` : '100.0 MHz' },
              { label: 'Res BW', value: status?.rbw_hz != null ? `${(status.rbw_hz/1e3).toFixed(0)} kHz` : '1000 kHz' },
              { label: 'Vid BW', value: status?.vbw_hz != null ? `${(status.vbw_hz/1e3).toFixed(0)} kHz` : '3000 kHz' },
              { label: 'Sweep', value: status?.sweep_time_s != null ? `${(status.sweep_time_s*1000).toFixed(0)} ms` : '20.0 ms' },
              { label: 'Points', value: String(status?.points ?? 1001) },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center justify-center py-3 bg-[#050709]">
                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{label}</span>
                <span className="text-[11px] font-black text-white tracking-wider">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Settings + Markers */}
      <div className="col-span-12 xl:col-span-4 space-y-4">
        {/* Frequency */}
        <ControlSection title="Frequency Setup" icon={<Gauge size={16}/>}>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <span className="text-[9px] font-black text-white/40 uppercase w-12">Center</span>
              <input value={center} onChange={e => setCenter(e.target.value)} type="number"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-white font-mono text-xs outline-none focus:border-accent-blue" />
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-[9px] font-black text-white/40 uppercase w-12">Span</span>
              <input value={span} onChange={e => setSpan(e.target.value)} type="number"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-white font-mono text-xs outline-none focus:border-accent-blue" />
              <select value={freqUnit} onChange={e => setFreqUnit(e.target.value as 'MHz'|'GHz')}
                className="bg-[#0B0F19] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs font-black outline-none">
                <option>MHz</option><option>GHz</option>
              </select>
              <button onClick={applyFreq} className="px-3 py-1.5 bg-accent-blue text-white rounded-lg font-black text-[10px] hover:bg-accent-blue/80">SET</button>
            </div>
          </div>
        </ControlSection>

        {/* Acquisition */}
        <ControlSection title="Acquisition" icon={<Sliders size={16}/>}>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[8px] font-black text-white/30 uppercase block">Ref Level (dBm)</span>
              <div className="flex gap-1">
                <input value={refLevel} onChange={e => setRefLevel(e.target.value)} type="number"
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-white font-mono text-xs outline-none focus:border-accent-blue" />
                <button onClick={() => api('/analyzer/settings', { ref_level: parseFloat(refLevel), manufacturer })}
                  className="px-2 py-1 bg-white/10 border border-white/10 rounded-lg text-white text-[9px] font-black hover:bg-white/20">SET</button>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black text-white/30 uppercase">Atten (dB)</span>
                <button onClick={() => setAttenAuto(!attenAuto)}
                  className={`text-[7px] font-black px-1.5 py-0.5 rounded border ${attenAuto ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-white/10 text-white/30'}`}>
                  AUTO
                </button>
              </div>
              <div className="flex gap-1">
                <input value={atten} onChange={e => setAtten(e.target.value)} type="number"
                  disabled={attenAuto}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-white font-mono text-xs outline-none focus:border-accent-blue disabled:opacity-30" />
                <button onClick={() => api('/analyzer/settings', { attenuation: parseFloat(atten), attenuation_auto: attenAuto, manufacturer })}
                  className="px-2 py-1 bg-white/10 border border-white/10 rounded-lg text-white text-[9px] font-black hover:bg-white/20">SET</button>
              </div>
            </div>
          </div>

          {/* Detector */}
          <div className="space-y-1 mt-2">
            <span className="text-[8px] font-black text-white/30 uppercase block">Detector</span>
            <div className="flex flex-wrap gap-1.5">
              {detectors.map(d => (
                <button key={d} onClick={() => { setDetector(d); api('/analyzer/settings', { detector: d, manufacturer }); }}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black border transition-all ${
                    detector === d ? 'bg-accent-blue/20 border-accent-blue/40 text-accent-blue' : 'border-white/10 text-white/40 hover:text-white hover:border-white/20'
                  }`}>{d}</button>
              ))}
            </div>
          </div>

          {/* Trace Mode */}
          <div className="space-y-1 mt-2">
            <span className="text-[8px] font-black text-white/30 uppercase block">Trace Mode (T1)</span>
            <div className="flex flex-wrap gap-1.5">
              {TRACE_MODES.map(m => (
                <button key={m} onClick={() => api('/analyzer/trace-mode', { mode: m, manufacturer })}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-black border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all">{m}</button>
              ))}
            </div>
          </div>

          {/* Average */}
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => { setAvgOn(!avgOn); api('/analyzer/settings', { avg_state: !avgOn, avg_count: parseInt(avgCount), manufacturer }); }}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black border transition-all ${avgOn ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-white/10 text-white/40'}`}>
              AVG {avgOn ? 'ON' : 'OFF'}
            </button>
            <div className="flex-1 space-y-0.5">
              <span className="text-[7px] font-black text-white/20 uppercase block">Count</span>
              <input value={avgCount} onChange={e => setAvgCount(e.target.value)} type="number"
                className="w-full bg-white/5 border border-white/10 rounded-lg p-1 text-white font-mono text-xs outline-none focus:border-accent-blue" />
            </div>
          </div>
        </ControlSection>

        {/* Marker Hub */}
        <ControlSection title="6-Marker Hub" icon={<Target size={16}/>}>
          <div className="space-y-1.5">
            {markers.slice(0, 6).map((m) => {
              const colors = ['#F43F5E', '#3B82F6', '#22C55E', '#F59E0B', '#A78BFA', '#06B6D4'];
              const col = colors[(m.index - 1) % colors.length];
              return (
                <div key={m.index} onClick={() => setSelectedMarker(m.index)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    selectedMarker === m.index ? 'bg-white/10 border-white/20' : 'border-white/5 hover:border-white/10 bg-white/[0.02]'
                  }`}>
                  <div className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-[9px] font-black"
                       style={{ backgroundColor: `${col}22`, border: `1px solid ${col}55`, color: col }}>
                    {m.index}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span className="text-[10px] font-black text-white truncate font-mono">
                        {m.x ? `${(m.x/1e9).toFixed(5)} GHz` : '---'}
                      </span>
                      <span className="text-[10px] font-black text-white/60 font-mono ml-2 flex-shrink-0">
                        {m.y > -190 ? `${m.y.toFixed(2)} dBm` : '---'}
                      </span>
                    </div>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.active ? 'bg-emerald-400' : 'bg-white/10'}`} />
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={() => api('/analyzer/marker', { index: selectedMarker, search_peak: true, manufacturer })}
              className="flex items-center justify-center gap-1.5 py-3 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue rounded-xl hover:bg-accent-blue/20 transition-all font-black text-[9px] uppercase tracking-wider">
              <MagnifyingGlass weight="bold" size={12} /> Peak M{selectedMarker}
            </button>
            <button onClick={() => api('/analyzer/marker', { index: selectedMarker, direction: 'RIGHT', manufacturer })}
              className="flex items-center justify-center gap-1.5 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl hover:bg-white/10 transition-all font-black text-[9px] uppercase tracking-wider">
              <ArrowRight weight="bold" size={12} /> Next Peak
            </button>
            <button onClick={() => api('/analyzer/marker', { index: selectedMarker, state: true, manufacturer })}
              className="flex items-center justify-center gap-1.5 py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl hover:bg-white/10 transition-all font-black text-[8px] uppercase">
              <Plus weight="bold" size={10} /> Enable M{selectedMarker}
            </button>
            <button onClick={() => api('/analyzer/marker', { clear_all: true, manufacturer })}
              className="flex items-center justify-center gap-1.5 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all font-black text-[8px] uppercase">
              <Trash weight="bold" size={10} /> Clear All
            </button>
          </div>
        </ControlSection>

        {/* Status */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/20 rounded-xl border border-white/5">
          <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Last Command</span>
          <span className="text-[10px] font-black text-white uppercase tracking-wider">{lastCmd}</span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────── Shared Components ───────────────────────────────
const ControlSection: React.FC<{title: string; icon: React.ReactNode; children: React.ReactNode}> = ({ title, icon, children }) => (
  <div className="bg-[#0B0F19] border border-white/5 rounded-2xl p-5 space-y-4">
    <div className="flex items-center gap-2 pb-3 border-b border-white/5">
      <span className="text-accent-blue">{icon}</span>
      <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{title}</span>
    </div>
    {children}
  </div>
);

export { MasterControlPage };
export default MasterControlPage;
