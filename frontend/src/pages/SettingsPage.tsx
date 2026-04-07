import { type FC, useState } from 'react';
import { 
  Gear, 
  Trash, 
  PaintBrush, 
  ShieldWarning, 
  IdentificationCard,
  CloudArrowUp,
  FloppyDisk,
  Warning,
  Check,
  HardDrive,
  ArrowsClockwise,
  Link,
  Plugs
} from '@phosphor-icons/react';
import { GlassCard } from '../components/ui/GlassCard';

export const SettingsPage: FC = () => {
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [sigGenIp, setSigGenIp] = useState("192.168.1.141");
    const [specAnIp, setSpecAnIp] = useState("192.168.1.142");
    const [connectionStatus, setConnectionStatus] = useState<{ [key: string]: 'idle' | 'testing' | 'success' | 'fail' }>({});

    const handleSave = async () => {
        setIsSaved(true);
        // Post IPs to backend
        try {
            await fetch('http://localhost:8787/api/system/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'Signal Generator', ip: sigGenIp })
            });
            await fetch('http://localhost:8787/api/system/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'Spectrum Analyzer', ip: specAnIp })
            });
        } catch (e) {
            console.error("Config save failed", e);
        }
        setTimeout(() => setIsSaved(false), 2000);
    };

    const testConnection = async (role: string, ip: string) => {
        setConnectionStatus(prev => ({ ...prev, [role]: 'testing' }));
        try {
            const res = await fetch('http://localhost:8787/api/system/test_connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, ip })
            });
            if (res.ok) {
                setConnectionStatus(prev => ({ ...prev, [role]: 'success' }));
            } else {
                setConnectionStatus(prev => ({ ...prev, [role]: 'fail' }));
            }
        } catch (e) {
            setConnectionStatus(prev => ({ ...prev, [role]: 'fail' }));
        }
        setTimeout(() => setConnectionStatus(prev => ({ ...prev, [role]: 'idle' })), 3000);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-[#1E293B]">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 text-accent-blue">
                        <div className="p-2 bg-[#131B2C] rounded-md border border-[#1E293B]">
                            <Gear weight="bold" size={24} />
                        </div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">System Configuration</h1>
                    </div>
                    <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">Global Environment & Security Parameters</p>
                </div>

                <button 
                  onClick={handleSave}
                  className={`flex items-center gap-3 px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all duration-300 overflow-hidden relative group ${
                    isSaved ? 'bg-status-pass text-[#0B0F19]' : 'bg-accent-blue hover:bg-accent-blue-lume text-white'
                  }`}
                >
                    {isSaved ? <Check weight="bold" size={16} /> : <FloppyDisk weight="bold" size={16} />}
                    <span>{isSaved ? 'Synchronized' : 'Apply Changes'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visual Identity Section */}
                <GlassCard className="p-8 space-y-6 border-[#1E293B] bg-[#0B0F19]">
                    <div className="flex items-center gap-3">
                        <PaintBrush weight="bold" size={20} className="text-accent-blue" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">Operator Interface</h3>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                                UI Contrast Mode
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button className="p-4 rounded-lg bg-[#131B2C] border-2 border-accent-blue text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 shadow-[0_0_15px_rgba(14,115,246,0.3)]">
                                    <CloudArrowUp weight="bold" size={18} />
                                    High Contrast
                                </button>
                                <button className="p-4 rounded-lg bg-[#131B2C] border border-[#1E293B] text-text-tertiary hover:text-white hover:bg-[#1A243A] text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 transition-colors">
                                    <Gear weight="bold" size={18} />
                                    Standard Matrix
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                                Data Grid Opacity
                            </label>
                            <input type="range" className="w-full accent-accent-blue bg-[#1E293B] rounded-lg h-1 outline-none" />
                        </div>

                        <div className="space-y-3">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                                Telemetry Refresh Rate (ms)
                            </label>
                            <input type="range" min="100" max="2000" defaultValue="500" className="w-full accent-accent-blue bg-[#1E293B] rounded-lg h-1 outline-none" />
                        </div>
                    </div>
                </GlassCard>

                {/* Security & Access Section */}
                <GlassCard className="p-8 space-y-6 border-[#1E293B] bg-[#0B0F19]">
                    <div className="flex items-center gap-3">
                        <ShieldWarning weight="bold" size={20} className="text-status-warn" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">System Guardrails</h3>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-[#131B2C] border border-[#1E293B]">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase text-white tracking-widest">Hardware Interlock</p>
                                <p className="text-[10px] text-text-tertiary uppercase tracking-tight">Prevent context shifts during sweeps</p>
                            </div>
                            <div className="w-12 h-6 bg-status-pass rounded-full relative p-1 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-[#0B0F19] rounded-full" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button className="w-full flex items-center justify-between p-4 rounded-lg bg-[#131B2C] border border-[#1E293B] hover:bg-[#1A243A] transition-colors group">
                                <div className="flex items-center gap-3">
                                    <ArrowsClockwise weight="bold" size={18} className="text-accent-blue group-hover:rotate-180 transition-transform duration-500" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Sync Instrument Tokens</span>
                                </div>
                            </button>
                            <button 
                                onClick={() => setIsDeletingAll(true)}
                                className="w-full flex items-center justify-between p-4 rounded-lg bg-status-fail/10 border border-status-fail/30 hover:bg-status-fail/20 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <Trash weight="bold" size={18} className="text-status-fail" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-status-fail">Purge All Logs</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </GlassCard>

                {/* Account & Metadata Section */}
                <GlassCard className="p-8 space-y-6 border-[#1E293B] bg-[#0B0F19]">
                    <div className="flex items-center gap-3">
                        <IdentificationCard weight="bold" size={20} className="text-accent-blue" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">System Profile</h3>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                                Station Identifier
                            </label>
                            <input 
                                type="text" 
                                defaultValue="RR-ATE-UNIT-01"
                                className="w-full bg-[#131B2C] border border-[#1E293B] rounded-lg px-6 py-4 text-sm font-bold text-white focus:border-accent-blue outline-none transition-all focus:bg-[#1A243A]" 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 rounded-lg bg-[#131B2C] border border-[#1E293B] space-y-2">
                                <HardDrive weight="fill" size={20} className="text-text-tertiary" />
                                <p className="text-[9px] font-bold uppercase text-text-tertiary tracking-widest">Environment</p>
                                <p className="text-md font-black text-white">PRODUCTION</p>
                            </div>
                            <div className="p-5 rounded-lg bg-[#131B2C] border border-[#1E293B] space-y-2">
                                <Warning weight="fill" size={20} className="text-status-warn" />
                                <p className="text-[9px] font-bold uppercase text-text-tertiary tracking-widest">Deploy Iteration</p>
                                <p className="text-md font-black text-white">5.0-IND</p>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Instrumentation Bus Section */}
                <GlassCard className="p-8 space-y-6 border-[#1E293B] bg-[#0B0F19]">
                    <div className="flex items-center gap-3">
                        <Plugs weight="bold" size={20} className="text-accent-blue" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">Instrumentation Bus Configuration</h3>
                    </div>
                    
                    <div className="space-y-6">
                        {/* Signal Generator */}
                        <div className="space-y-3">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                                Keysight Signal Generator IP
                            </label>
                            <div className="flex gap-3">
                                <input 
                                    type="text" 
                                    value={sigGenIp}
                                    onChange={e => setSigGenIp(e.target.value)}
                                    className="flex-1 bg-[#131B2C] border border-[#1E293B] rounded-lg px-4 py-3 text-sm font-bold text-white focus:border-accent-blue outline-none transition-all" 
                                />
                                <button 
                                    onClick={() => testConnection('Signal Generator', sigGenIp)}
                                    className="px-4 py-3 bg-[#1E293B] hover:bg-[#2A3B56] text-white rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center min-w-[140px] transition-colors"
                                >
                                    {connectionStatus['Signal Generator'] === 'testing' ? 'Testing...' :
                                     connectionStatus['Signal Generator'] === 'success' ? <span className="text-status-pass">Connected</span> :
                                     connectionStatus['Signal Generator'] === 'fail' ? <span className="text-status-fail">Failed</span> :
                                     <span className="flex items-center gap-2"><Link size={14}/> Test Link</span>}
                                </button>
                            </div>
                            {connectionStatus['Signal Generator'] === 'fail' && (
                                <p className="text-[10px] text-status-fail font-bold">Action: Verify LAN cable and ensure Keysight instrument is active.</p>
                            )}
                        </div>

                        {/* Spectrum Analyzer */}
                        <div className="space-y-3">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                                Tektronix Spectrum Analyzer IP
                            </label>
                            <div className="flex gap-3">
                                <input 
                                    type="text" 
                                    value={specAnIp}
                                    onChange={e => setSpecAnIp(e.target.value)}
                                    className="flex-1 bg-[#131B2C] border border-[#1E293B] rounded-lg px-4 py-3 text-sm font-bold text-white focus:border-accent-blue outline-none transition-all" 
                                />
                                <button 
                                    onClick={() => testConnection('Spectrum Analyzer', specAnIp)}
                                    className="px-4 py-3 bg-[#1E293B] hover:bg-[#2A3B56] text-white rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center min-w-[140px] transition-colors"
                                >
                                    {connectionStatus['Spectrum Analyzer'] === 'testing' ? 'Testing...' :
                                     connectionStatus['Spectrum Analyzer'] === 'success' ? <span className="text-status-pass">Connected</span> :
                                     connectionStatus['Spectrum Analyzer'] === 'fail' ? <span className="text-status-fail">Failed</span> :
                                     <span className="flex items-center gap-2"><Link size={14}/> Test Link</span>}
                                </button>
                            </div>
                            {connectionStatus['Spectrum Analyzer'] === 'fail' && (
                                <p className="text-[10px] text-status-fail font-bold">Action: Verify LAN cable and ensure Tektronix instrument is active.</p>
                            )}
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Modal for Purge Confirmation */}
            {isDeletingAll && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-300">
                    <GlassCard className="w-full max-w-md p-10 space-y-8 border-[#1E293B] bg-[#0B0F19] shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-5 bg-status-fail/10 rounded-lg border border-status-fail/30 text-status-fail shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                                <Warning weight="bold" size={48} />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-black uppercase tracking-tighter text-white">Action Irreversible</h2>
                                <p className="text-xs font-bold text-text-tertiary leading-relaxed">
                                    You are about to permanently DELETE all instrument calibrations, sequence histories, and system logs. 
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setIsDeletingAll(false)}
                                className="flex-1 py-3 bg-[#131B2C] hover:bg-[#1E293B] border border-[#1E293B] text-white rounded-md text-[10px] font-bold uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => setIsDeletingAll(false)}
                                className="flex-1 py-3 bg-status-fail hover:bg-red-500 text-white rounded-md text-[10px] font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all"
                            >
                                Confirm & Purge
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};
