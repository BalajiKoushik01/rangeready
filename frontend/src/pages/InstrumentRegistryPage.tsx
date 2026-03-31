import React, { useState } from 'react';
import { 
  Plus, 
  Monitor, 
  Usb, 
  Globe, 
  Trash, 
  PencilSimple,
  CheckCircle,
  Pulse,
  HardDrives
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 relative">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="p-4 rounded-3xl bg-accent-blue/10 text-accent-blue shadow-glow-blue border border-accent-blue/20">
                    <HardDrives weight="duotone" size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-text-primary tracking-tight italic uppercase">Asset Registry</h1>
                    <p className="text-sm text-text-secondary font-black tracking-widest uppercase opacity-70">Universal Hardware Orchestrator · V5.0</p>
                </div>
            </div>

            <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-8 py-4 bg-accent-blue text-white rounded-2xl font-black shadow-xl shadow-accent-blue/40 hover:bg-accent-blue-lume hover:-translate-y-1 transition-all group"
            >
                <Plus weight="bold" size={24} className="group-hover:rotate-90 transition-transform" />
                Add Instrument
            </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Active Inventory */}
            <div className="lg:col-span-2 space-y-6">
                <AnimatePresence mode="popLayout">
                    {instruments.map((inst) => (
                        <motion.div
                            key={inst.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            layout
                        >
                            <GlassCard level={2} className="p-8 group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className={`p-4 rounded-2xl ${inst.status === 'online' ? 'bg-status-pass/10 text-status-pass' : 'bg-text-tertiary/10 text-text-tertiary'} border border-current opacity-30 shadow-2xl`}>
                                            {inst.type === 'TCPIP' ? <Globe size={32} /> : <Usb size={32} />}
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-black text-text-primary tracking-tight">{inst.name}</h3>
                                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
                                                <span>{inst.model}</span>
                                                <span className="w-1 h-1 rounded-full bg-glass-border" />
                                                <span>{inst.serial}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <div className="flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-widest mb-1">
                                                <Pulse size={12} className={inst.status === 'online' ? 'text-status-pass animate-pulse' : ''} />
                                                <span className={inst.status === 'online' ? 'text-status-pass' : 'text-text-tertiary'}>
                                                    {inst.status === 'online' ? 'Active Matrix' : 'Disconnected'}
                                                </span>
                                            </div>
                                            <div className="text-sm font-black text-text-secondary">{inst.address}</div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-accent-blue/20 hover:text-accent-blue transition-all">
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
                    <GlassCard level={1} className="p-20 text-center flex flex-col items-center justify-center opacity-30">
                        <Monitor size={64} className="mb-6" />
                        <h3 className="text-2xl font-black text-text-primary uppercase tracking-widest">No matrix connected</h3>
                        <p className="text-sm text-text-tertiary font-bold mt-2">Initialize your hardware to begin high-fidelity measurements.</p>
                    </GlassCard>
                )}
            </div>

            {/* AI Network Guard / Stats */}
            <div className="space-y-6">
                <GlassCard level={3} className="p-6 bg-accent-blue/5 border-accent-blue/20 flex flex-col gap-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-accent-blue flex items-center gap-2">
                        <Activity weight="fill" />
                        Network Guard
                    </h4>
                    <div className="space-y-4">
                        <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
                            <div className="text-[9px] font-black uppercase text-text-tertiary mb-1">Discovery Buffer</div>
                            <div className="text-2xl font-black text-text-primary italic tracking-tight">SIGLENTSSA_019</div>
                            <div className="mt-2 flex items-center gap-2 text-[9px] font-black text-status-pass uppercase">
                                <CheckCircle size={12} />
                                Ready for linkage
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button className="flex-1 py-3 bg-accent-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Auto Detect</button>
                            <button className="flex-1 py-3 bg-white/5 border border-white/10 text-text-secondary rounded-xl font-black text-[10px] uppercase tracking-widest">Rescan</button>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard level={1} className="p-6 space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary">System Metadata</h4>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-text-tertiary uppercase">Drivers Loaded</span>
                            <span className="text-md font-black text-accent-blue">14</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-text-tertiary uppercase">Active Sessions</span>
                            <span className="text-md font-black text-status-pass">3</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-text-tertiary uppercase">Latency (S)</span>
                            <span className="text-md font-black text-text-primary">12ms</span>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>

        {/* Add Modal Placeholder/Mock */}
        {isAdding && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-3xl"
            >
                <GlassCard level={3} className="w-full max-w-xl p-10 relative">
                    <button 
                        onClick={() => setIsAdding(false)}
                        className="absolute top-6 right-6 p-2 text-text-tertiary hover:text-text-primary"
                    >
                        Close
                    </button>
                    <h2 className="text-3xl font-black text-text-primary italic uppercase mb-8">Link New Asset</h2>
                    <div className="space-y-6 text-white">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Friendly Name</label>
                                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent-blue/50 transition-all font-black" placeholder="Main SSA" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Driver Type</label>
                                <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent-blue/50 transition-all font-black text-white appearance-none">
                                    <option>Siglent SSA3000</option>
                                    <option>Keysight E4404</option>
                                    <option>Rohde ZVA</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">VISA Resource Address</label>
                            <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent-blue/50 transition-all font-black" placeholder="TCPIP0::192.168.1.1::inst0::INSTR" />
                        </div>
                        <button className="w-full py-5 bg-accent-blue text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-accent-blue/30 mt-4">
                            Establish Link
                        </button>
                    </div>
                </GlassCard>
            </motion.div>
        )}
    </div>
  );
};
