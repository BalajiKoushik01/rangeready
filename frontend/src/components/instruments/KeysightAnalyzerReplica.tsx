/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FILE: KeysightAnalyzerReplica.tsx
 * ROLE: 1-to-1 physical emulation of the Keysight MXA/PXA X-Series Signal Analyzer.
 * Reference: N9020B/N9030B User's Guide — Front Panel Overview
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTraceLog, SCPITracePanel } from './SCPITracePanel';
import { HKey, UnitTerminationStrip } from './InstrumentKeys';

const API = (path: string) =>
    `http://${globalThis.location.hostname}:8787/api/instrument-control${path}`;

interface Props { status?: any; wsStatus?: 'connecting' | 'connected' | 'offline'; }

export const KeysightAnalyzerReplica: React.FC<Props> = ({ status, wsStatus = 'offline' }) => {
    const [ip, setIp] = useState('192.168.1.101');
    const [connStatus, setConnStatus] = useState(wsStatus);
    const [traceOpen, setTraceOpen] = useState(true);
    const [markerIdx, setMarkerIdx] = useState(1);
    
    // Live Typed State
    const [typedFreq, setTypedFreq] = useState('');
    const [typedSpan, setTypedSpan] = useState('');
    const [focusTarget, setFocusTarget] = useState<'freq' | 'span' | null>(null);

    const freqRef = useRef<HTMLInputElement>(null);
    const spanRef = useRef<HTMLInputElement>(null);

    const { events, push, clear, tracedFetch } = useTraceLog();

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
        push({ kind: 'connect', label: `Initiating TCP to ${ip}:5025 (MXA/PXA)`, source: 'LXI Connect' });
        try {
            const res = await fetch(`http://${globalThis.location.hostname}:8787/api/system/config`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'Spectrum Analyzer', manufacturer: 'keysight', ip })
            });
            const data = await res.json();
            setConnStatus(res.ok ? 'connected' : 'offline');
            push({ kind: res.ok ? 'ack' : 'error', label: res.ok ? `Connected: ${data.idn || ip}` : `Failed: ${data.detail}`, source: 'LXI Connect', isErr: !res.ok });
        } catch {
            setConnStatus('offline');
            push({ kind: 'error', label: 'TCP timeout', source: 'LXI Connect', isErr: true });
        }
    };

    const cmd = useCallback((source: string, scpi: string, endpoint: string, body: any) =>
        tracedFetch(source, scpi, API(`/analyzer/${endpoint}?manufacturer=keysight`), body),
        [tracedFetch]);

    const enter = useCallback((mult: number, type: 'freq' | 'span') => {
        const sourceVal = type === 'freq' ? typedFreq : typedSpan;
        if (!sourceVal) return;

        const val = Number.parseFloat(sourceVal) * mult;
        if (type === 'freq') {
            cmd('FREQ Entry', `SENS:FREQ:CENT ${val}`, 'frequency', { center_hz: val, manufacturer: 'keysight' });
        } else {
            cmd('SPAN Entry', `SENS:FREQ:SPAN ${val}`, 'frequency', { span_hz: val, manufacturer: 'keysight' });
        }
        setTypedFreq('');
        setTypedSpan('');
        setFocusTarget(null);
    }, [cmd, typedFreq, typedSpan]);

    // Live spectrum polyline
    const traceData: any[] = status?.trace || [];
    const refLevel = status?.ref_level ?? 10;
    const bottomLevel = refLevel - 100;
    const polyPts = traceData.map((pt: any, i: number) => {
        const x = traceData.length > 1 ? (i / (traceData.length - 1)) * 1000 : 0;
        const y = Math.max(0, Math.min(400, 400 - (((pt.amp ?? -100) - bottomLevel) / (refLevel - bottomLevel)) * 400));
        return `${x},${y}`;
    }).join(' ');

    const statusClass = connStatus === 'connected'
        ? 'bg-[#48BB78] shadow-[0_0_8px_#48BB78]'
        : connStatus === 'connecting' ? 'bg-[#ECC94B] animate-pulse' : 'bg-[#E53E3E]';

    return (
        <div className="flex flex-col rounded-lg overflow-hidden border-[6px] border-[#CBD5E1] bg-[#E2E8F0] shadow-2xl">
            {/* Title + IP */}
            <div className="bg-[#1A202C] flex items-center justify-between px-4 py-2 border-b-4 border-[#2D3748]">
                <span className="text-[11px] font-bold tracking-widest uppercase text-white/70">
                    <span className="text-[#E53E3E]">KEYSIGHT</span> MXA Signal Analyzer · N9020B
                </span>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-black/40 rounded px-3 py-1 gap-2 border border-white/10">
                        <span className="text-[9px] text-white/40 font-bold uppercase">LXI</span>
                        <input type="text" value={ip} onChange={e => setIp(e.target.value)}
                            className="bg-black text-[12px] font-mono text-white px-2 py-0.5 rounded w-32 border border-white/20 outline-none focus:border-[#3182CE]" />
                        <button type="button" onClick={connectHardware}
                            className="text-[9px] font-bold uppercase px-3 py-1 bg-[#3182CE] text-white rounded hover:bg-[#2B6CB0]">CONNECT</button>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${statusClass}`} />
                        <span className="text-[10px] font-bold uppercase text-white/50 w-20">{connStatus}</span>
                    </div>
                    <button type="button" onClick={() => setTraceOpen(o => !o)}
                        className={`text-[9px] font-black uppercase px-2 py-1 rounded border transition-colors ${traceOpen ? 'bg-white/10 border-white/20 text-white/70' : 'bg-transparent border-white/10 text-white/30'}`}>
                        TRACE {traceOpen ? '▼' : '▶'}
                    </button>
                </div>
            </div>

            <div className="flex gap-0">
                {/* Left: Spectrum display */}
                <div className="flex-1 flex flex-col">
                    <div className="bg-[#4A5568] p-3 flex gap-3 h-[300px]">
                        <div className="flex-1 glass-lcd p-0 flex flex-col relative animate-glow-blue">
                             {/* SCAN LINES EFFECT */}
                             <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,white_3px)]" />
                            
                             {/* Display Grid Area */}
                             <div className="flex-1 relative overflow-hidden">
                                <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 1000 400" preserveAspectRatio="none">
                                    <defs>
                                        <pattern id="k-grid" width="100" height="40" patternUnits="userSpaceOnUse">
                                            <path d="M100 0L0 0 0 40" fill="none" stroke="white" strokeWidth="0.8" />
                                        </pattern>
                                    </defs>
                                    <rect width="1000" height="400" fill="url(#k-grid)" />
                                </svg>
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 400" preserveAspectRatio="none">
                                    {traceData.length > 1
                                        ? <polyline fill="none" stroke="#63B3ED" strokeWidth="1.5" points={polyPts} className="drop-shadow-[0_0_6px_rgba(99,179,237,0.6)]" />
                                        : <text x="500" y="200" fill="white" className="opacity-20" textAnchor="middle" fontSize="14" fontFamily="monospace">NO TRACE DATA</text>
                                    }
                                </svg>
                                <div className="absolute left-1 top-0 h-full flex flex-col justify-between py-1 pointer-events-none">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <span key={i} className="text-[8px] font-mono text-white/30">{(refLevel - i * 20).toFixed(0)}</span>
                                    ))}
                                </div>
                             </div>

                            {/* Typable Instrument Bar */}
                            <div className="bg-black/80 backdrop-blur border-t border-white/10 px-4 py-2 flex items-center gap-6 z-50">
                                {/* Center Freq Input */}
                                <div className="flex flex-col cursor-text" onClick={() => setFocusTarget('freq')}>
                                    <span className={`text-[7px] font-black uppercase tracking-widest ${focusTarget === 'freq' ? 'text-[#3182CE]' : 'text-white/20'}`}>Center Freq</span>
                                    <div className="flex items-baseline gap-1 relative">
                                        <input
                                            ref={freqRef}
                                            type="text"
                                            value={focusTarget === 'freq' ? typedFreq : (status?.center ? (status.center / 1e9).toFixed(6) : '---.------')}
                                            onChange={(e) => setTypedFreq(e.target.value)}
                                            onFocus={() => setFocusTarget('freq')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') setFocusTarget('freq');
                                                if (e.key === 'Escape') { setTypedFreq(''); setFocusTarget(null); }
                                            }}
                                            className="bg-transparent text-[14px] font-black font-mono text-white outline-none w-[90px]"
                                        />
                                        <span className="text-[9px] font-bold text-white/40">GHz</span>
                                        {focusTarget === 'freq' && typedFreq && (
                                            <div className="absolute left-0 bottom-full mb-4">
                                                <UnitTerminationStrip 
                                                    units={[{label:'GHz', mult:1e9}, {label:'MHz', mult:1e6}, {label:'kHz', mult:1e3}, {label:'Hz', mult:1}]}
                                                    onSelect={(m) => enter(m, 'freq')}
                                                    onCancel={() => {setTypedFreq(''); setFocusTarget(null);}}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="w-px h-6 bg-white/5" />
                                {/* Span Input */}
                                <div className="flex flex-col cursor-text" onClick={() => setFocusTarget('span')}>
                                    <span className={`text-[7px] font-black uppercase tracking-widest ${focusTarget === 'span' ? 'text-[#3182CE]' : 'text-white/20'}`}>Span</span>
                                    <div className="flex items-baseline gap-1 relative">
                                        <input
                                            ref={spanRef}
                                            type="text"
                                            value={focusTarget === 'span' ? typedSpan : (status?.span ? (status.span / 1e6).toFixed(3) : '---.---')}
                                            onChange={(e) => setTypedSpan(e.target.value)}
                                            onFocus={() => setFocusTarget('span')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') setFocusTarget('span');
                                                if (e.key === 'Escape') { setTypedSpan(''); setFocusTarget(null); }
                                            }}
                                            className="bg-transparent text-[14px] font-black font-mono text-white outline-none w-[70px]"
                                        />
                                        <span className="text-[9px] font-bold text-white/40">MHz</span>
                                        {focusTarget === 'span' && typedSpan && (
                                            <div className="absolute left-0 bottom-full mb-4">
                                                <UnitTerminationStrip 
                                                    units={[{label:'GHz', mult:1e9}, {label:'MHz', mult:1e6}, {label:'kHz', mult:1e3}, {label:'Hz', mult:1}]}
                                                    onSelect={(m) => enter(m, 'span')}
                                                    onCancel={() => {setTypedSpan(''); setFocusTarget(null);}}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="ml-auto flex items-center gap-6">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[7px] font-black uppercase tracking-widest text-white/20">Ref Level</span>
                                        <span className="text-[14px] font-black font-mono text-[#FC8181]">{refLevel} dBm</span>
                                    </div>
                                    <div className="flex flex-col items-end text-right">
                                         <span className="text-[7px] font-black uppercase tracking-widest text-white/20">RBW</span>
                                         <span className="text-[14px] font-black font-mono text-white">{status?.rbw ? (status.rbw / 1e3).toFixed(1) : '100.0'} kHz</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Softkeys */}
                        <div className="w-14 flex flex-col justify-between py-1 gap-1">
                            {['FREQ', 'AMPTD', 'SPAN', 'BW', 'TRACE', 'MEAS'].map(lbl => (
                                <div key={lbl} className="flex items-center gap-1">
                                    <div className="w-2 h-5 bg-white/10 rounded-l-sm flex-shrink-0" />
                                    <button type="button" onClick={() => push({ kind: 'info', label: `Softkey [${lbl}]`, source: `SOFTKEY-${lbl}` })}
                                        className="flex-1 h-9 bg-[#718096] border-t border-[#A0AEC0] border-b-[#4A5568] rounded-r text-[7px] font-bold text-white/80 active:translate-y-px transition-all">{lbl}</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={`transition-all duration-300 overflow-hidden ${traceOpen ? 'h-48' : 'h-0'}`}>
                        <SCPITracePanel events={events} isOpen={traceOpen} onClear={clear} />
                    </div>
                </div>

                {/* Right: Control clusters */}
                <div className="w-[400px] flex-shrink-0 bg-[#CBD5E1] p-4 flex flex-col gap-4 border-l-4 border-[#A0AEC0]">

                    <div className="bg-[#E2E8F0] rounded-lg p-3 border border-white shadow-inner">
                        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block mb-2">Frequency / Span</span>
                        <div className="grid grid-cols-3 gap-2">
                            <HKey label="CF" sub="Center Freq" onClick={() => cmd('CF', `SENS:FREQ:CENT ${status?.center || 1e9}`, 'frequency', { center_hz: status?.center || 1e9, manufacturer: 'keysight' })} />
                            <HKey label="SPAN" sub="Set Span" onClick={() => cmd('SPAN Full', 'SENS:FREQ:SPAN:FULL', 'frequency', { span_hz: 0, manufacturer: 'keysight' })} />
                            <HKey label="ZERO SPAN" onClick={() => cmd('ZERO SPAN', 'SENS:FREQ:SPAN 0', 'frequency', { span_hz: 0, manufacturer: 'keysight' })} />
                        </div>
                    </div>

                    <div className="bg-[#E2E8F0] rounded-lg p-3 border border-white shadow-inner">
                        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block mb-2">Amplitude</span>
                        <div className="grid grid-cols-3 gap-2">
                            <HKey label="REF LVL" onClick={() => cmd('REF LVL', `DISP:WIND:TRAC:Y:RLEV ${refLevel}`, 'settings', { ref_level: refLevel, manufacturer: 'keysight' })} />
                            <HKey label="ATT AUTO" onClick={() => cmd('ATT AUTO', 'INP:ATT:AUTO ON', 'settings', { attenuation_auto: true, manufacturer: 'keysight' })} />
                            <HKey label="PREAMP ON" onClick={() => cmd('PREAMP', 'POW:GAIN ON', 'settings', { preamp: true, manufacturer: 'keysight' })} />
                        </div>
                    </div>

                    <div className="bg-[#E2E8F0] rounded-lg p-3 border border-white shadow-inner">
                        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block mb-2">BW / Sweep</span>
                        <div className="grid grid-cols-3 gap-2">
                            <HKey label="RBW AUTO" onClick={() => cmd('RBW AUTO', 'SENS:BAND:AUTO ON', 'settings', { rbw: undefined, manufacturer: 'keysight' })} />
                            <HKey label="VBW AUTO" onClick={() => cmd('VBW AUTO', 'SENS:BAND:VID:AUTO ON', 'settings', { vbw: undefined, manufacturer: 'keysight' })} />
                            <HKey label="SWEEP" onClick={() => cmd('SINGLE SWEEP', 'INIT:IMM', 'single-sweep', { manufacturer: 'keysight' })} />
                        </div>
                    </div>

                    {/* Markers */}
                    <div className="bg-[#E2E8F0] rounded-lg p-3 border border-white shadow-inner">
                        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block mb-2">Markers</span>
                        <div className="grid grid-cols-4 gap-1 mb-2">
                            {[1, 2, 3, 4].map(i => (
                                <button key={`m${i}`} type="button" onClick={() => setMarkerIdx(i)}
                                    className={`h-8 rounded text-[9px] font-bold transition-all ${markerIdx === i ? 'bg-[#2D3748] text-white' : 'bg-white text-[#4A5568] border border-[#CBD5E1] hover:bg-[#E2E8F0]'}`}>
                                    M{i}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <HKey label="PEAK" onClick={() => cmd(`MKR${markerIdx} PEAK`, `CALC:MARK${markerIdx}:MAX`, 'marker', { index: markerIdx, search_peak: true, manufacturer: 'keysight' })} />
                            <HKey label="NEXT PK ▶" onClick={() => cmd(`MKR${markerIdx} NXT R`, `CALC:MARK${markerIdx}:MAX:RIGHT`, 'marker', { index: markerIdx, direction: 'RIGHT', manufacturer: 'keysight' })} />
                            <HKey label="◀ NEXT PK" onClick={() => cmd(`MKR${markerIdx} NXT L`, `CALC:MARK${markerIdx}:MAX:LEFT`, 'marker', { index: markerIdx, direction: 'LEFT', manufacturer: 'keysight' })} />
                            <HKey label="MKR ΔREF" onClick={() => cmd('MKR DELTA', `CALC:MARK${markerIdx}:MODE DELT`, 'marker', { index: markerIdx, marker_type: 'DELT', manufacturer: 'keysight' })} />
                            <HKey label="CLR ALL" onClick={() => cmd('CLR MARKERS', 'CALC:MARK:AOFF', 'marker', { index: 1, clear_all: true, manufacturer: 'keysight' })} />
                            <HKey label="MKR→CF" onClick={() => cmd('MKR→CF', `CALC:MARK${markerIdx}:SET:CENT`, 'frequency', { center_hz: status?.markers?.[markerIdx - 1]?.x || 1e9, manufacturer: 'keysight' })} />
                        </div>
                    </div>

                    <div className="col-span-2 bg-[#CBD5E1] rounded-lg p-4 border border-[#A0AEC0] shadow-inner flex flex-col items-center justify-center text-center">
                         <span className="text-[9px] font-black text-[#4A5568] uppercase tracking-widest mb-2 opacity-50">Signal Intelligence</span>
                         <div className="flex items-center gap-4 py-2">
                              <div className="flex flex-col items-center">
                                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${connStatus === 'connected' ? 'border-[#3182CE] text-[#3182CE] shadow-[0_0_10px_rgba(49,130,206,0.3)]' : 'border-gray-400 text-gray-400'}`}>
                                      <span className="text-[8px] font-black">SCAN</span>
                                  </div>
                                  <span className="text-[7px] mt-1 font-bold text-gray-500">LXI Lvl</span>
                              </div>
                              <div className={`h-0.5 w-12 ${connStatus === 'connected' ? 'bg-[#3182CE] shadow-[0_0_8px_#3182CE]' : 'bg-gray-300'}`} />
                              <div className="flex flex-col items-center">
                                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${connStatus === 'connected' ? 'border-[#3182CE] text-[#3182CE] shadow-[0_0_10px_rgba(49,130,206,0.3)]' : 'border-gray-400 text-gray-400'}`}>
                                      <span className="text-[8px] font-black">DSP</span>
                                  </div>
                                  <span className="text-[7px] mt-1 font-bold text-gray-500">Real-Time</span>
                              </div>
                         </div>
                         <p className="text-[8px] text-gray-400 uppercase font-black tracking-tighter mt-2">
                             {connStatus === 'connected' ? 'Hardware Sentry: Protecting Live Stream' : 'Hardware Sentry: Monitoring Bus'}
                         </p>
                     </div>
                </div>
            </div>
        </div>
    );
};
