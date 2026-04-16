import React, { useMemo } from 'react';
import { Brain, CheckCircle, Warning, Cpu, CircleNotch } from '@phosphor-icons/react';

export interface AiStatus {
  model_loaded: boolean;
  backend: string;
  status: string;
  model_name: string;
  engine_path: string;
  storage_path: string;
  capabilities: string[];
  download: {
    active: boolean;
    status: string;
  };
}

interface StatusHeaderProps {
  aiStatus: AiStatus | null;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({ aiStatus }) => {
  const isReady = aiStatus?.model_loaded;
  const isOnDisk = aiStatus?.status === 'initializing';
  const isDownloading = aiStatus?.download?.active;
  const downloadPct = typeof aiStatus?.download === 'object' && 'percent' in aiStatus.download ? (aiStatus.download as any).percent : 0;

  const config = useMemo(() => {
    if (isReady) return { 
        label: '🟢 Ready', 
        cls: 'bg-status-pass/10 text-status-pass border-status-pass/20', 
        icon: <CheckCircle size={14} weight="fill" /> 
    };
    if (isDownloading) return { 
        label: `🟡 Downloading ${downloadPct}%`, 
        cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20 shadow-glow-amber', 
        icon: <CircleNotch size={14} className="animate-spin" /> 
    };
    if (isOnDisk) return { 
        label: '🟠 Loading...', 
        cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20', 
        icon: <Cpu size={14} weight="duotone" /> 
    };
    return { 
        label: '🔴 Not Downloaded', 
        cls: 'bg-white/5 text-text-tertiary border-white/10', 
        icon: <Warning size={14} weight="fill" /> 
    };
  }, [isReady, isDownloading, isOnDisk, downloadPct]);

  return (
    <header className="flex items-center justify-between flex-shrink-0 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className={`p-4 rounded-3xl border transition-all duration-700 ${
          isReady 
            ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/20 shadow-glow-blue' 
            : 'bg-white/5 border-white/10 text-text-tertiary'
        }`}>
          <Brain weight="duotone" size={32} className={isReady ? 'animate-pulse' : ''} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight italic uppercase underline decoration-accent-blue decoration-4 underline-offset-8">
            Intelligence HUD
          </h1>
          <p className="text-[10px] text-text-secondary font-black tracking-widest uppercase opacity-60 mt-1">
            Offline AI · {config.label}
          </p>
        </div>
      </div>

      <div className={`px-4 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${config.cls}`}>
        {config.icon} 
        {isReady ? `Native Ollama Loaded` : config.label.replace(/^[^\s]+ /, '')}
      </div>
    </header>
  );
};
