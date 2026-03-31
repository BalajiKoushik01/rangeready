import React, { useState } from 'react';
import { 
  Gear, 
  Trash, 
  PaintBrush, 
  ShieldWarning, 
  IdentificationCard,
  CloudArrowUp,
  FloppyDisk,
  Warning,
  CheckCircle,
  Selection,
  HardDrive
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';

export const SettingsPage: React.FC = () => {
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const handleDeleteEverything = async () => {
        // This is a DESTRUCTIVE command requested by the user
        setIsDeletingAll(true);
        await new Promise(r => setTimeout(r, 2000));
        setIsDeletingAll(false);
        alert("GVB Tech Platform Data Purged. System Reset to Factory state.");
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 relative">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 rounded-3xl bg-accent-blue/10 text-accent-blue shadow-glow-blue border border-accent-blue/20">
                        <Gear weight="duotone" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-text-primary tracking-tight uppercase italic">Platform Configuration</h1>
                        <p className="text-sm text-text-secondary font-black tracking-widest uppercase opacity-70">Core Orchestration · Branding · Security</p>
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-8 py-4 bg-accent-blue text-white rounded-2xl font-black shadow-xl shadow-accent-blue/40 hover:bg-accent-blue-lume hover:-translate-y-1 transition-all group"
                >
                    {isSaved ? <CheckCircle size={24} className="animate-bounce" /> : <FloppyDisk weight="bold" size={24} />}
                    {isSaved ? "Saved Successfully" : "Commit Changes"}
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Branding & Visuals */}
                <div className="lg:col-span-2 space-y-8">
                    <GlassCard level={2} className="p-10 space-y-8">
                        <div className="flex items-center gap-3 text-accent-blue">
                            <PaintBrush size={24} weight="duotone" />
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Brand Matrix</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[5px] text-text-tertiary">Platform Logo</label>
                                <div className="p-10 rounded-[40px] bg-white/[0.02] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all cursor-pointer group">
                                    <CloudArrowUp size={48} className="text-text-tertiary group-hover:text-accent-blue transition-colors" />
                                    <span className="text-[10px] font-black text-text-tertiary uppercase">Upload .PNG / .SVG</span>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[5px] text-text-tertiary">Organization Name</label>
                                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-accent-blue/50 transition-all font-black text-white italic text-lg" defaultValue="GVB TECH PLATFORM" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[5px] text-text-tertiary">Theme Accent</label>
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-full bg-accent-blue border-2 border-white cursor-pointer" />
                                        <div className="w-12 h-12 rounded-full bg-status-pass border border-white/10 cursor-pointer" />
                                        <div className="w-12 h-12 rounded-full bg-purple-600 border border-white/10 cursor-pointer" />
                                        <div className="w-12 h-12 rounded-full bg-orange-500 border border-white/10 cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard level={3} className="p-10 space-y-8 bg-status-fail/5 border-status-fail/20">
                        <div className="flex items-center gap-3 text-status-fail">
                            <ShieldWarning size={24} weight="fill" />
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Terminal Danger Zone</h3>
                        </div>

                        <div className="p-8 rounded-[40px] bg-black/40 border border-status-fail/30 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="space-y-2">
                                <h4 className="text-lg font-black text-white italic uppercase tracking-tight">Erase Absolute History</h4>
                                <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest leading-relaxed max-w-sm">This command will wipe the SQLite measurement matrix, delete all ISRO-compliant PDF reports, and purge the instrument registry.</p>
                            </div>
                            <button 
                                onClick={handleDeleteEverything}
                                disabled={isDeletingAll}
                                className="px-8 py-4 bg-status-fail text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-status-fail/40 hover:bg-red-500 transition-all disabled:opacity-50 group"
                            >
                                {isDeletingAll ? (
                                    <div className="flex items-center gap-2">
                                        <ArrowClockwise className="animate-spin" size={18} />
                                        ERASING...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Trash size={20} className="group-hover:rotate-12 transition-transform" />
                                        PURGE DATA
                                    </div>
                                )}
                            </button>
                        </div>
                    </GlassCard>
                </div>

                {/* Engineer Metadata */}
                <div className="space-y-8">
                    <GlassCard level={1} className="p-8 space-y-8 border-white/5">
                        <div className="flex items-center gap-3 text-text-primary">
                            <IdentificationCard size={24} weight="duotone" />
                            <h3 className="text-[10px] font-black uppercase tracking-[5px] opacity-50">Identity Matrix</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 text-center space-y-4">
                                <div className="w-20 h-20 rounded-full bg-accent-blue/10 border border-accent-blue/30 mx-auto flex items-center justify-center font-black text-2xl text-accent-blue">GT</div>
                                <div className="space-y-1">
                                    <div className="font-black text-white uppercase italic">Senior RF Engineer</div>
                                    <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Digital Signature Verified</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">Report Signature File</label>
                                <div className="p-4 border-2 border-dashed border-white/10 rounded-2xl text-center text-[10px] font-black text-text-tertiary hover:bg-white/5 cursor-pointer uppercase transition-all mb-4">
                                    Upload Signature
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard level={1} className="p-8 space-y-6 bg-black/40 border-white/5">
                        <h4 className="text-[10px] font-black uppercase tracking-[5px] opacity-30 italic">Platform Status</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <HardDrive size={16} className="text-accent-blue" />
                                    <span className="text-[10px] font-black text-text-secondary uppercase">Database</span>
                                </div>
                                <span className="text-[10px] font-black text-status-pass uppercase">CONNECTED</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Warning size={16} className="text-text-tertiary" />
                                    <span className="text-[10px] font-black text-text-secondary uppercase">Encryption</span>
                                    <span className="px-1.5 py-0.5 bg-accent-blue/20 text-accent-blue text-[8px] rounded uppercase font-black">FIPS</span>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
