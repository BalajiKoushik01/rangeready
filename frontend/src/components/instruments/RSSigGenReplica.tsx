/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FILE: RSSigGenReplica.tsx
 * ROLE: 1-to-1 physical emulation of the Rohde & Schwarz SMW200A Vector Signal Generator.
 * Reference: R&S SMW200A User Manual (1412.9100.02)
 *
 * R&S uses a "Block Diagram" signal-flow paradigm:
 *   Baseband A → I/Q Mod → RF Output A (up to 6 GHz / 40 GHz with options)
 * The physical front panel features:
 *   - 10.4" touchscreen with block diagram
 *   - Numeric keypad (right side)
 *   - Rotary knob + navigation keys
 *   - OUTPUT A BNC/N-Type connector with LED
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTraceLog, SCPITracePanel } from './SCPITracePanel';
import { HKey, UnitTerminationStrip } from './InstrumentKeys';

const API = (path: string) =>
    `http://${globalThis.location.hostname}:8787/api/instrument-control${path}`;

interface Props { status?: any; wsStatus?: 'connecting' | 'connected' | 'offline'; }

type Block = 'baseband' | 'iqmod' | 'rfout' | null;

// ── Module-level sub-components (MUST be outside component to avoid render identity churn) ──
interface BlockNodeProps {
    id: Block;
    title: string;
    sub: string;
    active?: boolean;
    activeBlock: Block;
    onSelect: (id: Block) => void;
}
const BlockNode: React.FC<BlockNodeProps> = ({ id, title, sub, active, activeBlock, onSelect }) => (
    <button
        type="button"
        onClick={() => onSelect(id === activeBlock ? null : id)}
        className={`flex-1 border-2 rounded-lg p-3 transition-all text-left ${
            id === activeBlock
                ? 'border-[#63B3ED] bg-[#EBF8FF] shadow-[0_0_12px_rgba(99,179,237,0.3)]'
                : active ? 'border-[#68D391] bg-[#F0FFF4]'
                : 'border-[#CBD5E1] bg-white hover:border-[#A0AEC0]'
        }`}
    >
        <div className="text-[10px] font-black text-[#2D3748] uppercase tracking-wider">{title}</div>
        <div className="text-[9px] text-[#718096] mt-0.5">{sub}</div>
    </button>
);

const FlowArrow: React.FC = () => (
    <div className="flex-shrink-0 flex items-center px-1">
        <div className="h-0.5 w-6 bg-[#CBD5E1]" />
        <div className="border-t-4 border-b-4 border-l-4 border-transparent border-t-transparent border-b-transparent border-l-[#A0AEC0] w-0 h-0" />
    </div>
);

