import React from 'react';
import { 
  Pulse, Power
} from '@phosphor-icons/react';

interface Props {
  rfState: boolean;
  modState: boolean;
  onRfToggle: () => void;
  onModToggle: () => void;
  title?: string;
}

export const MasterOutputToggle: React.FC<Props> = ({ 
  rfState, modState, onRfToggle, onModToggle, title = "System Master Control" 
}) => {
  return (
    <div className="glass-panel p-6 border border-white/5 flex items-center justify-between gap-8 mb-8">
      <div className="flex items-center gap-6">
        <div className="p-3 bg-neon-cyan/10 rounded-xl border border-neon-cyan/20 text-neon-cyan">
          <Activity size={24} className="animate-pulse" />
        </div>
        <div>
          <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">{title}</h2>
          <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest mt-0.5">Global Emission & Modulation Gate</p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-1 max-w-lg">
        <button
          onClick={onRfToggle}
          className={`group flex-1 h-14 rounded-xl flex items-center px-6 gap-4 border transition-all duration-500 overflow-hidden relative ${
            rfState 
              ? 'bg-red-500/20 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]' 
              : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
          }`}
        >
          <div className={`p-2 rounded-lg ${rfState ? 'bg-red-500 text-white' : 'bg-white/10 text-white/40'}`}>
            <Power size={18} weight="bold" />
          </div>
          <div className="flex flex-col items-start translate-z-0 transition-transform group-active:scale-95">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-60">RF Emission</span>
            <span className={`text-[11px] font-black uppercase tracking-wider ${rfState ? 'text-white' : ''}`}>
              {rfState ? 'LIVE · ON AIR' : 'RADIATION SAFE'}
            </span>
          </div>
          {rfState && (
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={onModToggle}
          className={`group flex-1 h-14 rounded-xl flex items-center px-6 gap-4 border transition-all duration-500 overflow-hidden relative ${
            modState 
              ? 'bg-neon-cyan/20 border-neon-cyan shadow-[0_0_30px_rgba(0,245,255,0.2)]' 
              : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
          }`}
        >
          <div className={`p-2 rounded-lg ${modState ? 'bg-neon-cyan text-black' : 'bg-white/10 text-white/40'}`}>
            <Pulse size={18} weight="bold" />
          </div>
          <div className="flex flex-col items-start translate-z-0 transition-transform group-active:scale-95">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Modulation</span>
            <span className={`text-[11px] font-black uppercase tracking-wider ${modState ? 'text-white' : ''}`}>
              {modState ? 'VECTOR ACTIVE' : 'CARRIER ONLY'}
            </span>
          </div>
          {modState && (
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-neon-cyan animate-pulse" />
          )}
        </button>
      </div>

      <div className="hidden xl:flex items-center gap-4 text-right">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Safety Protocol</span>
          <span className="text-[10px] font-bold text-neon-cyan/60 uppercase">Manual Auth Required</span>
        </div>
      </div>
    </div>
  );
};

const Activity = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" className={className}>
    <path d="M240,128a8,8,0,0,1-8,8H201.24l-22.14,48.24a8.06,8.06,0,0,1-14.73,0l-37.14-81.04-18.47,40.3a8,8,0,0,1-14.52,0L78,110.42,66,136.63A8,8,0,0,1,58.74,142H24a8,8,0,0,1,0-16H54.26L70.76,90.22a8.06,8.06,0,0,1-14.5,0l16.14,35.2L119,89.7a8.06,8.06,0,0,1,14.65-.24l37,80.75,22.14-48.24A8.06,8.06,0,0,1,200,116h32A8,8,0,0,1,240,128Z" />
  </svg>
);
