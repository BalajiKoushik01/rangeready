/**
 * FILE: pages/SCPIConsolePage.tsx
 * ROLE: Low-Level Hardware Manipulation (Terminal).
 * SOURCE: App Router (/scpi)
 * TARGET: /api/commands/send (POST).
 * TRACE: [PaperPlane] -> [POST /api/commands/send] -> [Hardware]
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, 
  PaperPlaneTilt, 
  Trash, 
  CaretRight, 
  Broadcast, 
  Lightning,
  ShieldAlert,
  HardDrive,
  Power
} from '@phosphor-icons/react';
import { GlassCard } from '../components/ui/GlassCard';

interface ConsoleLine {
    id: string;
    type: 'sent' | 'received' | 'error' | 'system';
    text: string;
    address: string;
    timestamp: string;
}

interface Instrument {
    id: number;
    name: string;
    address: string;
    driver_id: string;
}

const SCPIConsolePage: React.FC = () => {
    const [lines, setLines] = useState<ConsoleLine[]>([]);
    const [input, setInput] = useState("");
    const [instruments, setInstruments] = useState<Instrument[]>([]);
    const [selectedInst, setSelectedInst] = useState<Instrument | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const API_BASE = `http://${window.location.hostname}:8787/api`;

    // TRACE: Initial component load -> Fetch registered instruments
    useEffect(() => {
        const fetchInstruments = async () => {
            try {
                const res = await fetch(`${API_BASE}/instruments/`);
                const data = await res.json();
                setInstruments(data);
                if (data.length > 0) setSelectedInst(data[0]);
            } catch (err) {
                console.error("Failed to load instruments", err);
            }
        };
        fetchInstruments();
        addLog('system', 'Neural-Link SCPI Terminal initialized. Ready for hardware directives.', 'CORE');
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lines]);

    const addLog = (type: ConsoleLine['type'], text: string, address: string) => {
        setLines(prev => [
            ...prev, 
            {
                id: Math.random().toString(36).substring(7),
                type,
                text,
                address,
                timestamp: new Date().toLocaleTimeString()
            }
        ].slice(-100));
    };

    /**
     * TRACE: GUI [PaperPlane / Enter] -> API [POST /api/commands/send] 
     * This function is the primary entry point for manual SCPI commands.
     * It handles the hand-off to the backend 'commands' router.
     */
    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || !selectedInst || isExecuting) return;

        const cmd = input.trim();
        const addr = selectedInst.address;
        
        setIsExecuting(true);
        addLog('sent', cmd, addr);
        setInput("");

        try {
            const res = await fetch(`${API_BASE}/commands/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    driver_name: selectedInst.driver_id,
                    command: cmd,
                    address: addr
                })
            });
            const data = await res.json();
            
            if (data.status === 'success') {
                if (data.response) {
                    addLog('received', data.response, addr);
                } else {
                    addLog('system', 'Directive executed successfully.', addr);
                }
            } else {
                addLog('error', data.response || "Execution Failed", addr);
            }
        } catch (err) {
            addLog('error', `Network failure: Unable to reach instrumentation bus.`, addr);
        } finally {
            setIsExecuting(false);
        }
    };

    /**
     * TRACE: GUI [Emergency Kill] -> API [Loop POST /api/commands/send]
     * Specifically sends 'OUTP OFF' to every registered instrument address.
     */
    const handleEmergencyKill = async () => {
        addLog('system', 'INITIATING GLOBAL EMERGENCY RF SUPPRESSION...', 'ALL');
        for(const inst of instruments) {
            try {
                await fetch(`${API_BASE}/commands/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        driver_name: inst.driver_id,
                        command: 'OUTP OFF',
                        address: inst.address
                    })
                });
                addLog('system', `RF OFF Sent to ${inst.name}`, inst.address);
            } catch(e) {
                addLog('error', `Failed to kill RF on ${inst.name}`, inst.address);
            }
        }
        addLog('system', 'GLOBAL EMERGENCY RF KILL COMPLETED.', 'CORE');
    };

    const clearConsole = () => {
        setLines([]);
        addLog('system', 'Console buffer purged.', 'CORE');
    };

    const handleQuickAction = (cmd: string) => {
        setInput(cmd);
    };

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-180px)] flex flex-col gap-6">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                        <Terminal size={28} weight="duotone" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">SCPI Neural Console</h1>
                        <p className="text-[10px] text-text-tertiary font-black uppercase tracking-widest opacity-60">Low-Level Hardware Manipulation Interface</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select 
                        value={selectedInst?.id}
                        onChange={(e) => setSelectedInst(instruments.find(inst => inst.id === Number(e.target.value)) || null)}
                        className="bg-black/40 border border-white/10 rounded-xl px-6 py-3 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-accent-blue transition-all"
                    >
                        {instruments.map(inst => (
                            <option key={inst.id} value={inst.id}>{inst.name} ({inst.address})</option>
                        ))}
                        {instruments.length === 0 && <option>No Hardware Accessible</option>}
                    </select>
                    <button 
                        onClick={clearConsole}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-status-fail/10 hover:text-status-fail text-text-tertiary transition-all"
                    >
                        <Trash size={18} />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex gap-6 overflow-hidden">
                <GlassCard level={3} className="flex-1 flex flex-col p-6 bg-black/60 border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-30">
                        <Lightning size={16} className="text-accent-blue animate-pulse" />
                        <span className="text-[8px] font-black uppercase text-accent-blue tracking-tighter">Live Neural Bus</span>
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 font-mono text-[11px] mb-6 custom-scrollbar pr-2">
                        {lines.map((line) => (
                            <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} key={line.id} className="flex gap-4 group">
                                <span className="text-text-tertiary opacity-40 shrink-0">[{line.timestamp}]</span>
                                <span className="text-accent-blue opacity-40 shrink-0 w-24 truncate">@{line.address}</span>
                                <div className={`flex items-start gap-2 flex-1 ${
                                    line.type === 'sent' ? 'text-white font-bold' :
                                    line.type === 'received' ? 'text-status-pass' :
                                    line.type === 'error' ? 'text-status-fail' :
                                    'text-text-tertiary italic'
                                }`}>
                                    <span className="opacity-40">{line.type === 'sent' ? '>' : line.type === 'received' ? '<' : '#'}</span>
                                    <span className="break-all">{line.text}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <form onSubmit={handleSend} className="relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-accent-blue group-focus-within:scale-110 transition-transform">
                            <CaretRight size={20} weight="bold" />
                        </div>
                        <input 
                            type="text" value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={selectedInst ? `Direct SCPI Directive to ${selectedInst.name}...` : "Link hardware to begin..."}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-20 outline-none text-sm font-bold text-white focus:border-accent-blue focus:bg-white/10 transition-all placeholder:text-white/20"
                            disabled={!selectedInst || isExecuting}
                        />
                        <button type="submit" disabled={!selectedInst || isExecuting} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-accent-blue text-white rounded-xl hover:bg-accent-blue-lume transition-all">
                            <PaperPlaneTilt size={20} weight="bold" />
                        </button>
                    </form>
                </GlassCard>

                <div className="w-64 flex flex-col gap-6">
                    <GlassCard level={2} className="p-6 space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-text-tertiary tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Lightning weight="fill" className="text-accent-blue" />
                            Directives
                        </h4>
                        <div className="flex flex-col gap-2">
                            {['*IDN?', '*RST', '*CLS', 'SYST:ERR?', 'OUTP ON', 'OUTP OFF'].map(cmd => (
                                <button key={cmd} onClick={() => handleQuickAction(cmd)} className="w-full py-3 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black uppercase text-white hover:bg-accent-blue hover:border-accent-blue transition-all">
                                    {cmd}
                                </button>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard level={1} className="p-6 bg-status-fail/5 border-status-fail/20 flex-1 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                            <ShieldAlert size={120} weight="thin" className="text-status-fail" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase text-status-fail tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Power weight="fill" /> Kill switch
                        </h4>
                        <p className="text-[9px] text-text-tertiary font-black uppercase mb-6 leading-relaxed">Safety Protocol 11A-9: Immediate RF suppression across high-power nodes.</p>
                        <button 
                            onClick={handleEmergencyKill}
                            className="w-full py-6 bg-status-fail text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-status-fail/40 hover:scale-[1.02] active:scale-[0.98] transition-all relative z-10"
                        >
                            Emergency Kill
                        </button>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default SCPIConsolePage;
