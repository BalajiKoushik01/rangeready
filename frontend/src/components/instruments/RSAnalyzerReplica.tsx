/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FILE: RSAnalyzerReplica.tsx
 * ROLE: 1-to-1 physical emulation of the Rohde & Schwarz FSW Signal & Spectrum Analyzer.
 * Reference: R&S FSW User Manual (1312.8000.02) — Front Panel Overview
 *
 * FSW signature layout:
 *   - Large touchscreen (left) with measurement data blocks / spectrum
 *   - Physical block buttons arranged in function groups (right)
 *   - Rotary knob + step keys + numeric entry
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTraceLog, SCPITracePanel } from './SCPITracePanel';
import { HKey, UnitTerminationStrip } from './InstrumentKeys';

const API = (path: string) =>
    `http://${globalThis.location.hostname}:8787/api/instrument-control${path}`;

// Module-level infoblock — displayed FSW-style in the measurement header
interface InfoBlockProps { label: string; val: string | number; unit: string; }
const InfoBlock: React.FC<InfoBlockProps> = ({ label, val, unit }) => (
    <div className="bg-[#1A202C] border border-white/10 rounded p-2 text-left">
        <div className="text-[8px] font-bold text-[#FBD38D] uppercase tracking-wider mb-0.5">{label}</div>
        <div className="text-[13px] font-black font-mono text-white">{val} <span className="text-[9px] text-white/40">{unit}</span></div>
    </div>
);

interface Props { status?: any; wsStatus?: 'connecting' | 'connected' | 'offline'; }

