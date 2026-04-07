import React, { useState } from 'react';
import { 
  PlusCircle, 
  Monitor, 
  PlugsConnected, 
  GlobeHemisphereWest, 
  Trash, 
  PencilSimple,
  Check,
  Radio,
  HardDrive,
  Pulse
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';

interface Instrument {
  id: string;
  name: string;
  model: string;
  serial: string;
  address: string;
  type: 'TCPIP' | 'USB' | 'GPIB';
  status: 'online' | 'offline';
  lastSeen: string;
}

export const InstrumentRegistryPage: React.FC = () => {
  const [instruments] = useState<Instrument[]>([
    { 
      id: '1', 
      name: 'Primary SSA', 
      model: 'Siglent SSA3032X', 
      serial: 'SSA3X-A123-009', 
      address: '192.168.1.142', 
      type: 'TCPIP',
      status: 'online',
      lastSeen: '2 mins ago'
    }
  ]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [controlInstrument, setControlInstrument] = useState<Instrument | null>(null);
  
  const activeCommands = [
    { id: "set_center_freq", label: "Center Frequency", type: "set", paramType: "Hz", defaultVal: "1000000000" },
    { id: "set_span", label: "Frequency Span", type: "set", paramType: "Hz", defaultVal: "500000000" },
    { id: "fetch_trace", label: "Retrieve Trace Data", type: "query", paramType: "none", defaultVal: "" }
  ];
  
  const [cmdValues, setCmdValues] = useState<Record<string, string>>({});
  const [cmdOutput, setCmdOutput] = useState<string>("");

  const executeCommand = async (cmdId: string, type: string) => {
    try {
        setCmdOutput("Transmitting...");
        const payload = cmdValues[cmdId] || "";
        const res = await fetch("http://localhost:8787/api/commands/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                driver_name: "dummy_sa",
                command: type === "set" ? `${cmdId} ${payload}` : cmdId,
                address: controlInstrument?.address || "TCPIP::127.0.0.1::INSTR"
            })
        });
        const data = await res.json();
        setCmdOutput(JSON.stringify(data.response || data.message || "Executed."));
    } catch {
        setCmdOutput("Error communicating with instrument network.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 relative">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="p-4 rounded-3xl bg-accent-blue/10 text-accent-blue shadow-glow-blue border border-accent-blue/20">
                    <HardDrive weight="duotone" size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-text-primary tracking-tight italic uppercase underline decoration-accent-blue decoration-4 underline-offset-8">Asset Registry</h1>
                    <p className="text-[10px] text-text-secondary font-black tracking-widest uppercase opacity-60 mt-2">Universal Hardware Orchestrator · V5.0</p>
                </div>
            </div>

            <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-10 py-5 bg-accent-blue text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-accent-blue/40 hover:bg-accent-blue-lume hover:-translate-y-1 transition-all group"
            >
                <PlusCircle weight="bold" size={24} className="group-hover:rotate-90 transition-transform" />
                Register Asset
            </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-6">
                <AnimatePresence mode="popLayout">
                    {instruments.map((inst) => (
                        <motion.div
                            key={inst.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            layout
                        >
                            <GlassCard level={2} className="p-8 group border border-white/5 hover:border-accent-blue/30 transition-all">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-8">
                                        <div className={`p-5 rounded-2xl ${inst.status === 'online' ? 'bg-status-pass/10 text-status-pass' : 'bg-white/5 text-text-tertiary'} border border-current opacity-40 shadow-xl group-hover:scale-110 transition-transform`}>
                                            {inst.type === 'TCPIP' ? <GlobeHemisphereWest size={36} /> : <PlugsConnected size={36} />}
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black text-text-primary tracking-tight italic uppercase">{inst.name}</h3>
                                            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-text-tertiary">
                                                <span className="text-accent-blue opacity-80">{inst.model}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-glass-border" />
                                                <span>SN: {inst.serial}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-10">
                                        <div className="text-right">
                                            <div className="flex items-center justify-end gap-3 text-[9px] font-black uppercase tracking-widest mb-1.5">
                                                <Radio size={14} className={inst.status === 'online' ? 'text-status-pass animate-pulse' : ''} />
                                                <span className={inst.status === 'online' ? 'text-status-pass' : 'text-text-tertiary'}>
                                                    {inst.status === 'online' ? 'LOCKED ON' : 'IDLE'}
                                                </span>
                                            </div>
                                            <div className="text-sm font-black text-text-secondary italic">{inst.address}</div>
                                        </div>

                                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setControlInstrument(inst)}
                                                className="px-6 py-3 bg-accent-blue/10 border border-accent-blue/20 text-accent-blue rounded-xl hover:bg-accent-blue text-white transition-all font-black text-[9px] tracking-widest uppercase shadow-glow-blue">
                                                Control
                                            </button>
                                            <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/20 transition-all">
                                                <PencilSimple size={20} />
                                            </button>
                                            <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-status-fail/20 hover:text-status-fail transition-all text-text-tertiary">
                                                <Trash size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {instruments.length === 0 && (
                    <GlassCard level={1} className="py-32 text-center flex flex-col items-center justify-center opacity-30 border-dashed border-white/10">
                        <Monitor size={80} weight="thin" className="mb-8" />
                        <h3 className="text-2xl font-black text-text-primary uppercase tracking-widest">No hardware profile found</h3>
                        <p className="text-[10px] text-text-tertiary font-black mt-3 uppercase tracking-widest">Establish a VISA link to begin neural measurements.</p>
                    </GlassCard>
                )}
            </div>

            <div className="space-y-8">
                <GlassCard level={3} className="p-8 bg-accent-blue/5 border-accent-blue/20 flex flex-col gap-6 relative overflow-hidden group">
                    <div className="absolute -right-5 -bottom-5 opacity-10 group-hover:scale-125 transition-transform duration-700">
                        <Radio size={140} weight="thin" />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-accent-blue flex items-center gap-3">
                        <Pulse weight="fill" size={16} />
                        Network Sentry
                    </h4>
                    <div className="space-y-5 z-10">
                        <div className="p-5 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-3xl">
                            <div className="text-[8px] font-black uppercase text-text-tertiary mb-2 opacity-50">Local Buffer Subsystem</div>
                            <div className="text-xl font-black text-text-primary italic tracking-tight uppercase">SIGLENTSSA_AUTO_019</div>
                            <div className="mt-3 flex items-center gap-2 text-[9px] font-black text-status-pass uppercase tracking-widest">
                                <Check size={14} weight="fill" />
                                Valid Manifest Detected
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button className="flex-1 py-4 bg-accent-blue text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-accent-blue/30 hover:bg-accent-blue-lume transition-all">Link Now</button>
                            <button className="flex-1 py-4 bg-white/5 border border-white/10 text-text-secondary rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all">Sentry Scan</button>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard level={1} className="p-8 space-y-8 border border-white/5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary opacity-60 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
                        Platform Metadata
                    </h4>
                    <div className="space-y-5">
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Hot-Loaded Drivers</span>
                            <span className="text-lg font-black text-accent-blue italic">14 Units</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Neural Sessions</span>
                            <span className="text-lg font-black text-status-pass italic">3 Active</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Network Latency</span>
                            <span className="text-lg font-black text-text-primary italic underline decoration-white/10">12ms</span>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>

        {/* Modal Link Asset */}
        <AnimatePresence>
            {isAdding && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-3xl"
                >
                    <GlassCard level={3} className="w-full max-w-xl p-12 relative border border-white/10 shadow-[0_0_80px_rgba(0,0,0,1)]">
                        <button 
                            onClick={() => setIsAdding(false)}
                            className="absolute top-10 right-10 text-[10px] font-black uppercase tracking-widest text-text-tertiary hover:text-white transition-colors"
                        >
                            Abort
                        </button>
                        <h2 className="text-4xl font-black text-text-primary italic uppercase underline decoration-accent-blue decoration-4 underline-offset-10 mb-10">Link Asset</h2>
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label htmlFor="mission-tag" className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">Mission Tag</label>
                                    <input id="mission-tag" type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all font-black italic text-white" placeholder="S-BAND_01" />
                                </div>
                                <div className="space-y-3">
                                    <label htmlFor="driver-arch" className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">Driver Architecture</label>
                                    <select id="driver-arch" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all font-black text-white appearance-none uppercase tracking-widest text-[10px]">
                                        <option>Siglent SSA3000</option>
                                        <option>Keysight E4404</option>
                                        <option>Rohde ZVA</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label htmlFor="visa-link" className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">VISA Link String</label>
                                <input id="visa-link" type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all font-black text-white italic" placeholder="TCPIP0::192.168.1.1::inst0::INSTR" />
                            </div>
                            <button className="w-full py-6 bg-accent-blue text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-accent-blue/30 mt-6 hover:bg-accent-blue-lume hover:-translate-y-1 transition-all">
                                Establish Neural Link
                            </button>
                        </div>
                    </GlassCard>
                </motion.div>
            )}
        </AnimatePresence>
        
        {/* Remote Control Panel */}
        <AnimatePresence>
            {controlInstrument && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-3xl"
                >
                    <GlassCard level={3} className="w-full max-w-4xl p-12 relative flex flex-col gap-10 max-h-[90vh] overflow-y-auto scrollbar-hide border border-white/10 shadow-[0_0_80px_rgba(0,0,0,1)]">
                        <button 
                            onClick={() => setControlInstrument(null)}
                            className="absolute top-10 right-10 text-[10px] font-black uppercase tracking-widest text-text-tertiary hover:text-white transition-colors"
                        >
                            Disconnect Console
                        </button>
                        <div>
                            <h2 className="text-4xl font-black text-text-primary italic uppercase flex items-center gap-6">
                               <Monitor size={48} className="text-accent-blue filter drop-shadow-[0_0_10px_rgba(30,111,217,0.8)]" />
                               {controlInstrument.name} Control HUD
                            </h2>
                            <div className="flex gap-4 items-center mt-4 text-[10px] font-black text-text-tertiary tracking-widest uppercase opacity-70">
                               <span>ID: {controlInstrument.address}</span>
                               <div className="w-1.5 h-1.5 rounded-full bg-status-pass" />
                               <span>Latency: 4ms</span>
                               <div className="w-1.5 h-1.5 rounded-full bg-status-pass" />
                               <span className="text-accent-blue underline">Neural Encrypted</span>
                            </div>
                        </div>
                        
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {activeCommands.map(cmd => (
                                    <GlassCard key={cmd.id} level={1} className="p-6 flex flex-col gap-5 border border-white/5 hover:border-accent-blue/20 transition-all bg-white/5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary italic underline decoration-white/10">{cmd.label}</span>
                                            <span className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-lg border ${cmd.type === 'query' ? 'bg-status-pass/10 text-status-pass border-status-pass/30' : 'bg-accent-blue/10 text-accent-blue border-accent-blue/30'}`}>
                                                {cmd.type}
                                            </span>
                                        </div>
                                        
                                        {cmd.paramType !== "none" && (
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="text" 
                                                    defaultValue={cmd.defaultVal}
                                                    onChange={(e) => setCmdValues(prev => ({...prev, [cmd.id]: e.target.value}))}
                                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-black outline-none focus:border-accent-blue text-white" 
                                                />
                                                <span className="text-[10px] text-text-tertiary font-black uppercase tracking-widest">{cmd.paramType}</span>
                                            </div>
                                        )}
                                        
                                        <button 
                                            onClick={() => executeCommand(cmd.id, cmd.type)}
                                            className="w-full py-4 bg-white/5 hover:bg-accent-blue text-white rounded-xl border border-white/10 transition-all text-[9px] font-black uppercase tracking-widest shadow-glow-blue"
                                        >
                                            Transmit Directive
                                        </button>
                                    </GlassCard>
                                ))}
                            </div>
                            
                            {/* Neural Console Output */}
                            <div className="p-8 bg-black/60 border border-white/10 rounded-3xl relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-status-pass group-hover:bg-accent-blue transition-colors" />
                                <div className="text-[10px] font-black uppercase text-text-tertiary mb-4 tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-status-pass animate-pulse" />
                                    Subsystem Telemetry
                                </div>
                                <div className="font-mono text-sm text-status-pass/90 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                    {cmdOutput || "> Awaiting hardware handshake..."}
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default InstrumentRegistryPage;
