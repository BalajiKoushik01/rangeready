/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FILE: SCPITracePanel.tsx
 * ROLE: Real-time traceability and audit panel for all hardware SCPI transactions.
 * Shows: Command sent, hardware response, auto-heal events, connection state changes,
 * and per-button action tracing so operators can follow exactly what's happening.
 */
import React, { useEffect, useRef } from 'react';

export type TraceEvent = {
    id: string;
    ts: number;
    kind: 'command' | 'response' | 'heal' | 'connect' | 'error' | 'info' | 'ack';
    label: string;
    detail?: string;
    source?: string; // which button/action triggered this
    scpi?: string;
    response?: string;
    isErr?: boolean;
};

interface Props {
    events: TraceEvent[];
    isOpen: boolean;
    onClear: () => void;
}

const kindConfig: Record<string, { color: string; prefix: string }> = {
    command:  { color: 'text-[#63B3ED]', prefix: '→ TX' },
    response: { color: 'text-[#68D391]', prefix: '← RX' },
    heal:     { color: 'text-[#FBD38D]', prefix: '⚡ HEAL' },
    connect:  { color: 'text-[#B794F4]', prefix: '⬡ CONN' },
    error:    { color: 'text-[#FC8181]', prefix: '✗ ERR' },
    ack:      { color: 'text-[#4FD1C5]', prefix: '✓ ACK' },
    info:     { color: 'text-white/40',  prefix: '· INFO' },
};

export const SCPITracePanel: React.FC<Props> = ({ events, isOpen, onClear }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="flex flex-col bg-[#0D0D0D] border border-white/10 rounded-xl overflow-hidden h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#111] border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#68D391] animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">SCPI Trace Log</span>
                    <span className="text-[9px] text-white/30 font-mono">{events.length} events</span>
                </div>
                <button
                    onClick={onClear}
                    className="text-[8px] font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors px-2 py-1 border border-white/10 rounded"
                >
                    CLEAR
                </button>
            </div>

            {/* Log body */}
            <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-px p-2">
                {events.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-white/20 text-[11px] uppercase tracking-widest">
                        Awaiting hardware interaction…
                    </div>
                )}
                {events.map((ev) => {
                    const cfg = kindConfig[ev.kind] ?? kindConfig.info;
                    return (
                        <div key={ev.id} className="flex gap-2 py-[3px] px-2 hover:bg-white/5 rounded transition-colors group">
                            <span className="text-white/20 select-none w-[70px] flex-shrink-0">
                                {new Date(ev.ts).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className={`font-bold w-[52px] flex-shrink-0 ${cfg.color}`}>{cfg.prefix}</span>
                            {ev.source && (
                                <span className="text-white/30 w-24 flex-shrink-0 truncate" title={ev.source}>[{ev.source}]</span>
                            )}
                            <span className={`flex-1 ${ev.isErr ? 'text-[#FC8181]' : 'text-white/70'}`}>
                                {ev.scpi || ev.label}
                            </span>
                            {ev.response && (
                                <span className={`flex-shrink-0 ${ev.isErr ? 'text-[#FC8181]' : 'text-[#68D391]/80'}`}>
                                    {ev.response}
                                </span>
                            )}
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};

// ── Hook: use this in every replica to push events ──────────────────────────
let _globalId = 0;
const mkId = () => `ev-${++_globalId}-${Date.now()}`;

export function useTraceLog() {
    const [events, setEvents] = React.useState<TraceEvent[]>([]);

    const push = React.useCallback((ev: Omit<TraceEvent, 'id' | 'ts'>) => {
        setEvents(prev => [...prev.slice(-199), { ...ev, id: mkId(), ts: Date.now() }]);
    }, []);

    const clear = React.useCallback(() => setEvents([]), []);

    const tracedFetch = React.useCallback(async (
        source: string,
        scpiStr: string,
        url: string,
        body: any
    ): Promise<{ ok: boolean; data: any }> => {
        push({ kind: 'command', label: scpiStr, scpi: scpiStr, source });
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                // Check if autonomous healer was triggered
                if (data.heal_actions?.length) {
                    data.heal_actions.forEach((ha: string) =>
                        push({ kind: 'heal', label: ha, source, isErr: false })
                    );
                }
                const responseStr = data.response || '+0,"No error"';
                push({ kind: 'response', label: 'ACK', scpi: scpiStr, response: responseStr, source, isErr: false });
                push({ kind: 'ack', label: `${source} → OK`, source });
            } else {
                const errStr = data.detail || `HTTP ${res.status}`;
                push({ kind: 'error', label: `${source} REJECTED`, scpi: scpiStr, response: errStr, source, isErr: true });
            }
            return { ok: res.ok, data };
        } catch (e: any) {
            push({ kind: 'error', label: 'COMM TIMEOUT', scpi: scpiStr, response: e?.message || 'Network unreachable', source, isErr: true });
            return { ok: false, data: {} };
        }
    }, [push]);

    return { events, push, clear, tracedFetch };
}