export const RSSigGenReplica: React.FC<Props> = ({ status, wsStatus = 'offline' }) => {
    const [ip, setIp] = useState('192.168.1.102');
    const [connStatus, setConnStatus] = useState(wsStatus);
    const [activeBlock, setActiveBlock] = useState<Block>(null);
    const [traceOpen, setTraceOpen] = useState(true);
    const [bbFreq, setBbFreq] = useState('100e6');
    const [iqState, setIqState] = useState(false);
    
    // Live Typed State
    const [typedFreq, setTypedFreq] = useState('');
    const [focusTarget, setFocusTarget] = useState<'freq' | 'bb' | null>(null);

    const freqRef = useRef<HTMLInputElement>(null);
    const bbRef = useRef<HTMLInputElement>(null);

    const { events, push, clear, tracedFetch } = useTraceLog();

    // Auto-Focus Engine
    useEffect(() => {
        if (focusTarget === 'freq') {
            freqRef.current?.focus();
            freqRef.current?.select();
        } else if (focusTarget === 'bb') {
            bbRef.current?.focus();
            bbRef.current?.select();
        }
    }, [focusTarget]);

    const connectHardware = async () => {
        setConnStatus('connecting');
        push({ kind: 'connect', label: `Initiating TCP to ${ip}:5025 (SMW200A)`, source: 'LXI Connect' });
        try {
            const res = await fetch(`http://${globalThis.location.hostname}:8787/api/system/config`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'Signal Generator', manufacturer: 'rs', ip, model: 'SMW200A' })
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
        tracedFetch(source, scpi, API(`/siggen/${endpoint}?manufacturer=rs`), body);

    const enter = useCallback((mult: number, type: 'freq' | 'bb') => {
        if (type === 'freq') {
            if (!typedFreq) return;
            const hz = Number.parseFloat(typedFreq) * mult;
            cmd('FREQ Entry', `:SOUR:FREQ:CW ${hz}`, 'frequency', { freq_hz: hz, manufacturer: 'rs' });
            setTypedFreq('');
        } else {
            const hz = Number.parseFloat(bbFreq) * mult; // Using bbFreq as source for simplicity in this specific block
            cmd('BB FREQ', `:SOUR:BB:ARB:CLOC ${hz}`, 'frequency', { freq_hz: hz, manufacturer: 'rs' });
            setBbFreq(hz.toString());
        }
        setFocusTarget(null);
    }, [cmd, typedFreq, bbFreq]);

    const statusDot = connStatus === 'connected' ? 'bg-[#48BB78] shadow-[0_0_8px_#48BB78]'
        : connStatus === 'connecting' ? 'bg-[#ECC94B] animate-pulse' : 'bg-[#E53E3E]';

    const freq_ghz = status?.freq_hz ? (status.freq_hz / 1e9).toFixed(9) : '0.000100000';
    const power_dbm = status?.power_dbm !== undefined ? status.power_dbm.toFixed(2) : '-20.00';


    return (
        <div className="flex flex-col rounded-lg overflow-hidden border-[6px] border-[#CBD5E1] bg-[#E2E8F0] shadow-2xl">
            {/* Title + IP */}
            <div className="bg-[#1A202C] flex items-center justify-between px-4 py-2 border-b-4 border-[#2D3748]">
                <span className="text-[11px] font-bold tracking-widest uppercase text-white/70">
                    <span className="text-[#FBD38D]">R&S</span> SMW200A Vector Signal Generator
                </span>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-black/40 rounded px-3 py-1 gap-2 border border-white/10">
                        <span className="text-[9px] text-white/40 font-bold uppercase">LXI</span>
                        <input type="text" value={ip} onChange={e => setIp(e.target.value)} className="bg-black text-[12px] font-mono text-white px-2 py-0.5 rounded w-32 border border-white/20 outline-none focus:border-[#FBD38D]" />
                        <button onClick={connectHardware} className="text-[9px] font-bold uppercase px-3 py-1 bg-[#D69E2E] text-white rounded hover:bg-[#B7791F]">CONNECT</button>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${statusDot}`} />
                        <span className="text-[10px] font-bold uppercase text-white/50 w-20">{connStatus}</span>
                    </div>
                    <button onClick={() => setTraceOpen(o => !o)} className={`text-[9px] font-black uppercase px-2 py-1 rounded border transition-colors ${traceOpen ? 'bg-white/10 border-white/20 text-white/70' : 'bg-transparent border-white/10 text-white/30'}`}>
                        TRACE {traceOpen ? '▼' : '▶'}
                    </button>
                </div>
            </div>

            <div className="flex gap-0">
                {/* Left: Touchscreen / Block Diagram + Trace */}
                <div className="flex-1 flex flex-col">
                    {/* Touchscreen */}
                    <div className="bg-[#4A5568] p-3 h-[320px] flex flex-col gap-3">
                        {/* Status bar - NOW Typable */}
                        <div className={`glass-lcd px-4 py-2 flex justify-between items-center animate-glow-orange cursor-text transition-all ${focusTarget === 'freq' ? 'ring-1 ring-[#D69E2E]' : ''}`} onClick={() => setFocusTarget('freq')}>
                            <div className="flex flex-col">
                                <span className={`text-[7px] font-black uppercase tracking-widest ${focusTarget === 'freq' ? 'text-[#D69E2E]' : 'text-white/30'}`}>RF Frequency</span>
                                <div className="flex items-baseline gap-1 relative">
                                    <input
                                        ref={freqRef}
                                        type="text"
                                        value={focusTarget === 'freq' ? typedFreq : freq_ghz}
                                        onChange={(e) => setTypedFreq(e.target.value)}
                                        onFocus={() => setFocusTarget('freq')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') setFocusTarget('freq');
                                            if (e.key === 'Escape') { setTypedFreq(''); setFocusTarget(null); }
                                        }}
                                        className="bg-transparent text-[16px] font-black font-mono text-white outline-none w-[120px]"
                                    />
                                    <span className="text-[10px] font-bold text-white/40">GHz</span>
                                    {focusTarget === 'freq' && typedFreq && (
                                        <div className="absolute left-0 top-full mt-2">
                                            <UnitTerminationStrip 
                                                units={[{label:'GHz', mult:1e9}, {label:'MHz', mult:1e6}, {label:'kHz', mult:1e3}, {label:'Hz', mult:1}]}
                                                onSelect={(m) => enter(m, 'freq')}
                                                onCancel={() => {setTypedFreq(''); setFocusTarget(null);}}
                                                theme="orange"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-6 text-[11px] font-mono">
                                <div className="flex flex-col items-end">
                                    <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Level</span>
                                    <span className="text-[#68D391] font-black">{power_dbm} dBm</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Mod</span>
                                    <span className={status?.rf_state ? 'text-[#F6AD55] font-black' : 'text-white/20'}>{status?.rf_state ? 'ON' : 'OFF'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Block Diagram — R&S signature layout */}
                        <div className="flex-1 bg-[#F7FAFC] rounded-lg border border-[#CBD5E1] p-4 flex flex-col gap-4">
                            <div className="text-[9px] font-bold text-[#718096] uppercase tracking-widest">Signal Flow — Path A</div>
                            <div className="flex items-center gap-0">
                                <BlockNode id="baseband" title="Baseband A" sub={`Internal ARB · ${bbFreq} Hz`} activeBlock={activeBlock} onSelect={setActiveBlock} />
                                <FlowArrow />
                                <BlockNode id="iqmod" title="I/Q Mod A" sub={`I/Q State: ${iqState ? 'ON' : 'OFF'}`} active={iqState} activeBlock={activeBlock} onSelect={setActiveBlock} />
                                <FlowArrow />
                                <BlockNode id="rfout" title="RF Output A" sub={`Port 1 · ${status?.rf_state ? 'ACTIVE' : 'DISABLED'}`} active={status?.rf_state} activeBlock={activeBlock} onSelect={setActiveBlock} />
                            </div>

                            {/* Block-specific controls */}
                            {activeBlock === 'baseband' && (
                                <div className="bg-[#EBF8FF] border border-[#63B3ED] rounded p-3 animate-in fade-in duration-200">
                                    <div className="text-[9px] font-bold text-[#2B6CB0] mb-2 uppercase">Baseband A Settings</div>
                                    <div className="flex gap-2">
                                        <input type="text" value={bbFreq} onChange={e => setBbFreq(e.target.value)} placeholder="Freq Hz" className="flex-1 bg-white border border-[#63B3ED] rounded px-2 py-1 text-[11px] font-mono" />
                                        <button type="button" onClick={() => cmd('BB FREQ', `:SOUR:BB:ARB:CLOC ${bbFreq}`, 'frequency', { freq_hz: Number.parseFloat(bbFreq), manufacturer: 'rs' })} className="px-3 py-1 bg-[#3182CE] text-white text-[9px] font-bold rounded">SET</button>
                                    </div>
                                </div>
                            )}
                            {activeBlock === 'iqmod' && (
                                <div className="bg-[#F0FFF4] border border-[#68D391] rounded p-3 animate-in fade-in duration-200">
                                    <div className="text-[9px] font-bold text-[#276749] mb-2 uppercase">I/Q Modulator A</div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setIqState(true); cmd('IQ ON', ':SOUR:IQ:STAT ON', 'modulation', { state: true, type: 'AM', manufacturer: 'rs' }); }} className="flex-1 py-2 bg-[#68D391] text-black text-[9px] font-bold rounded">I/Q ON</button>
                                        <button onClick={() => { setIqState(false); cmd('IQ OFF', ':SOUR:IQ:STAT OFF', 'modulation', { state: false, type: 'AM', manufacturer: 'rs' }); }} className="flex-1 py-2 bg-[#FC8181] text-white text-[9px] font-bold rounded">I/Q OFF</button>
                                    </div>
                                </div>
                            )}
                            {activeBlock === 'rfout' && (
                                <div className="bg-[#FFFAF0] border border-[#F6AD55] rounded p-3 animate-in fade-in duration-200">
                                    <div className="text-[9px] font-bold text-[#7B341E] mb-2 uppercase">RF Output A</div>
                                    <div className="flex gap-2">
                                        <button onClick={() => cmd('RF ON', ':OUTP ON', 'rf', { state: true, manufacturer: 'rs' })} className="flex-1 py-2 bg-[#68D391] text-black text-[9px] font-bold rounded">RF ON</button>
                                        <button onClick={() => cmd('RF OFF', ':OUTP OFF', 'rf', { state: false, manufacturer: 'rs' })} className="flex-1 py-2 bg-[#FC8181] text-white text-[9px] font-bold rounded">RF OFF</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Trace panel */}
                    <div className={`transition-all duration-300 overflow-hidden ${traceOpen ? 'h-48' : 'h-0'}`}>
                        <SCPITracePanel events={events} isOpen={traceOpen} onClear={clear} />
                    </div>
                </div>

                {/* Right: Physical numpad + control clusters */}
                <div className="w-[380px] flex-shrink-0 bg-[#CBD5E1] p-4 flex flex-col gap-4 border-l-4 border-[#A0AEC0]">

                    {/* RF / MOD */}
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => cmd('RF OUTPUT', `:OUTP ${!status?.rf_state ? 'ON' : 'OFF'}`, 'rf', { state: !status?.rf_state, manufacturer: 'rs' })}
                            className={`h-14 rounded shadow-md text-[11px] font-black uppercase tracking-widest flex flex-col items-center justify-center transition-all active:translate-y-px ${status?.rf_state ? 'bg-[#FC8181] text-black border-2 border-[#E53E3E]' : 'bg-[#E2E8F0] text-[#4A5568] border border-white hover:bg-white'}`}>
                            <span className="text-[8px] opacity-60">RF OUTPUT</span>{status?.rf_state ? 'ON' : 'OFF'}
                        </button>
                        <button onClick={() => cmd('MOD', `:SOUR:MOD:ALL:STAT ${!status?.mod_state ? 'ON' : 'OFF'}`, 'modulation', { state: !status?.mod_state, type: 'AM', manufacturer: 'rs' })}
                            className={`h-14 rounded shadow-md text-[11px] font-black uppercase tracking-widest flex flex-col items-center justify-center transition-all active:translate-y-px ${status?.mod_state ? 'bg-[#68D391] text-black border-2 border-[#38A169]' : 'bg-[#E2E8F0] text-[#4A5568] border border-white hover:bg-white'}`}>
                            <span className="text-[8px] opacity-60">MOD</span>{status?.mod_state ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {/* Modulation Options */}
                    <div className="bg-[#E2E8F0] rounded-lg p-3 border border-white shadow-inner">
                        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block mb-2">Modulation</span>
                        <div className="grid grid-cols-4 gap-2">
                            <HKey label="AM" onClick={() => cmd('AM', ':SOUR:AM:STAT ON', 'modulation', { state: true, type: 'AM', manufacturer: 'rs' })} />
                            <HKey label="FM" onClick={() => cmd('FM', ':SOUR:FM:STAT ON', 'modulation', { state: true, type: 'FM', manufacturer: 'rs' })} />
                            <HKey label="ΦM" onClick={() => cmd('PM', ':SOUR:PM:STAT ON', 'modulation', { state: true, type: 'PM', manufacturer: 'rs' })} />
                            <HKey label="PULSE" onClick={() => cmd('PULSE', ':SOUR:PULM:STAT ON', 'modulation', { state: true, type: 'PULSE', manufacturer: 'rs' })} />
                        </div>
                    </div>

                    {/* Ref / Trigger */}
                    <div className="bg-[#E2E8F0] rounded-lg p-3 border border-white shadow-inner">
                        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block mb-2">Reference / Trigger</span>
                        <div className="grid grid-cols-3 gap-2">
                            <HKey label="REF INT" onClick={() => cmd('REF INT', ':ROSC:SOUR INT', 'ref-clock', { source: 'INT', manufacturer: 'rs' })} />
                            <HKey label="REF EXT" onClick={() => cmd('REF EXT', ':ROSC:SOUR EXT', 'ref-clock', { source: 'EXT', manufacturer: 'rs' })} />
                            <HKey label="*RST" onClick={() => cmd('RESET', '*RST', 'reset', { manufacturer: 'rs' })} />
                        </div>
                    </div>

                    <div className="col-span-2 bg-[#CBD5E1] rounded-lg p-4 border border-[#A0AEC0] shadow-inner flex flex-col items-center justify-center text-center mt-auto">
                         <span className="text-[9px] font-black text-[#4A5568] uppercase tracking-widest mb-2 opacity-50">Discovery Intelligence</span>
                         <div className="flex items-center gap-4 py-2">
                              <div className="flex flex-col items-center">
                                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${connStatus === 'connected' ? 'border-[#D69E2E] text-[#D69E2E] shadow-[0_0_10px_rgba(214,158,46,0.3)]' : 'border-gray-400 text-gray-400'}`}>
                                      <span className="text-[8px] font-black">TCP</span>
                                  </div>
                                  <span className="text-[7px] mt-1 font-bold text-gray-500">APIPA</span>
                              </div>
                              <div className={`h-0.5 w-12 ${connStatus === 'connected' ? 'bg-[#D69E2E] shadow-[0_0_8px_#D69E2E]' : 'bg-gray-300'}`} />
                              <div className="flex flex-col items-center">
                                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${connStatus === 'connected' ? 'border-[#D69E2E] text-[#D69E2E] shadow-[0_0_10px_rgba(214,158,46,0.3)]' : 'border-gray-400 text-gray-400'}`}>
                                      <span className="text-[8px] font-black">LXI</span>
                                  </div>
                                  <span className="text-[7px] mt-1 font-bold text-gray-500">1.5 R3</span>
                              </div>
                         </div>
                         <p className="text-[8px] text-gray-400 uppercase font-black tracking-tighter mt-2">
                             {connStatus === 'connected' ? 'Universal Bridge: R&S Language Mapped' : 'Universal Bridge: Identifying...'}
                         </p>
                     </div>
                </div>
            </div>
        </div>
    );
};
