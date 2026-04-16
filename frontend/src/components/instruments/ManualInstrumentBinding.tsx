import React, { useState } from 'react';
import { WifiHigh, PlusCircle, Trash, CheckCircle } from '@phosphor-icons/react';

interface InstrumentBinding {
  role: string;
  ip: string;
  manufacturer: string;
  status: 'online' | 'offline' | 'checking';
}

export const ManualInstrumentBinding: React.FC = () => {
  const [bindings, setBindings] = useState<InstrumentBinding[]>([
    { role: 'Signal Generator', ip: '192.168.1.10', manufacturer: 'Keysight', status: 'online' },
    { role: 'Spectrum Analyzer', ip: '192.168.1.11', manufacturer: 'R&S', status: 'offline' },
  ]);

  const [newIp, setNewIp] = useState('');
  const [newRole, setNewRole] = useState('Signal Generator');

  const addBinding = () => {
    if (!newIp) return;
    setBindings([...bindings, { role: newRole, ip: newIp, manufacturer: 'Auto-Detect', status: 'checking' }]);
    setNewIp('');
  };

  return (
    <div className="glass-panel p-6 border border-white/5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Direct IP Registry</h2>
          <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest mt-1">Manual LXI Node Configuration</p>
        </div>
        <WifiHigh size={32} weight="duotone" className="text-neon-cyan" />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto mb-6 pr-2 custom-scrollbar">
        {bindings.map((b, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-neon-cyan/30 transition-all">
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${b.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {b.status === 'online' ? <CheckCircle size={20} weight="fill" /> : <Activity size={20} className="animate-pulse" />}
              </div>
              <div>
                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">{b.role}</div>
                <div className="text-sm font-bold text-white font-mono">{b.ip}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{b.manufacturer}</span>
              <button 
                onClick={() => setBindings(bindings.filter((_, idx) => idx !== i))}
                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all"
              >
                <Trash size={16} weight="bold" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex gap-4">
        <select 
          value={newRole} 
          onChange={(e) => setNewRole(e.target.value)}
          className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest text-text-dim outline-none w-1/3"
        >
          <option value="Signal Generator" className="bg-slate-900">SigGen</option>
          <option value="Spectrum Analyzer" className="bg-slate-900">Analyzer</option>
          <option value="VNA" className="bg-slate-900">VNA</option>
        </select>
        <input 
          type="text" 
          value={newIp}
          onChange={(e) => setNewIp(e.target.value)}
          placeholder="ENTER LXI IP (e.g. 192.168.x.x)"
          className="flex-1 bg-transparent border-none text-[12px] font-mono text-white outline-none placeholder:text-white/10"
        />
        <button 
          onClick={addBinding}
          className="p-2 bg-neon-cyan text-black rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,245,255,0.4)]"
        >
          <PlusCircle size={20} weight="bold" />
        </button>
      </div>
    </div>
  );
};

const Activity = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" className={className}>
    <path d="M240,128a8,8,0,0,1-8,8H201.24l-22.14,48.24a8.06,8.06,0,0,1-14.73,0l-37.14-81.04-18.47,40.3a8,8,0,0,1-14.52,0L78,110.42,66,136.63A8,8,0,0,1,58.74,142H24a8,8,0,0,1,0-16H54.26L70.76,90.22a8.06,8.06,0,0,1,14.5,0l16.14,35.2L119,89.7a8.06,8.06,0,0,1,14.65-.24l37,80.75,22.14-48.24A8.06,8.06,0,0,1,200,116h32A8,8,0,0,1,240,128Z" />
  </svg>
);
