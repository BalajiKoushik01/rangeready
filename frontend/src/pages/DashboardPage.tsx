/**
 * FILE: pages/DashboardPage.tsx
 * ROLE: Central Command Dashboard.
 * SOURCE: App Router (/dashboard)
 * TARGET: GET /api/system/status and useTelemetry hook.
 * TRACE: [Page Load] -> [GET /api/system/status]
 */
import React, { useState, useEffect } from 'react';
import { Pulse, ShieldCheck, Cpu, HardDrive, Compass, List, Flask, MagicWand, Selection } from '@phosphor-icons/react';
import { GlassCard } from '../components/ui/GlassCard';
import { HardwareChecklist } from '../components/ui/HardwareChecklist';
import { useSystemState } from '../hooks/useSystemState';
import { useTelemetry } from '../hooks/useTelemetry';

export const DashboardPage: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<string>("Connecting...");
  const [sessionCount, setSessionCount] = useState(0);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const { isAiMode } = useSystemState();
  const { packets } = useTelemetry();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8787/api/system/status`);
        const data = await res.json();
        setBackendStatus(`${data.branding} - ${data.engine}`);
        
        const historyRes = await fetch(`http://${window.location.hostname}:8787/api/tests/history`);
        const history = await historyRes.json();
        setSessionCount(history.length);
      } catch {
        console.error("Dashboard data load failed");
      }
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 5000);
    return () => clearInterval(timer);
  }, []);

  const stats = [
    { label: "Active Test Sessions", value: sessionCount, icon: <Pulse weight="duotone" />, color: "text-accent-blue" },
    { label: "HAL Engine Status", value: backendStatus.includes("ERROR") ? "Offline" : "Reactive", icon: <Cpu weight="duotone" />, color: "text-status-pass" },
    { label: "Instrumentation Bus", value: "VXI-11 / RAW", icon: <HardDrive weight="duotone" />, color: "text-accent-blue-lume" },
    { label: "System Uptime", value: "Active", icon: <ShieldCheck weight="duotone" />, color: "text-status-pass" }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 px-4 mt-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-[#1E293B] pb-8">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-accent-blue/10 border border-accent-blue/30 rounded-3xl text-accent-blue shadow-[0_0_50px_rgba(30,111,217,0.15)] group hover:scale-105 transition-transform">
            <Compass weight="duotone" size={42} className="group-hover:rotate-12 transition-transform" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">RF Instrumentation Dashboard</h1>
            <p className="text-[10px] text-text-tertiary font-black tracking-widest uppercase opacity-70">Automated Test Equipment (ATE) Command Interface · V5.1 (Industrial)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsChecklistOpen(true)}
            className="flex items-center gap-3 px-8 py-4 bg-[#131B2C] border border-[#1E293B] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-accent-blue transition-all group"
          >
            <ShieldCheck weight="bold" size={20} className="text-accent-blue group-hover:animate-pulse" />
            Verify Hardware Communication Interface
          </button>
          
          <div className="hidden lg:flex items-center gap-3 px-6 py-4 bg-[#0B0F19] border border-[#1E293B] rounded-xl shadow-inner">
             <div className={`w-2.5 h-2.5 rounded-full ${backendStatus.includes('Offline') ? 'bg-status-fail' : 'bg-status-pass'} animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]`} />
             <span className="text-[10px] font-black text-white uppercase tracking-widest">Bus Status: {backendStatus}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <GlassCard key={i} level={2} className="p-8 border-[#1E293B] bg-[#0B0F19] hover:border-accent-blue/40 transition-all overflow-hidden relative shadow-2xl">
            <div className="absolute -right-6 -bottom-6 opacity-5 text-white scale-[2.5] blur-[1px]">
                {stat.icon}
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 bg-white/5 rounded-2xl ${stat.color} border border-white/5 shadow-inner`}>
                {React.cloneElement(stat.icon as React.ReactElement<Record<string, unknown>>, { size: 24, weight: "duotone" })}
              </div>
              <span className="text-[9px] font-black text-[#64748B] uppercase tracking-[0.2em]">{stat.label}</span>
            </div>
            <div className="text-3xl font-black text-white tracking-tighter">{stat.value}</div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-[#1E293B]">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
              <List weight="bold" className="text-accent-blue" />
              Trace Acquisition Log
            </h3>
          </div>
          
          <GlassCard level={1} className="p-0 border-[#1E293B] bg-[#0B0F19] overflow-hidden min-h-[450px] flex flex-col">
             {packets.length === 0 ? (
                <div className="w-full h-full min-h-[450px] flex items-center justify-center text-[#64748B] opacity-50 flex-col gap-6">
                    <div className="relative">
                       <Selection size={64} weight="thin" className="animate-pulse" />
                       <div className="absolute inset-0 bg-accent-blue/10 blur-[120px] rounded-full" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Awaiting hardware telemetry...</p>
                </div>
             ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[10px] custom-scrollbar scroll-smooth">
                    {[...packets].reverse().map((pkt) => (
                        <div key={pkt.id} className="flex gap-4 p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-text-tertiary opacity-40 shrink-0">[{pkt.timestamp}]</span>
                            <span className="text-accent-blue opacity-40 shrink-0 w-24 truncate">@{pkt.address}</span>
                            <div className={`flex items-start gap-2 flex-1 ${
                                pkt.type === 'sent' ? 'text-white' : 
                                pkt.type === 'received' ? 'text-status-pass' : 
                                'text-status-fail'
                            }`}>
                                <span className="opacity-40">{pkt.type === 'sent' ? '>' : '<'}</span>
                                <span className="break-all tracking-tight">{pkt.packet}</span>
                            </div>
                        </div>
                    ))}
                </div>
             )}
          </GlassCard>
        </div>

        <div className="space-y-6">
           <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
              <Flask weight="bold" className="text-status-pass" />
              Automated Signal Analysis Engine
           </h3>
           <GlassCard level={3} className="p-10 bg-[#131B2C] border-[#1E293B] h-[450px] flex flex-col justify-center text-center shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/5 to-transparent pointer-events-none" />
              {!isAiMode ? (
                 <div className="space-y-6 relative z-10">
                    <div className="w-20 h-20 bg-white/5 border border-white/5 rounded-[2rem] mx-auto flex items-center justify-center text-[#64748B] shadow-inner transition-transform group-hover:scale-110">
                       <MagicWand size={40} weight="duotone" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-white tracking-widest">Analysis Engine Standby</p>
                      <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider leading-relaxed max-w-[200px] mx-auto">Signal processing analysis engine is currently in standby mode. Enable Signal Analysis Mode to activate.</p>
                    </div>
                 </div>
              ) : (
                 <div className="space-y-6 relative z-10">
                    <div className="w-20 h-20 bg-accent-blue/10 border border-accent-blue/30 rounded-[2rem] mx-auto flex items-center justify-center text-accent-blue shadow-[0_0_30px_rgba(30,111,217,0.2)] transition-transform group-hover:scale-110">
                       <MagicWand size={40} weight="duotone" className="animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-accent-blue tracking-widest">Analysis Engine Active</p>
                      <p className="text-[9px] font-bold text-white uppercase tracking-wider leading-relaxed max-w-[200px] mx-auto opacity-80">Signal Processing Engine v5.1 active. Monitoring vector drift and spectral phase noise outliers across the instrumentation bus.</p>
                    </div>
                 </div>
              )}
           </GlassCard>
        </div>
      </div>

      <HardwareChecklist 
        isOpen={isChecklistOpen} 
        onClose={() => setIsChecklistOpen(false)}
        onComplete={() => setIsChecklistOpen(false)}
      />
    </div>
  );
};

export default DashboardPage;
