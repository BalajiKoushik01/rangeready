/**
 * FILE: pages/InstrumentRegistryPage.tsx
 * ROLE: Hardware Asset & Discovery Management.
 * SOURCE: App Router (/registry)
 * TARGET: /api/instruments/ (CRUD) and /api/system/discovery/ (Settings).
 * TRACE: [Establish Neural Link] -> [POST /api/instruments/]
 */
import React, { useState, useEffect } from 'react';
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
  Pulse,
  EyeSlash,
  Sparkle,
  ArrowsClockwise,
  Prohibit,
  Power
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import { InstrumentProfilerWizard } from './InstrumentProfilerWizard';

interface Instrument {
  id: number;
  name: string;
  model: string;
  serial_number: string;
  address: string;
  connection_type: string;
  is_active: boolean;
  last_seen: string;
}

export const InstrumentRegistryPage: React.FC = () => {
    const [instruments, setInstruments] = useState<Instrument[]>([]);
    const [discoveryActive, setDiscoveryActive] = useState(true);
    const [showWizard, setShowWizard] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [editMode, setEditMode] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        model: '',
        serial_number: '',
        address: '',
        connection_type: 'TCPIP',
        driver_id: 'keysight_universal'
    });
    const [isLoading, setIsLoading] = useState(true);

    const API_BASE = `http://${window.location.hostname}:8787/api`;

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const instRes = await fetch(`${API_BASE}/instruments/`);
            const instData = await instRes.json();
            setInstruments(instData);

            const sysRes = await fetch(`${API_BASE}/system/status`);
            const sysData = await sysRes.json();
            setDiscoveryActive(sysData.discovery_active);
        } catch (err) {
            console.error("Fetch failed", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    /* 
     * TRACE: GUI [Discovery Toggle] -> API [POST /api/system/discovery/settings]
     * This updates the config_service which the background DiscoveryService polls 
     * every loop to check if it should continue scanning.
     */
    const handleToggleDiscovery = async () => {
        try {
            const nextState = !discoveryActive;
            await fetch(`${API_BASE}/system/discovery/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: nextState })
            });
            setDiscoveryActive(nextState);
        } catch (err) {
            console.error("Toggle discovery failed", err);
        }
    };

    /* 
     * TRACE: GUI [Ignore Button] -> API [POST /api/system/blacklist]
     * Adds the IP to the persistent blacklist in config.json. 
     * The DiscoveryService skips these IPs in all subsequent scans.
     */
    const handleIgnoreIP = async (ip: string) => {
        try {
            await fetch(`${API_BASE}/system/blacklist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip })
            });
            fetchData();
        } catch (err) {
            console.error("Blacklist failed", err);
        }
    };

    /* 
     * TRACE: GUI [Establish Neural Link] -> API [POST/PUT /api/instruments/]
     * Persists the hardware profile to the SQLite database.
     * Triggers the backend to reload the instrument manifest.
     */
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = editMode ? 'PUT' : 'POST';
            const url = editMode ? `${API_BASE}/instruments/${editMode}` : `${API_BASE}/instruments/`;
            
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            setIsAdding(false);
            setEditMode(null);
            setFormData({ name: '', model: '', serial_number: '', address: '', connection_type: 'TCPIP', driver_id: 'keysight_universal' });
            fetchData();
        } catch (err) {
            console.error("Save failed", err);
        }
    };

    /* 
     * TRACE: GUI [Purge Button] -> API [DELETE /api/instruments/:id]
     * Removes the asset from the database and stops active polling.
     */
    const handleDelete = async (id: number) => {
        if (!window.confirm("Purge this hardware asset from registry?")) return;
        try {
            await fetch(`${API_BASE}/instruments/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    const openEdit = (inst: Instrument) => {
        setFormData({
            name: inst.name,
            model: inst.model,
            serial_number: inst.serial_number,
            address: inst.address,
            connection_type: inst.connection_type,
            driver_id: 'keysight_universal'
        });
        setEditMode(inst.id);
        setIsAdding(true);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 relative">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 rounded-3xl bg-accent-blue/10 text-accent-blue shadow-glow-blue border border-accent-blue/20">
                        <HardDrive weight="duotone" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-text-primary tracking-tight italic uppercase underline decoration-accent-blue decoration-4 underline-offset-8 text-white">Asset Registry</h1>
                        <p className="text-[10px] text-text-secondary font-black tracking-widest uppercase opacity-60 mt-2">Universal Hardware Orchestrator · V5.1</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleToggleDiscovery}
                        className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all border ${
                            discoveryActive ? 'bg-status-pass/10 border-status-pass/30 text-status-pass shadow-glow-pass' : 'bg-white/5 border-white/10 text-text-tertiary'
                        }`}
                    >
                        <ArrowsClockwise size={18} weight="bold" className={discoveryActive ? 'animate-spin-slow' : ''} />
                        {discoveryActive ? 'Auto-Scan Active' : 'Auto-Scan Paused'}
                    </button>

                    {/* TRACE: GUI [Profile Unknown Hardware] -> InstrumentProfilerWizard -> POST /api/instruments/probe */}
                    <button 
                        onClick={() => setShowWizard(true)}
                        className="flex items-center gap-2 px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] hover:border-accent-blue hover:bg-accent-blue/10 hover:text-accent-blue transition-all"
                    >
                        <Sparkle size={18} weight="duotone" />
                        Profile Unknown Hardware
                    </button>
                    
                    <button 
                        onClick={() => { setEditMode(null); setIsAdding(true); }}
                        className="flex items-center gap-2 px-10 py-5 bg-accent-blue text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-accent-blue/40 hover:bg-accent-blue-lume hover:-translate-y-1 transition-all group"
                    >
                        <PlusCircle weight="bold" size={24} className="group-hover:rotate-90 transition-transform" />
                        Register Asset
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
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
                                <GlassCard level={2} className="p-8 group border border-white/5 hover:border-accent-blue/30 transition-all bg-[#0B0F19]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-8">
                                            <div className={`p-5 rounded-2xl ${inst.is_active ? 'bg-status-pass/10 text-status-pass' : 'bg-white/5 text-text-tertiary'} border border-current opacity-40 shadow-xl group-hover:scale-110 transition-transform`}>
                                                {inst.connection_type === 'TCPIP' ? <GlobeHemisphereWest size={36} /> : <PlugsConnected size={36} />}
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-2xl font-black text-text-primary tracking-tight italic uppercase text-white">{inst.name}</h3>
                                                <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-text-tertiary">
                                                    <span className="text-accent-blue opacity-80">{inst.model}</span>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                                                    <span>SN: {inst.serial_number}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-10">
                                            <div className="text-right">
                                                <div className="flex items-center justify-end gap-3 text-[9px] font-black uppercase tracking-widest mb-1.5">
                                                    <Radio size={14} className={inst.is_active ? 'text-status-pass animate-pulse' : 'text-text-tertiary'} />
                                                    <span className={inst.is_active ? 'text-status-pass' : 'text-text-tertiary'}>
                                                        {inst.is_active ? 'CONNECTED' : 'STANDBY'}
                                                    </span>
                                                </div>
                                                <div className="text-sm font-black text-text-secondary italic opacity-60">{inst.address}</div>
                                            </div>

                                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => openEdit(inst)}
                                                    className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/20 transition-all text-white">
                                                    <PencilSimple size={20} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(inst.id)}
                                                    className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-status-fail/20 hover:text-status-fail transition-all text-text-tertiary">
                                                    <Trash size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {!isLoading && instruments.length === 0 && (
                        <GlassCard level={1} className="py-32 text-center flex flex-col items-center justify-center opacity-30 border-dashed border-white/10">
                            <Monitor size={80} weight="thin" className="mb-8" />
                            <h3 className="text-2xl font-black text-text-primary uppercase tracking-widest text-white">No hardware profile found</h3>
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
                            Network Discovery Sentry
                        </h4>
                        <div className="space-y-5 z-10">
                            <div className="p-5 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-3xl">
                                <div className="text-[8px] font-black uppercase text-text-tertiary mb-2 opacity-50 text-white/50">Hardened Handshake Engine v5.1</div>
                                <div className="text-sm font-black text-text-primary italic tracking-tight uppercase text-white/90 leading-relaxed">
                                    The engine is scanning for RF hardware while ignoring non-ATE equipment.
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => handleToggleDiscovery()}
                                    className="w-full py-4 bg-accent-blue/10 border border-accent-blue/20 text-accent-blue rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-accent-blue hover:text-white transition-all">
                                    {discoveryActive ? 'Suspend Background Scan' : 'Resume Background Scan'}
                                </button>
                                <p className="text-[8px] text-text-tertiary text-center uppercase tracking-widest opacity-40">Managed by Industrial Lifecycle Engine</p>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* Modal Add/Edit Asset */}
            <AnimatePresence>
                {isAdding && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-3xl"
                    >
                        <GlassCard level={3} className="w-full max-w-xl p-12 relative border border-white/10 shadow-[0_0_80px_rgba(0,0,0,1)] bg-[#0B0F19]">
                            <button 
                                onClick={() => setIsAdding(false)}
                                className="absolute top-10 right-10 text-[10px] font-black uppercase tracking-widest text-text-tertiary hover:text-white transition-colors"
                            >
                                Abort
                            </button>
                            <h2 className="text-4xl font-black text-text-primary italic uppercase underline decoration-accent-blue decoration-4 underline-offset-10 mb-10 text-white">
                                {editMode ? 'Edit Asset' : 'Link Asset'}
                            </h2>
                            <form onSubmit={handleSave} className="space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">Mission Tag (Name)</label>
                                        <input 
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all font-black italic text-white" placeholder="S-BAND_01" 
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">Model Number</label>
                                        <input 
                                            required
                                            value={formData.model}
                                            onChange={e => setFormData({...formData, model: e.target.value})}
                                            type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all font-black italic text-white" placeholder="N5171B" 
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">Serial Number</label>
                                        <input 
                                            required
                                            value={formData.serial_number}
                                            onChange={e => setFormData({...formData, serial_number: e.target.value})}
                                            type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all font-black italic text-white" placeholder="MY53051234" 
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">Link Architecture</label>
                                        <select 
                                            value={formData.connection_type}
                                            onChange={e => setFormData({...formData, connection_type: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all font-black text-white appearance-none uppercase tracking-widest text-[10px]"
                                        >
                                            <option value="TCPIP">TCPIP (Ethernet/LXI)</option>
                                            <option value="USB">USB (USBTMC)</option>
                                            <option value="GPIB">GPIB (IEEE-488)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">VISA Link String / IP Address</label>
                                    <input 
                                        required
                                        value={formData.address}
                                        onChange={e => setFormData({...formData, address: e.target.value})}
                                        type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue transition-all font-black text-white italic text-center text-xl" placeholder="192.168.1.141" 
                                    />
                                </div>
                                <button type="submit" className="w-full py-6 bg-accent-blue text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-accent-blue/30 mt-6 hover:bg-accent-blue-lume hover:-translate-y-1 transition-all">
                                    {editMode ? 'Update Neural Link' : 'Establish Neural Link'}
                                </button>
                            </form>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hardware Profiler Wizard Modal */}
            {/* TRACE: [Profile Unknown Hardware] → InstrumentProfilerWizard → POST /api/instruments/probe → wizard steps → POST /api/instruments/ */}
            <AnimatePresence>
                {showWizard && (
                    <InstrumentProfilerWizard
                        onComplete={(savedInstrument) => {
                            setShowWizard(false);
                            fetchData(); // Refresh list to show newly profiled instrument
                        }}
                        onCancel={() => setShowWizard(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default InstrumentRegistryPage;
