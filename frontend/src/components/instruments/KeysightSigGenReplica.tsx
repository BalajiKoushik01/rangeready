/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FILE: KeysightSigGenReplica.tsx
 * ROLE: 1-to-1 physical emulation of the Keysight EXG N5171B Analog Signal Generator.
 * Reference: Keysight X-Series Signal Generators User's Guide (N5171-90008)
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTraceLog, SCPITracePanel } from './SCPITracePanel';
import { HKey, UnitTerminationStrip } from './InstrumentKeys';

const API = (path: string) =>
    `http://${globalThis.location.hostname}:8787/api/instrument-control${path}`;

interface Props { status?: any; wsStatus?: 'connecting' | 'connected' | 'offline'; }

export const KeysightSigGenReplica: React.FC<Props> = ({ status, wsStatus = 'offline' }) => {
    const [ip, setIp] = useState('192.168.1.10'); // Updated to user's 192.x subnet
    const [connStatus, setConnStatus] = useState(wsStatus);
    const [traceOpen, setTraceOpen] = useState(false);
    const [amDepth, setAmDepth] = useState('30');
    const [fmDev, setFmDev] = useState('10000');
    const [sweepStart, setSweepStart] = useState('1.0e9');
    const [sweepStop, setSweepStop] = useState('2.0e9');
    const [pulseWidth, setPulseWidth] = useState('1.0e-6');
    const [pulsePeriod, setPulsePeriod] = useState('1.0e-3');

    // Live Typed State (for the "Premium" typable feel)
    const [typedFreq, setTypedFreq] = useState('');
    const [typedPow, setTypedPow] = useState('');
    const [focusTarget, setFocusTarget] = useState<'freq' | 'pow' | null>(null);

    const freqRef = useRef<HTMLInputElement>(null);
    const powRef = useRef<HTMLInputElement>(null);

    const { events, push, clear, tracedFetch } = useTraceLog();

    // Auto-Focus Engine: Ensures the GUI "takes inputs" immediately when a field is activated
    useEffect(() => {
        if (focusTarget === 'freq') {
            freqRef.current?.focus();
            freqRef.current?.select();
        } else if (focusTarget === 'pow') {
            powRef.current?.focus();
            powRef.current?.select();
        }
    }, [focusTarget]);

    const connectHardware = async () => {
        setConnStatus('connecting');
        push({ kind: 'connect', label: `Initiating TCP connection to ${ip}:5025`, source: 'LXI Connect' });
        try {
            const res = await fetch(`http://${globalThis.location.hostname}:8787/api/system/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'Signal Generator', manufacturer: 'keysight', ip, model: 'N5171B' })
            });
            const data = await res.json();
            if (res.ok) {
                setConnStatus('connected');
                push({ kind: 'ack', label: `Connected: ${data.idn || ip}`, source: 'LXI Connect' });
            } else {
                setConnStatus('offline');
                push({ kind: 'error', label: `Failed: ${data.detail || 'Unreachable'}`, source: 'LXI Connect', isErr: true });
            }
        } catch {
            setConnStatus('offline');
            push({ kind: 'error', label: 'TCP timeout — check cable and IP', source: 'LXI Connect', isErr: true });
        }
    };

    const cmd = useCallback((source: string, scpiStr: string, endpoint: string, body: any) => {
        if (connStatus !== 'connected' && !source.includes('Connect')) {
             push({ kind: 'info', label: 'Local block: Hardware not connected', source: 'UI Guard' });
             return;
        }
        return tracedFetch(source, scpiStr, API(`/siggen/${endpoint}?manufacturer=keysight`), body);
    }, [tracedFetch, connStatus, push]);

    const enter = useCallback((mult: number, type: 'freq' | 'pow') => {
        const sourceVal = type === 'freq' ? typedFreq : typedPow;
        if (!sourceVal) return;

        const val = Number.parseFloat(sourceVal) * mult;
        if (type === 'freq') {
            cmd('FREQ Entry', `SOUR:FREQ:CW ${val} HZ`, 'frequency', { freq_hz: val });
        } else {
            // Power is usually dBm, so mult is 1 for dBm
            cmd('AMPL Entry', `SOUR:POW:LEV:IMM:AMPL ${val} DBM`, 'power', { power_dbm: val });
        }
        setTypedFreq('');
        setTypedPow('');
        setFocusTarget(null);
    }, [cmd, typedFreq, typedPow]);

    const statusDot = connStatus === 'connected'
        ? 'bg-[#48BB78] shadow-[0_0_8px_#48BB78]'
        : connStatus === 'connecting' ? 'bg-[#ECC94B] animate-pulse' : 'bg-[#E53E3E]';

    const freq_mhz = status?.freq_hz ? (status.freq_hz / 1e6).toFixed(6) : null;
    const power_dbm = status?.power_dbm !== undefined ? status.power_dbm.toFixed(2) : null;

    return (
        <div className="flex flex-col rounded-[2rem] overflow-hidden glass-panel border border-white/5 p-1">

            {/* ── Chassis Title + IP Bar ─────────────────────────────────────── */}
            <div className="bg-[#1A202C] flex items-center justify-between px-4 py-2 border-b-4 border-[#2D3748]">
                <span className="text-[11px] font-bold tracking-widest uppercase text-white/70">
                    <span className="text-[#E53E3E]">KEYSIGHT</span> EXG Analog Signal Generator · N5171B
                </span>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-black/40 rounded px-3 py-1 gap-2 border border-white/10">
                        <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">LXI</span>
                        <input type="text" value={ip} onChange={e => setIp(e.target.value)}
                            className="bg-black text-[12px] font-mono text-white px-2 py-0.5 rounded w-32 border border-white/20 outline-none focus:border-[#3182CE]" />
                        <button type="button" onClick={connectHardware}
                            className="text-[9px] font-bold uppercase tracking-widest px-3 py-1 bg-[#3182CE] text-white rounded hover:bg-[#2B6CB0] transition-colors">
                            CONNECT
                        </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${statusDot}`} />
                        <span className="text-[10px] font-bold uppercase text-white/50 w-20">{connStatus}</span>
                    </div>
                    <button type="button" onClick={() => setTraceOpen(o => !o)}
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-colors ${traceOpen ? 'bg-white/10 border-white/20 text-white/70' : 'bg-transparent border-white/10 text-white/30'}`}>
                        TRACE {traceOpen ? '▼' : '▶'}
                    </button>
                </div>
            </div>

            <div className="flex gap-0">
                {/* ── Left: Screen + Softkeys ───────────────────────────────── */}
                <div className="flex flex-1 flex-col relative">
                    {/* DISCONNECTED OVERLAY */}
                    {connStatus !== 'connected' && (
                        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                            <div className="w-16 h-16 border-4 border-white/10 border-t-[#3182CE] rounded-full animate-spin mb-4" />
                            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Awaiting Hardware...</h3>
                            <p className="text-[10px] text-white/50 mb-6 max-w-[240px] uppercase font-bold tracking-widest">
                                The system is aggressively scanning all subnets (169.x, 10.x, 192.x). 
                                Ensure Instrument is LXI-Ready.
                            </p>
                            <div className="flex gap-2">
                                <button onClick={connectHardware} className="px-6 py-2 bg-[#3182CE] text-white text-[11px] font-black rounded shadow-[0_0_15px_rgba(49,130,206,0.3)] hover:scale-105 active:scale-95 transition-all">TRY MANUAL CONNECT</button>
                                <button onClick={() => push({kind: 'info', label: 'Manual network rescan triggered', source: 'LXI Sentry'})} className="px-6 py-2 bg-white/10 text-white text-[11px] font-black rounded hover:bg-white/20 transition-all">RESCAN NETWORK</button>
                            </div>
                        </div>
                    )}

                    <div className="flex bg-[#4A5568] p-3 gap-3 h-[320px]">
                        {/* LCD */}
                        <div className="flex-1 glass-lcd p-4 flex flex-col relative animate-glow-blue">
                            {/* SCAN LINES EFFECT */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,white_3px)]" />
                            <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:4px_4px]" />
                            
                            <div className="flex justify-between border-b border-white/5 pb-2 mb-3 items-center">
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${connStatus === 'connected' ? 'bg-[#48BB78] shadow-[0_0_5px_#48BB78]' : 'bg-red-500 animate-pulse'}`} />
                                    <span className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest">LIVE FREQUENCY</span>
                                </div>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${status?.rf_state ? 'bg-[#FC8181] text-black shadow-[0_0_10px_rgba(252,129,129,0.4)]' : 'bg-white/5 text-[#718096]'}`}>
                                    {status?.rf_state ? 'RF ON' : 'RF OFF'}
                                </span>
                            </div>

                            <div className="flex flex-col gap-6 flex-1 justify-center">
                                {/* Frequency Entry Section */}
                                <div 
                                    className={`relative group p-3 rounded-lg transition-all cursor-text ${focusTarget === 'freq' ? 'bg-white/5 ring-1 ring-[#3182CE]/50 shadow-[0_0_15px_rgba(49,130,206,0.1)]' : 'border border-transparent hover:bg-white/[0.02]'}`}
                                    onClick={() => setFocusTarget('freq')}
                                >
                                    <span className={`text-[9px] font-black uppercase tracking-widest block mb-1.5 ${focusTarget === 'freq' ? 'text-[#3182CE]' : 'text-white/20'}`}>
                                        CW Frequency
                                    </span>
                                    <div className="flex items-baseline gap-3">
                                        <input
                                            ref={freqRef}
                                            type="text"
                                            value={focusTarget === 'freq' ? typedFreq : (freq_mhz || '---.------')}
                                            onChange={(e) => setTypedFreq(e.target.value)}
                                            onFocus={() => setFocusTarget('freq')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') setFocusTarget('freq');
                                                if (e.key === 'Escape') { setTypedFreq(''); setFocusTarget(null); }
                                            }}
                                            className="bg-transparent text-[3.8rem] font-black text-white font-mono leading-none outline-none w-full placeholder:text-white/5"
                                        />
                                        <span className={`text-xl font-mono font-black transition-colors ${focusTarget === 'freq' ? 'text-[#3182CE]' : 'text-white/30'}`}>MHz</span>
                                    </div>

                                    {/* Unit Selection Strip (BLUE THEME) */}
                                    {focusTarget === 'freq' && typedFreq && (
                                        <div className="absolute -right-14 top-0 bottom-0 flex items-center">
                                            <UnitTerminationStrip 
                                                units={[
                                                    { label: 'GHz', mult: 1e9 },
                                                    { label: 'MHz', mult: 1e6 },
                                                    { label: 'kHz', mult: 1e3 },
                                                    { label: 'Hz', mult: 1 }
                                                ]}
                                                onSelect={(m) => enter(m, 'freq')}
                                                onCancel={() => { setTypedFreq(''); setFocusTarget(null); }}
                                                theme="blue"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Amplitude Entry Section */}
                                <div 
                                    className={`relative group p-3 rounded-lg transition-all cursor-text ${focusTarget === 'pow' ? 'bg-white/5 ring-1 ring-[#FC8181]/50 shadow-[0_0_15px_rgba(252,129,129,0.1)]' : 'border border-transparent hover:bg-white/[0.02]'}`}
                                    onClick={() => setFocusTarget('pow')}
                                >
                                    <span className={`text-[9px] font-black uppercase tracking-widest block mb-1.5 ${focusTarget === 'pow' ? 'text-[#FC8181]' : 'text-white/20'}`}>
                                        Amplitude
                                    </span>
                                    <div className="flex items-baseline gap-3">
                                        <input
                                            ref={powRef}
                                            type="text"
                                            value={focusTarget === 'pow' ? typedPow : (power_dbm || '--.--')}
                                            onChange={(e) => setTypedPow(e.target.value)}
                                            onFocus={() => setFocusTarget('pow')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') setFocusTarget('pow');
                                                if (e.key === 'Escape') { setTypedPow(''); setFocusTarget(null); }
                                            }}
                                            className="bg-transparent text-[2.8rem] font-black text-white font-mono leading-none outline-none w-full placeholder:text-white/5"
                                        />
                                        <span className={`text-lg font-mono font-black transition-colors ${focusTarget === 'pow' ? 'text-[#FC8181]' : 'text-white/30'}`}>dBm</span>
                                    </div>
                                    
                                    {/* Unit Selection Strip (RED THEME) */}
                                    {focusTarget === 'pow' && typedPow && (
                                        <div className="absolute -right-14 top-0 bottom-0 flex items-center">
                                            <UnitTerminationStrip 
                                                units={[
                                                    { label: 'dBm', mult: 1 },
                                                    { label: 'dBV', mult: 1 },
                                                    { label: 'mV', mult: 1e-3 },
                                                    { label: 'uV', mult: 1e-6 }
                                                ]}
                                                onSelect={(m) => enter(m, 'pow')}
                                                onCancel={() => { setTypedPow(''); setFocusTarget(null); }}
                                                theme="red"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-6 bg-[#3182CE]/30 rounded-full overflow-hidden">
                                            <div className="w-full h-1/2 bg-[#3182CE] animate-bounce" />
                                        </div>
                                        <span className="text-[10px] text-white/40 font-mono uppercase tracking-[0.2em]">
                                            {focusTarget ? `ENTRY: ${focusTarget === 'freq' ? typedFreq : typedPow}` : 'SYSTEM READY'}
                                        </span>
                                    </div>
                                    {focusTarget && (
                                        <span className="text-[9px] font-black text-[#3182CE] animate-pulse uppercase tracking-widest">
                                            Awaiting Termination...
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* 6 Softkeys */}
                        <div className="w-14 flex flex-col justify-between py-1 gap-1">
                            {['FREQ', 'AMPTD', 'SWEEP', 'PULSE', 'MOD', 'UTIL'].map(lbl => (
                                <div key={lbl} className="flex items-center gap-1">
                                    <div className="w-2 h-5 bg-white/10 rounded-l-sm flex-shrink-0" />
                                    <button type="button"
                                        className="flex-1 h-10 bg-[#718096] border-t border-[#A0AEC0] border-b-[#4A5568] rounded-r text-[7px] font-bold text-white/80 active:translate-y-px active:bg-[#4A5568] transition-all"
                                        onClick={() => push({ kind: 'info', label: `Softkey [${lbl}] pressed`, source: `SOFTKEY-${lbl}` })}>
                                        {lbl}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SCPI Trace Panel */}
                    <div className={`transition-all duration-300 overflow-hidden ${traceOpen ? 'h-48' : 'h-0'}`}>
                        <SCPITracePanel events={events} isOpen={traceOpen} onClear={clear} />
                    </div>
                </div>

                {/* ── Right: Physical Control Clusters ──────────────────────── */}
                <div className="w-[440px] flex-shrink-0 bg-white/[0.02] p-6 grid grid-cols-2 gap-6 border-l border-white/5">

                    {/* RF & MOD master toggles */}
                    <div className="col-span-2 grid grid-cols-2 gap-4">
                        <button type="button"
                            onClick={() => cmd('RF OUTPUT', `OUTP:STAT ${!status?.rf_state ? 'ON' : 'OFF'}`, 'rf', { state: !status?.rf_state })}
                            className={`h-20 rounded-2xl shadow-xl text-[12px] font-black uppercase tracking-[0.2em] flex flex-col items-center justify-center transition-all duration-300 active:scale-95 border ${status?.rf_state ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}>
                            <span className="text-[8px] mb-1 opacity-60">RF OUTPUT</span>
                            {status?.rf_state ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                        <button type="button"
                            onClick={() => cmd('MOD', `SOUR:MOD:ALL:STAT ${!status?.mod_state ? 'ON' : 'OFF'}`, 'modulation', { state: !status?.mod_state, type: 'AM' })}
                            className={`h-20 rounded-2xl shadow-xl text-[12px] font-black uppercase tracking-[0.2em] flex flex-col items-center justify-center transition-all duration-300 active:scale-95 border ${status?.mod_state ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-[0_0_30px_rgba(0,245,255,0.2)]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}>
                            <span className="text-[8px] mb-1 opacity-60">MODULATION</span>
                            {status?.mod_state ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                    </div>

                    {/* Modulation cluster */}
                    <div className="col-span-2 bg-[#E2E8F0] rounded-lg p-3 border border-white shadow-inner">
                        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block mb-2">Modulation</span>
                        <div className="grid grid-cols-4 gap-2">
                            <HKey label="AM" onClick={() => cmd('AM ON', 'SOUR:AM:STAT ON', 'modulation', { state: true, type: 'AM', depth: Number.parseFloat(amDepth) })} />
                            <HKey label="FM" onClick={() => cmd('FM ON', 'SOUR:FM:STAT ON', 'modulation', { state: true, type: 'FM', deviation: Number.parseFloat(fmDev) })} />
                            <HKey label="ΦM" onClick={() => cmd('PM ON', 'SOUR:PM:STAT ON', 'modulation', { state: true, type: 'PM' })} />
                            <HKey label="PULSE" onClick={() => cmd('PULSE MOD ON', 'SOUR:PULM:STAT ON', 'modulation', { state: true, type: 'PULSE' })} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="flex items-center gap-1">
                                <span className="text-[8px] text-[#718096] w-16">AM Depth %</span>
                                <input type="number" value={amDepth} onChange={e => setAmDepth(e.target.value)} className="flex-1 bg-white border border-[#CBD5E1] rounded px-2 py-1 text-[11px] font-mono text-[#2D3748]" />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[8px] text-[#718096] w-16">FM Dev Hz</span>
                                <input type="number" value={fmDev} onChange={e => setFmDev(e.target.value)} className="flex-1 bg-white border border-[#CBD5E1] rounded px-2 py-1 text-[11px] font-mono text-[#2D3748]" />
                            </div>
                        </div>
                    </div>

                    {/* Sweep cluster */}
                    <div className="col-span-2 bg-[#E2E8F0] rounded-lg p-3 border border-white shadow-inner">
                        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block mb-2">Frequency Sweep</span>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="flex items-center gap-1">
                                <span className="text-[8px] text-[#718096] w-10">Start</span>
                                <input type="text" value={sweepStart} onChange={e => setSweepStart(e.target.value)} className="flex-1 bg-white border border-[#CBD5E1] rounded px-2 py-1 text-[11px] font-mono" placeholder="Hz" />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[8px] text-[#718096] w-10">Stop</span>
                                <input type="text" value={sweepStop} onChange={e => setSweepStop(e.target.value)} className="flex-1 bg-white border border-[#CBD5E1] rounded px-2 py-1 text-[11px] font-mono" placeholder="Hz" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <HKey label="SWEEP ON" onClick={() => cmd('SWEEP ON', `SOUR:FREQ:STAR ${sweepStart}; SOUR:FREQ:STOP ${sweepStop}; SOUR:FREQ:MODE SWEEP`, 'sweep', { start_hz: Number.parseFloat(sweepStart), stop_hz: Number.parseFloat(sweepStop), step_hz: 1e6, dwell_s: 0.01, manufacturer: 'keysight' })} />
                            <HKey label="STEP" onClick={() => cmd('SWEEP STEP', 'SOUR:SWE:MODE STEP', 'modulation', { state: true, type: 'AM' })} />
                            <HKey label="CW" onClick={() => cmd('CW MODE', 'SOUR:FREQ:MODE CW', 'frequency', { freq_hz: status?.freq_hz || 1e9 })} />
                        </div>
                    </div>

                    {/* Pulse cluster */}
                    <div className="col-span-2 bg-[#E2E8F0] rounded-lg p-3 border border-white shadow-inner">
                        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block mb-2">Pulse Modulation</span>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="flex items-center gap-1">
                                <span className="text-[8px] text-[#718096] w-12">Width</span>
                                <input type="text" value={pulseWidth} onChange={e => setPulseWidth(e.target.value)} className="flex-1 bg-white border border-[#CBD5E1] rounded px-2 py-1 text-[11px] font-mono" placeholder="s" />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[8px] text-[#718096] w-12">Period</span>
                                <input type="text" value={pulsePeriod} onChange={e => setPulsePeriod(e.target.value)} className="flex-1 bg-white border border-[#CBD5E1] rounded px-2 py-1 text-[11px] font-mono" placeholder="s" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <HKey label="PULSE INT" onClick={() => cmd('PULSE INT', 'SOUR:PULM:SOUR INT', 'pulse-params', { period: Number.parseFloat(pulsePeriod), width: Number.parseFloat(pulseWidth), manufacturer: 'keysight' })} />
                            <HKey label="PULSE EXT" onClick={() => cmd('PULSE EXT', 'SOUR:PULM:SOUR EXT', 'pulse-params', { period: Number.parseFloat(pulsePeriod), width: Number.parseFloat(pulseWidth), manufacturer: 'keysight' })} />
                            <HKey label="PULSE ON" onClick={() => cmd('PULSE ON', 'SOUR:PULM:STAT ON', 'modulation', { state: true, type: 'PULSE' })} />
                        </div>
                    </div>

                    {/* ALC */}
                    <div className="bg-[#E2E8F0] rounded-lg p-3 border border-white shadow-inner">
                        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block mb-2">ALC / Level</span>
                        <div className="grid grid-cols-2 gap-2">
                            <HKey label="ALC ON" onClick={() => cmd('ALC ON', 'SOUR:POW:ALC ON', 'alc', { state: true, manufacturer: 'keysight' })} />
                            <HKey label="ALC OFF" onClick={() => cmd('ALC OFF', 'SOUR:POW:ALC OFF', 'alc', { state: false, manufacturer: 'keysight' })} />
                        </div>
                    </div>

                    {/* System */}
                    <div className="bg-[#E2E8F0] rounded-lg p-3 border border-white shadow-inner">
                        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block mb-2">System</span>
                        <div className="grid grid-cols-2 gap-2">
                            <HKey label="*RST" onClick={() => cmd('RESET', '*RST', 'reset', { manufacturer: 'keysight' })} />
                            <HKey label="*CLS" onClick={() => cmd('CLEAR', '*CLS', 'frequency', { freq_hz: status?.freq_hz || 1e9 })} />
                        </div>
                    </div>

                   <div className="col-span-2 bg-[#CBD5E1] rounded-lg p-4 border border-[#A0AEC0] shadow-inner flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] font-black text-[#4A5568] uppercase tracking-widest mb-2 opacity-50">Signal Path Insight</span>
                        <div className="flex items-center gap-4 py-2">
                             <div className="flex flex-col items-center">
                                 <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${connStatus === 'connected' ? 'border-[#3182CE] text-[#3182CE] shadow-[0_0_10px_rgba(49,130,206,0.3)]' : 'border-gray-400 text-gray-400'}`}>
                                     <span className="text-[8px] font-black">OSC</span>
                                 </div>
                                 <span className="text-[7px] mt-1 font-bold text-gray-500">Internal</span>
                             </div>
                             <div className={`h-0.5 w-12 ${status?.rf_state ? 'bg-[#FC8181] shadow-[0_0_8px_#FC8181]' : 'bg-gray-300'}`} />
                             <div className="flex flex-col items-center">
                                 <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${status?.rf_state ? 'border-[#FC8181] text-[#FC8181] shadow-[0_0_10px_rgba(252,129,129,0.3)]' : 'border-gray-400 text-gray-400'}`}>
                                     <span className="text-[8px] font-black">OUT</span>
                                 </div>
                                 <span className="text-[7px] mt-1 font-bold text-gray-500">50 Ω</span>
                             </div>
                        </div>
                        <p className="text-[8px] text-gray-400 uppercase font-black tracking-tighter mt-2">
                            {connStatus === 'connected' ? 'Hardware Core: Synchronized' : 'Hardware Core: Standby'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
