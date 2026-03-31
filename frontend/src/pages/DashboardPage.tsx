import React, { useState, useEffect } from 'react';
import { Pulse, ShieldCheck, Cpu, HardDrive } from '@phosphor-icons/react';
import { GlassCard } from '../components/ui/GlassCard';
import { GvbLogo } from '../components/ui/Logo';

export const DashboardPage: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<string>("Connecting...");
  const [instrumentStatus, setInstrumentStatus] = useState<string>("Mock (Connected)");

  useEffect(() => {
    fetch("http://127.0.0.1:8787/health")
      .then(res => res.json())
      .then(data => setBackendStatus(`v${data.version} - Online`))
      .catch(() => setBackendStatus("Offline"));
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Page Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <GvbLogo size={48} />
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              System Overview
            </h1>
            <p className="mt-2 text-text-secondary font-medium tracking-wide">
              GVB Tech Precision RF Platform
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <GlassCard level={3} className="px-6 py-3 flex items-center gap-3 bg-white/30">
             <div className="w-2 h-2 rounded-full bg-status-pass animate-pulse" />
             <span className="text-xs font-mono uppercase tracking-widest text-text-tertiary">
               System Ready
             </span>
          </GlassCard>
        </div>
      </header>

      {/* Hero Stats / Status Integration */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard level={2} className="flex flex-col gap-4 p-6 hover:translate-y-[-4px] transition-transform duration-300">
          <div className="p-3 bg-accent-blue/10 rounded-xl w-fit text-accent-blue">
            <Pulse weight="duotone" size={24} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-text-tertiary tracking-widest">Backend Engine</p>
            <p className="text-lg font-mono font-semibold mt-1 text-text-primary">{backendStatus}</p>
          </div>
        </GlassCard>

        <GlassCard level={2} className="flex flex-col gap-4 p-6 hover:translate-y-[-4px] transition-transform duration-300">
          <div className="p-3 bg-status-pass/10 rounded-xl w-fit text-status-pass">
            <Cpu weight="duotone" size={24} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-text-tertiary tracking-widest">Instrument Status</p>
            <p className="text-lg font-mono font-semibold mt-1 text-text-primary">{instrumentStatus}</p>
          </div>
        </GlassCard>

        <GlassCard level={2} className="flex flex-col gap-4 p-6 hover:translate-y-[-4px] transition-transform duration-300">
          <div className="p-3 bg-amber-500/10 rounded-xl w-fit text-amber-600">
            <ShieldCheck weight="duotone" size={24} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-text-tertiary tracking-widest">Calibration</p>
            <p className="text-lg font-mono font-semibold mt-1 text-text-primary">Valid (24h left)</p>
          </div>
        </GlassCard>

        <GlassCard level={2} className="flex flex-col gap-4 p-6 hover:translate-y-[-4px] transition-transform duration-300">
          <div className="p-3 bg-purple-500/10 rounded-xl w-fit text-purple-600">
            <HardDrive weight="duotone" size={24} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-text-tertiary tracking-widest">Data Persistence</p>
            <p className="text-lg font-mono font-semibold mt-1 text-text-primary">rangeready.db</p>
          </div>
        </GlassCard>
      </div>

      {/* Recent Activity / Next Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        <GlassCard level={1} className="lg:col-span-2 min-h-[400px] p-8">
          <h3 className="text-xl font-bold text-text-primary mb-6">Device Under Test - Recent</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/40 bg-white/20 hover:bg-white/40 transition-colors">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                      <Waveform weight="duotone" size={20} />
                   </div>
                   <div>
                      <p className="font-semibold text-text-primary">TTC-ANT-L-00{i}</p>
                      <p className="text-xs text-text-tertiary">S-Parameter Suite · 22 Mar 2026</p>
                   </div>
                </div>
                <div className="text-right">
                   <span className="px-3 py-1 bg-status-pass/10 text-status-pass rounded-full text-[10px] font-bold uppercase tracking-wider">Pass</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard level={2} className="p-8 bg-accent-blue/5 border-accent-blue/20">
            <h3 className="text-xl font-bold text-text-primary mb-2 text-glow">Platform Control</h3>
            <p className="text-sm text-text-secondary mb-8">Execute a predefined ISRO qualification test suite directly.</p>
            <button className="w-full py-4 bg-accent-blue text-white rounded-2xl font-bold shadow-[0_10px_30px_rgba(30,111,217,0.3)] hover:scale-102 hover:bg-accent-blue-lume transition-all active:scale-95">
              Initialize New Test
            </button>
            <button className="w-full mt-4 py-4 bg-white/40 border border-white/60 text-text-primary rounded-2xl font-bold hover:bg-white/60 transition-all">
              Manage Templates
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

const Waveform: React.FC<{ weight: string; size: number; className?: string }> = ({ weight, size, className }) => (
  <Pulse weight={weight as "duotone" | "bold" | "fill" | "light" | "regular" | "thin"} size={size} className={className} />
);
