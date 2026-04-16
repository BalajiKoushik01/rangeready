/**
 * FILE: components/ui/BackendCockpit.tsx
 * ROLE: Industrial Backend Performance & Process Controller.
 * TRACE: [orchestrator.py] -> [This UI]
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Terminal, Cpu, Database, ChartLineUp, 
  CheckCircle, Lightning, List, ToggleLeft, ToggleRight
} from '@phosphor-icons/react';

interface MetricState {
  uptime_seconds: number;
  cpu_usage_percent: number;
  memory_mb: number;
  os: string;
  python_version: string;
  working_dir: string;
}

interface ServiceState {
  status: 'active' | 'paused' | 'loading' | 'ready' | 'running' | 'stopped' | 'healthy';
  message?: string;
  model?: string;
}

interface OrchestratorState {
  discovery_sentry: ServiceState;
  ai_core: ServiceState;
  health_poller: ServiceState;
  database: ServiceState;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  source: string;
}

export const BackendCockpit: React.FC = () => {
    const [metrics, setMetrics] = useState<MetricState | null>(null);
    const [services, setServices] = useState<OrchestratorState | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isAutoScroll, setIsAutoScroll] = useState(true);
    const logEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    const API_BASE = `http://${window.location.hostname}:8787/api/orchestrator`;

    // ─────────────────────────────────────────────────────────────────────────
    // DATA FETCHING & WEBSOCKET
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        const fetchStatic = async () => {
            try {
                const [mRes, sRes] = await Promise.all([
                    fetch(`${API_BASE}/metrics`),
                    fetch(`${API_BASE}/services`)
                ]);
                if (mRes.ok) setMetrics(await mRes.json());
                if (sRes.ok) setServices(await sRes.json());
            } catch (err) { console.error("Metrics fetch failed", err); }
        };

        fetchStatic();
        const interval = setInterval(fetchStatic, 2000);

        // Connect to Log Stream
        const ws = new WebSocket(`ws://${window.location.hostname}:8787/ws`);
        ws.onmessage = (event) => {
            try {
               const data = JSON.parse(event.data);
               if (data.type === 'system_log') {
                   const newLog: LogEntry = {
                       id: crypto.randomUUID(),
                       timestamp: data.timestamp,
                       level: data.level,
                       message: data.message,
                       source: data.source
                   };
                   setLogs(prev => [...prev.slice(-499), newLog]);
               }
            } catch {}
        };
        wsRef.current = ws;

        return () => {
            clearInterval(interval);
            ws.close();
        };
    }, []);

    useEffect(() => {
        if (isAutoScroll && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isAutoScroll]);

    // ─────────────────────────────────────────────────────────────────────────
    // ACTIONS
    // ─────────────────────────────────────────────────────────────────────────

    const toggleService = async (name: string, currentState: string) => {
        const next = currentState === 'active' || currentState === 'running' ? 'paused' : 'active';
        await fetch(`${API_BASE}/services/${name}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: next })
        });
    };

    const runHardReset = async () => {
        if (window.confirm("CRITICAL ACTION: This will purge all database records and instrumentation history. Proceed?")) {
            await fetch(`http://${window.location.hostname}:8787/api/system/reset`, { method: 'POST' });
            window.location.reload();
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'ERROR': case 'CRITICAL': return 'text-status-fail';
            case 'WARNING': return 'text-amber-400';
            case 'INFO': return 'text-accent-blue';
            default: return 'text-text-tertiary';
        }
    };

    return (
        <div className="grid grid-cols-12 gap-6 h-full min-h-[800px]">
            {/* ─── LEFT: Service Matrix & Metrics ─── */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
                
                {/* System Vitality */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0b0f19] border border-white/5 p-6 rounded-3xl shadow-inner relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-all">
                             <Cpu size={80} weight="fill" />
                        </div>
                        <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-2">Engine Pulse</span>
                        <div className="flex items-baseline gap-2">
                             <span className="text-4xl font-black text-white">{metrics?.cpu_usage_percent.toFixed(1) || '0.0'}</span>
                             <span className="text-xl font-light text-text-tertiary">%</span>
                        </div>
                        <div className="mt-4 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                             <motion.div 
                                className="h-full bg-accent-blue shadow-glow-blue"
                                animate={{ width: `${metrics?.cpu_usage_percent || 0}%` }}
                             />
                        </div>
                    </div>

                    <div className="bg-[#0b0f19] border border-white/5 p-6 rounded-3xl shadow-inner relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-all">
                             <ChartLineUp size={80} weight="fill" />
                        </div>
                        <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-2">Memory Load</span>
                        <div className="flex items-baseline gap-2">
                             <span className="text-4xl font-black text-white">{metrics?.memory_mb.toFixed(0) || '0'}</span>
                             <span className="text-xl font-light text-text-tertiary">MB</span>
                        </div>
                        <p className="text-[8px] text-text-tertiary uppercase mt-4 font-bold">Resident Set Size (RSS)</p>
                    </div>
                </div>

                {/* Service Control Matrix */}
                <div className="bg-[#0b0f19] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                         <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <List size={14}/> Orchestration Matrix
                         </h3>
                         <span className="text-[9px] text-status-pass font-bold flex items-center gap-1">
                            <CheckCircle size={10}/> CLOUD READY
                         </span>
                    </div>
                    <div className="p-4 space-y-2">
                        {[
                            { id: 'discovery', label: 'Network Discovery Sentry', state: services?.discovery_sentry.status, icon: <Lightning/>, color: 'emerald' },
                            { id: 'poller', label: 'Hardware Telemetry Poller', state: services?.health_poller.status, icon: <ChartLineUp/>, color: 'accent-blue' },
                            { id: 'ai', label: 'AI Healing Core (Apex)', state: services?.ai_core.status, icon: <CheckCircle/>, color: 'amber-400', readOnly: true },
                            { id: 'database', label: 'SQLite Industrial DB', state: services?.database.status, icon: <Database/>, color: 'white', readOnly: true },
                        ].map(svc => (
                            <div key={svc.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                                <div className="flex items-center gap-4">
                                     <div className={`p-2.5 bg-black/40 rounded-xl border border-white/10 text-${svc.color}`}>
                                          {svc.icon}
                                     </div>
                                     <div>
                                         <p className="text-xs font-black text-white uppercase italic">{svc.label}</p>
                                         <p className={`text-[9px] font-bold uppercase tracking-wider ${svc.state === 'healthy' || svc.state === 'active' || svc.state === 'running' || svc.state === 'ready' ? 'text-status-pass' : 'text-text-tertiary'}`}>
                                            Status: {svc.state}
                                         </p>
                                     </div>
                                </div>
                                {!svc.readOnly && (
                                    <button 
                                        onClick={() => toggleService(svc.id, svc.state || '')}
                                        className="text-text-tertiary hover:text-white transition-all transform hover:scale-110"
                                    >
                                        {(svc.state === 'active' || svc.state === 'running') ? <ToggleRight size={32} weight="fill" className="text-status-pass" /> : <ToggleLeft size={32} weight="duotone" />}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Environment Info */}
                <div className="bg-[#0b0f19]/50 border border-white/5 p-6 rounded-3xl space-y-4">
                    <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Environment Metadata</h4>
                    <div className="grid grid-cols-2 gap-y-3">
                        <div className="space-y-1">
                            <span className="text-[9px] text-white/30 block">Engine</span>
                            <span className="text-[11px] text-white font-mono">Python {metrics?.python_version}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] text-white/30 block">Platform</span>
                            <span className="text-[11px] text-white font-mono uppercase">{metrics?.os} (Air-Gapped)</span>
                        </div>
                        <div className="space-y-1 col-span-2">
                            <span className="text-[9px] text-white/30 block">Runtime Root</span>
                            <span className="text-[10px] text-text-tertiary font-mono break-all">{metrics?.working_dir}</span>
                        </div>
                    </div>
                    <button 
                        onClick={runHardReset}
                        className="w-full py-4 bg-status-fail/10 hover:bg-status-fail/20 border border-status-fail/30 text-status-fail rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                    >
                        Absolute Factory Reset
                    </button>
                </div>
            </div>

            {/* ─── RIGHT: Live Logic Console ─── */}
            <div className="col-span-12 lg:col-span-7 flex flex-col bg-[#05070a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                
                {/* Log Header */}
                <div className="px-8 py-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-accent-blue/10 rounded-xl border border-accent-blue/20 text-accent-blue">
                             <Terminal size={20} weight="duotone" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-tighter italic leading-none">Industrial Logic Console</h3>
                            <p className="text-[8px] text-text-tertiary font-bold tracking-[0.3em] uppercase mt-1">Real-Time Core Stream · PID {window.location.port === '5173' ? 'DYNAMIC' : '8787'}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setLogs([])}
                            className="text-[9px] font-black text-text-tertiary hover:text-white uppercase transition-all"
                        >
                            Flush
                        </button>
                        <div className="h-4 w-px bg-white/10" />
                        <button 
                            onClick={() => setIsAutoScroll(!isAutoScroll)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${isAutoScroll ? 'bg-accent-blue/20 border-accent-blue/30 text-accent-blue' : 'bg-white/5 border-white/10 text-white/40'}`}
                        >
                            {isAutoScroll ? 'Follow' : 'Static'}
                        </button>
                     </div>
                </div>

                {/* Log Output Area */}
                <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] selection:bg-accent-blue selection:text-white custom-scrollbar bg-black/40">
                    <div className="space-y-1">
                        {logs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 text-center">
                                 <ChartLineUp size={48} className="animate-pulse mb-4 text-accent-blue" />
                                 <p className="font-black uppercase tracking-widest">Awaiting system logic frames...</p>
                            </div>
                        )}
                        {logs.map(log => (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={log.id} 
                                className="flex gap-4 group hover:bg-white/[0.02] -mx-2 px-2 py-0.5 rounded transition-all"
                            >
                                <span className="text-white/20 shrink-0 select-none">[{log.timestamp.slice(11, 19)}]</span>
                                <span className={`${getLevelColor(log.level)} font-black shrink-0 w-16 select-none`}>{log.level.padEnd(7)}</span>
                                <span className="text-white/40 truncate w-24 shrink-0 italic select-none">#{log.source.split('.').pop()}</span>
                                <span className="text-white/80 break-all leading-tight">
                                    {log.message}
                                </span>
                            </motion.div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                </div>

                {/* Status Bar */}
                <div className="px-8 py-3 bg-black border-t border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-status-pass animate-pulse" />
                             <span className="text-[9px] font-black text-white/40 uppercase">Orchestrator WS Link</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
                             <span className="text-[9px] font-black text-white/40 uppercase">Streaming {logs.length} Lines</span>
                        </div>
                     </div>
                     <span className="text-[9px] font-mono text-white/20">LOGSTORE: RAM-ONLY (TRANSIENT)</span>
                </div>
            </div>
        </div>
    );
};
