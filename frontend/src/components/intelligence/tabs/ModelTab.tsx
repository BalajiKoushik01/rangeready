import React from 'react';
import { motion } from 'framer-motion';
import { Brain, CheckCircle } from '@phosphor-icons/react';
import { GlassCard } from '../../ui/GlassCard';
import type { AiStatus } from '../StatusHeader';

interface ModelTabProps {
  aiStatus: AiStatus | null;
  isModelReady: boolean;
}

export const ModelTab: React.FC<ModelTabProps> = ({
  aiStatus, isModelReady
}) => {
  const isModelOnDisk = aiStatus?.status === 'initializing';

  return (
    <motion.div 
      key="model"
      initial={{ opacity: 0, x: -10 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0 }}
      className="h-full"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Model card */}
        <GlassCard level={2} className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-4 rounded-2xl ${isModelReady ? 'bg-status-pass/10 text-status-pass border border-status-pass/20' : 'bg-white/5 text-text-tertiary border border-white/10'}`}>
              <Brain size={28} weight="duotone" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">RangeReady V6 AI (Ollama)</h2>
              <p className="text-[9px] text-text-tertiary">Ollama Native Engine · Portable App · Offline Model</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {[
              { label: 'Status', value: isModelReady ? '✅ Loaded & Ready' : isModelOnDisk ? '⏳ On disk, loading...' : '❌ Not downloaded', color: isModelReady ? 'text-status-pass' : 'text-text-tertiary' },
              { label: 'File', value: aiStatus?.model_name || '...', color: 'text-white font-mono' },
              { label: 'Local Storage', value: aiStatus?.storage_path || '...', color: 'text-white' },
              { label: 'Inference Backend', value: aiStatus?.engine_path || '...', color: 'text-white' },
              { label: 'Platform Context', value: 'Live HW Hooks', color: 'text-white' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[10px] text-text-tertiary">{row.label}</span>
                <span className={`text-[10px] ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>

          {!isModelReady && (
            <>
              <div className="p-4 bg-status-fail/10 border border-status-fail/20 rounded-2xl text-status-fail text-xs">
                 <p className="font-bold">Offline AI Engine (Missing Brain)</p>
                 <p className="mt-1 text-[10px] text-status-fail/80">
                   The local AI knowledge base has not been initialized. 
                   Run <strong>INITIALIZE_AI.bat</strong> in the root directory while connected to the internet to pre-load the expert model.
                 </p>
              </div>
            </>
          )}

          {isModelReady && (
            <div className="flex items-center justify-center gap-2 py-3 bg-status-pass/10 rounded-2xl border border-status-pass/20 text-status-pass text-[11px] font-black">
              <CheckCircle size={18} weight="fill" /> AI Ready · All features enabled
            </div>
          )}
        </GlassCard>

        {/* Engine Config Card */}
        <GlassCard level={2} className="p-8">
           <h3 className="text-white text-xs font-black uppercase tracking-widest mb-4">Engine Logic</h3>
           <div className="space-y-4">
              <div className="flex gap-3">
                 <div className="shrink-0 w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue font-black text-xs">1</div>
                 <div>
                    <h4 className="text-[10px] text-white font-bold uppercase">Zero-Install Runtime</h4>
                    <p className="text-[9px] text-text-tertiary leading-relaxed mt-1">Ollama instance is pre-packaged. No system dependencies required.</p>
                 </div>
              </div>
              <div className="flex gap-3">
                 <div className="shrink-0 w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue font-black text-xs">2</div>
                 <div>
                    <h4 className="text-[10px] text-white font-bold uppercase">Codebase Synopsis</h4>
                    <p className="text-[9px] text-text-tertiary leading-relaxed mt-1">AI has read-access to the software architecture for self-healing context.</p>
                 </div>
              </div>
              <div className="flex gap-3">
                 <div className="shrink-0 w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue font-black text-xs">3</div>
                 <div>
                    <h4 className="text-[10px] text-white font-bold uppercase">Hardware Wisdom</h4>
                    <p className="text-[9px] text-text-tertiary leading-relaxed mt-1">Ingested Keysight/R&S dialect heuristics for autonomous radar control.</p>
                 </div>
              </div>
           </div>
        </GlassCard>
      </div>
    </motion.div>
  );
};