export const RSAnalyzerReplica: React.FC<Props> = ({ status, wsStatus = 'offline' }) => {
    const [ip, setIp] = useState('192.168.1.11'); // Updated to user's 192.x subnet
    const [connStatus, setConnStatus] = useState(wsStatus);
    const [markerIdx, setMarkerIdx] = useState(1);
    const [traceOpen, setTraceOpen] = useState(false);
    const { events, push, clear, tracedFetch } = useTraceLog();

    // Typable State
    const [typedFreq, setTypedFreq] = useState('');
    const [typedSpan, setTypedSpan] = useState('');
    const [focusTarget, setFocusTarget] = useState<'freq' | 'span' | null>(null);

    const freqRef = useRef<HTMLInputElement>(null);
    const spanRef = useRef<HTMLInputElement>(null);

    // Auto-Focus Engine
    useEffect(() => {
        if (focusTarget === 'freq') {
            freqRef.current?.focus();
            freqRef.current?.select();
        } else if (focusTarget === 'span') {
            spanRef.current?.focus();
            spanRef.current?.select();
        }
    }, [focusTarget]);

    const connectHardware = async () => {
        setConnStatus('connecting');
        push({ kind: 'connect', label: `Initiating TCP to ${ip}:5025 (FSW)`, source: 'LXI Connect' });
        try {
            const res = await fetch(`http://${globalThis.location.hostname}:8787/api/system/config`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'Spectrum Analyzer', manufacturer: 'rs', ip, model: 'FSW' })
            });
            const data = await res.json();
            setConnStatus(res.ok ? 'connected' : 'offline');
            push({ kind: res.ok ? 'ack' : 'error', label: res.ok ? `Connected: ${data.idn || ip}` : `Failed: ${data.detail}`, source: 'LXI Connect', isErr: !res.ok });
        } catch {
            setConnStatus('offline');
            push({ kind: 'error', label: 'TCP timeout', source: 'LXI Connect', isErr: true });
        }
    };

    const cmd = (source: string, scpi: string, endpoint: string, body: any) =>
        tracedFetch(source, scpi, API(`/analyzer/${endpoint}?manufacturer=rs`), body);


    const enterFreq = useCallback((mult: number, type: 'freq' | 'span') => {
        const sourceVal = type === 'freq' ? typedFreq : typedSpan;
        if (!sourceVal) return;
        
        const val = Number.parseFloat(sourceVal) * mult;
        if (type === 'freq') {
            cmd('CENTER Freq', `SENS:FREQ:CENT ${val} HZ`, 'frequency', { center_hz: val, manufacturer: 'rs' });
        } else {
            cmd('SPAN', `SENS:FREQ:SPAN ${val} HZ`, 'frequency', { span_hz: val, manufacturer: 'rs' });
        }
        
        setTypedFreq('');
        setTypedSpan('');
        setFocusTarget(null);
    }, [cmd, typedFreq, typedSpan]);



    // Map live trace
    const traceData: any[] = status?.trace || [];
    const refLevel = status?.ref_level ?? 10;
    const bottomLevel = refLevel - 100;
    const polyPts = traceData.map((pt: any, i: number) => {
        const x = traceData.length > 1 ? (i / (traceData.length - 1)) * 1000 : 0;
        let y = 400 - (((pt.amp ?? -100) - bottomLevel) / (refLevel - bottomLevel)) * 400;
        y = Math.max(0, Math.min(400, y));
        return `${x},${y}`;
    }).join(' ');

    const statusDot = connStatus === 'connected' ? 'bg-[#48BB78] shadow-[0_0_8px_#48BB78]'
        : connStatus === 'connecting' ? 'bg-[#ECC94B] animate-pulse' : 'bg-[#E53E3E]';

    return (
        <div className="flex flex-col rounded-[2rem] overflow-hidden glass-panel border border-white/5 p-1">
            {/* ── Chassis Title + IP Bar ─────────────────────────────────────── */}
            <div className="bg-white/5 backdrop-blur-md flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black tracking-[0.3em] uppercase text-neon-violet drop-shadow-[0_0_8px_rgba(188,19,254,0.4)]">
                        ROHDE & SCHWARZ
                    </span>
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                        FSW SILICON · SIGNAL & SPECTRUM ANALYSIS CENTER
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-black/40 rounded-full px-4 py-1.5 gap-3 border border-white/10 shadow-inner">
                        <span className="text-[9px] text-neon-violet font-black uppercase tracking-wider">LXI</span>
                        <input type="text" value={ip} onChange={e => setIp(e.target.value)}
                            className="bg-transparent text-[12px] font-mono text-white w-32 border-none outline-none focus:ring-0" />
                        <button type="button" onClick={connectHardware}
                            className="text-[9px] font-black uppercase tracking-widest px-4 py-1 bg-neon-violet text-white rounded-full hover:scale-105 transition-all">
                            SYNC
                        </button>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${statusDot.replace('bg-', 'bg-')}`} />
                    <button type="button" onClick={() => setTraceOpen(o => !o)}
                        className="glass-btn !py-1 !px-3 border-neon-violet/30 text-neon-violet hover:bg-neon-violet/10">
                        TRACE {traceOpen ? '▼' : '▲'}
                    </button>
                </div>
            </div>

            <div className="flex gap-0 flex-1">
                {/* Left Side: Touchscreen */}
                <div className="flex-1 flex flex-col relative border-r border-white/5">
                    {/* DISCONNECTED OVERLAY */}
                    {connStatus !== 'connected' && (
                        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
                             <div className="w-20 h-20 border-t-4 border-neon-violet rounded-full animate-spin mb-6" />
                             <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">Initializing Apex Spectrum Sentry</h3>
                             <p className="text-[10px] text-white/40 mb-8 max-w-[300px] uppercase font-bold tracking-[0.2em] leading-relaxed">
                                Scanning Subnets · 192.168.1.x Environment<br/>
                                Analyzing Rohde & Schwarz Silicon Identity
                             </p>
                             <div className="flex gap-4">
                                 <button onClick={connectHardware} className="glass-btn-primary !border-neon-violet/40 !text-neon-violet hover:!bg-neon-violet/10">FORCE SYNC</button>
                                 <button onClick={() => push({kind: 'info', label: 'Manual network rescan triggered', source: 'LXI Sentry'})} className="glass-btn">RESCAN BUS</button>
                             </div>
                        </div>
                    )}

                    <div className="bg-[#111] p-3 flex gap-3 h-[320px]">
                        {/* Spectrum + info blocks */}
                        <div className="flex-1 flex flex-col gap-2">
                            <div className="grid grid-cols-4 gap-2 flex-shrink-0">
                                <div 
                                    className={`relative cursor-pointer group p-1.5 rounded-lg transition-all ${focusTarget === 'freq' ? 'bg-[#D69E2E]/10 ring-1 ring-[#D69E2E] shadow-[0_0_15px_rgba(214,158,46,0.1)]' : 'bg-[#1A202C] border border-white/10 hover:bg-white/5'}`}
                                    onClick={() => setFocusTarget('freq')}
                                >
                                    <div className={`text-[8px] font-black uppercase tracking-widest mb-1 ${focusTarget === 'freq' ? 'text-[#D69E2E]' : 'text-white/30'}`}>Center Freq</div>
                                    <div className="flex items-baseline gap-2">
                                        <input
                                            ref={freqRef}
                                            type="text"
                                            value={focusTarget === 'freq' ? typedFreq : (status?.center ? (status.center / 1e9).toFixed(6) : '---.---')}
                                            onChange={(e) => setTypedFreq(e.target.value)}
                                            onFocus={() => setFocusTarget('freq')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') setFocusTarget('freq');
                                                if (e.key === 'Escape') { setTypedFreq(''); setFocusTarget(null); }
                                            }}
                                            className="bg-transparent text-[14px] font-black font-mono text-white outline-none w-full placeholder:text-white/10"
                                            placeholder="--.---"
                                        />
                                        <span className={`text-[9px] font-bold transition-colors ${focusTarget === 'freq' ? 'text-[#D69E2E]' : 'text-white/30'}`}>GHz</span>
                                    </div>
                                    {focusTarget === 'freq' && typedFreq && (
                                        <div className="absolute -right-14 top-0 bottom-0 flex items-center">
                                            <UnitTerminationStrip 
                                                units={[{label:'GHz',mult:1e9},{label:'MHz',mult:1e6},{label:'kHz',mult:1e3}]}
                                                onSelect={(m) => enterFreq(m, 'freq')}
                                                onCancel={() => {setTypedFreq(''); setFocusTarget(null);}}
                                                theme="orange"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div 
                                    className={`relative cursor-pointer group p-1.5 rounded-lg transition-all ${focusTarget === 'span' ? 'bg-[#D69E2E]/10 ring-1 ring-[#D69E2E] shadow-[0_0_15px_rgba(214,158,46,0.1)]' : 'bg-[#1A202C] border border-white/10 hover:bg-white/5'}`}
                                    onClick={() => setFocusTarget('span')}
                                >
                                    <div className={`text-[8px] font-black uppercase tracking-widest mb-1 ${focusTarget === 'span' ? 'text-[#D69E2E]' : 'text-white/30'}`}>Span</div>
                                    <div className="flex items-baseline gap-2">
                                        <input
                                            ref={spanRef}
                                            type="text"
                                            value={focusTarget === 'span' ? typedSpan : (status?.span ? (status.span / 1e6).toFixed(3) : '---.-')}
                                            onChange={(e) => setTypedSpan(e.target.value)}
                                            onFocus={() => setFocusTarget('span')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') setFocusTarget('span');
                                                if (e.key === 'Escape') { setTypedSpan(''); setFocusTarget(null); }
                                            }}
                                            className="bg-transparent text-[14px] font-black font-mono text-white outline-none w-full placeholder:text-white/10"
                                            placeholder="--.-"
                                        />
                                        <span className={`text-[9px] font-bold transition-colors ${focusTarget === 'span' ? 'text-[#D69E2E]' : 'text-white/30'}`}>MHz</span>
                                    </div>
                                    {focusTarget === 'span' && typedSpan && (
                                        <div className="absolute -right-14 top-0 bottom-0 flex items-center">
                                            <UnitTerminationStrip 
                                                units={[{label:'GHz',mult:1e9},{label:'MHz',mult:1e6},{label:'kHz',mult:1e3}]}
                                                onSelect={(m) => enterFreq(m, 'span')}
                                                onCancel={() => {setTypedSpan(''); setFocusTarget(null);}}
                                                theme="orange"
                                            />
                                        </div>
                                    )}
                                </div>
                                <InfoBlock label="Ref Lvl" val={refLevel} unit="dBm" />
                                <InfoBlock label="RBW" val={status?.rbw ? (status.rbw / 1e3).toFixed(0) : '100'} unit="kHz" />
                            </div>
                            <div className="flex-1 glass-lcd border-white/10 rounded relative overflow-hidden animate-glow-orange">
                                <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 1000 360" preserveAspectRatio="none">
                                    <defs><pattern id="rs-grid" width="100" height="36" patternUnits="userSpaceOnUse"><path d="M100 0L0 0 0 36" fill="none" stroke="white" strokeWidth="0.8" /></pattern></defs>
                                    <rect width="1000" height="360" fill="url(#rs-grid)" />
                                </svg>
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 360" preserveAspectRatio="none">
                                    {traceData.length > 1 ? (
                                        <polyline fill="none" stroke="#FBD38D" strokeWidth="1.5" points={polyPts} className="drop-shadow-[0_0_6px_rgba(251,211,141,0.6)]" />
                                    ) : (
                                        <text x="500" y="180" fill="white" className="opacity-20" textAnchor="middle" fontSize="14" fontFamily="monospace">NO TRACE — CONNECT INSTRUMENT</text>
                                    )}
                                </svg>
                            </div>
                        </div>
                        <div className="w-14 flex flex-col justify-between py-1 gap-1">
                            {['MEAS', 'FREQ', 'AMPL', 'BW', 'TRIG', 'MKRS'].map((lbl, i) => (
                                <div key={i} className="flex items-center gap-1">
                                    <div className="w-2 h-5 bg-white/10 rounded-l-sm flex-shrink-0" />
                                    <button onClick={() => push({ kind: 'info', label: `Softkey [${lbl}]`, source: `SOFTKEY-${lbl}` })} className="flex-1 h-9 bg-[#4A5568] border-t border-[#718096] border-b-[#2D3748] rounded-r text-[7px] font-bold text-white/80 active:translate-y-px transition-all">{lbl}</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={`transition-all duration-300 overflow-hidden ${traceOpen ? 'h-48' : 'h-0'}`}>
                        <SCPITracePanel events={events} isOpen={traceOpen} onClear={clear} />
                    </div>
                </div>

                {/* Right Side: Physical Keys */}
                <div className="w-[400px] flex-shrink-0 bg-[#CBD5E1] p-4 flex flex-col gap-4 overflow-y-auto">
                    <div className="bg-[#E2E8F0] rounded-lg p-3 border border-white shadow-inner">
                        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block mb-2">Frequency / Span</span>
                        <div className="grid grid-cols-3 gap-2">
                            <HKey label="CENTER" onClick={() => cmd('CF', `FREQ:CENT ${status?.center || 1e9}`, 'frequency', { center_hz: status?.center || 1e9, manufacturer: 'rs' })} />
                            <HKey label="SPAN" onClick={() => cmd('SPAN FULL', 'FREQ:SPAN:FULL', 'frequency', { span_hz: 0, manufacturer: 'rs' })} />
                            <HKey label="START/STOP" onClick={() => push({ kind: 'info', label: 'Switch to Start/Stop entry mode', source: 'SAK START/STOP' })} />
                        </div>
                    </div>
                    <div className="bg-[#E2E8F0] rounded-lg p-3 border border-white shadow-inner">
                        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block mb-2">Amplitude / Input</span>
                        <div className="grid grid-cols-3 gap-2">
                            <HKey label="REF LVL" onClick={() => cmd('REF LVL', `DISP:WIND:TRACE:Y:RLEV ${refLevel}`, 'settings', { ref_level: refLevel, manufacturer: 'rs' })} />
                            <HKey label="ATT AUTO" onClick={() => cmd('ATT AUTO', 'INP:ATT:AUTO ON', 'settings', { attenuation_auto: true, manufacturer: 'rs' })} />
                            <HKey label="PREAMP" onClick={() => cmd('PREAMP', 'INP:GAIN:STAT ON', 'settings', { preamp: true, manufacturer: 'rs' })} />
                        </div>
                    </div>
                    <div className="bg-[#E2E8F0] rounded-lg p-3 border border-white shadow-inner">
                        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block mb-2">BW / Sweep</span>
                        <div className="grid grid-cols-3 gap-2">
                            <HKey label="RBW AUTO" onClick={() => cmd('RBW AUTO', 'BAND:AUTO ON', 'settings', { manufacturer: 'rs' })} />
                            <HKey label="VBW AUTO" onClick={() => cmd('VBW AUTO', 'BAND:VID:AUTO ON', 'settings', { manufacturer: 'rs' })} />
                            <HKey label="SINGLE" onClick={() => cmd('SINGLE', 'INIT:IMM', 'single-sweep', { manufacturer: 'rs' })} />
                        </div>
                    </div>
                    <div className="bg-[#E2E8F0] rounded-lg p-3 border border-white shadow-inner">
                        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block mb-2">Markers</span>
                        <div className="grid grid-cols-4 gap-1 mb-2">
                            {[1, 2, 3, 4].map(i => (
                                <button key={i} onClick={() => setMarkerIdx(i)} className={`h-8 rounded text-[9px] font-bold transition-all ${markerIdx === i ? 'bg-[#2D3748] text-white' : 'bg-white text-[#4A5568] border border-[#CBD5E1] hover:bg-[#E2E8F0]'}`}>M{i}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <HKey label="PEAK" onClick={() => cmd(`MKR${markerIdx} MAX`, `CALC:MARK${markerIdx}:MAX`, 'marker', { index: markerIdx, search_peak: true, manufacturer: 'rs' })} />
                            <HKey label="NEXT" onClick={() => cmd(`MKR${markerIdx} NXT`, `CALC:MARK${markerIdx}:MAX:RIGHT`, 'marker', { index: markerIdx, direction: 'RIGHT', manufacturer: 'rs' })} />
                            <HKey label="MKR→CF" onClick={() => cmd('MKR→CF', `CALC:MARK${markerIdx}:FUNC:CENT:EXEC`, 'frequency', { center_hz: status?.markers?.[markerIdx - 1]?.x || 1e9, manufacturer: 'rs' })} />
                        </div>
                    </div>
                    <div className="bg-[#CBD5E1] rounded-lg p-4 border border-[#A0AEC0] shadow-inner flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] font-black text-[#4A5568] uppercase tracking-widest mb-3 opacity-60 italic">Hardware Telemetry Pulse</span>
                        <div className="w-full h-12 bg-black/10 rounded overflow-hidden flex items-end gap-[1px] px-2 py-1 border border-white/20">
                             {[...Array(24)].map((_, i) => (
                                 <div 
                                    key={i} 
                                    className={`flex-1 bg-[#D69E2E] transition-all duration-300 ${status?.trace ? 'opacity-80' : 'opacity-20'}`} 
                                    style={{ height: `${Math.random() * (status?.trace ? 100 : 20)}%` }} 
                                 />
                             ))}
                        </div>
                        <p className="text-[8px] font-black text-gray-500 uppercase mt-3 tracking-widest leading-none">
                            System Health: <span className={status?.trace ? 'text-green-600' : 'text-red-400'}>{status?.trace ? 'NOMINAL / SCANNING' : 'BUS STANDBY'}</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
