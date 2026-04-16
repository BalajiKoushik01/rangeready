import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Robot, Play, Plug, Lightning, CheckCircle } from '@phosphor-icons/react';
import { GlassCard } from '../../ui/GlassCard';
import { MessageBubble } from '../shared/MessageBubble';
import type { ChatMessage } from '../shared/MessageBubble';

interface Instrument {
  id: number;
  name: string;
  address: string;
  driver_id: string;
  vendor: string;
  instrument_class: string;
  command_map?: Record<string, string>;
}

interface AgenticTabProps {
  agenticHistory: ChatMessage[];
  input: string;
  setInput: (val: string) => void;
  isThinking: boolean;
  isModelReady: boolean;
  instruments: Instrument[];
  selectedInstrument: Instrument | null;
  setSelectedInstrument: (inst: Instrument | null) => void;
  handleAgenticSubmit: (e: React.FormEvent) => void;
}

const AGENTIC_SUGGESTIONS = [
  "Set frequency to 2.4 GHz",
  "Turn on the RF output",
  "Set power level to -20 dBm",
  "Enable AM modulation at 30% depth",
  "Turn off all modulation",
  "Query the current output frequency",
];

export const AgenticTab: React.FC<AgenticTabProps> = ({
  agenticHistory, input, setInput, isThinking, isModelReady, 
  instruments, selectedInstrument, setSelectedInstrument, handleAgenticSubmit
}) => {
  const agenticEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    agenticEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agenticHistory]);

  return (
    <motion.div 
      key="agentic"
      initial={{ opacity: 0, x: -10 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0 }}
      className="h-full flex flex-col gap-4"
    >
      {/* Instrument selector */}
      <GlassCard level={2} className="p-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Plug size={20} className="text-accent-blue" weight="duotone" />
          <div className="flex-1">
            <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1">
              Target Instrument
            </p>
            <select
              value={selectedInstrument?.id || ''}
              onChange={e => {
                const inst = instruments.find(i => i.id === parseInt(e.target.value));
                setSelectedInstrument(inst || null);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent-blue transition-all"
            >
              <option value="">— Select connected hardware —</option>
              {instruments.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.address}) [{inst.driver_id}]
                </option>
              ))}
            </select>
          </div>
          {selectedInstrument && (
            <div className="shrink-0 px-3 py-2 bg-status-pass/10 border border-status-pass/30 rounded-xl text-[9px] text-status-pass font-black">
              <CheckCircle size={12} className="inline mr-1" weight="fill" />
              Selected
            </div>
          )}
        </div>
      </GlassCard>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Agentic chat window */}
        <div className="lg:col-span-3 flex flex-col min-h-0 bg-bg-surface/40 backdrop-blur-3xl rounded-3xl border border-glass-border shadow-2xl overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
            <AnimatePresence>
              {agenticHistory.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
            </AnimatePresence>
            {isThinking && (
              <div className="flex justify-start mb-4">
                <div className="mr-2 p-1.5 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue">
                  <Robot size={14} weight="duotone" />
                </div>
                <div className="px-5 py-3 bg-white/5 rounded-2xl rounded-bl-sm border border-white/10 flex gap-1.5 items-center">
                  <Lightning size={14} className="text-accent-blue animate-pulse" />
                  <span className="text-[10px] text-text-tertiary">Translating and executing...</span>
                </div>
              </div>
            )}
            <div ref={agenticEndRef} />
          </div>

          <div className="p-4 border-t border-glass-border bg-black/20">
            <form onSubmit={handleAgenticSubmit} className="flex gap-3">
              <input 
                value={input} 
                onChange={e => setInput(e.target.value)}
                placeholder={
                  !selectedInstrument ? "Select an instrument above first" :
                  !isModelReady ? "Download the AI model first" :
                  "Describe what you want the instrument to do..."
                }
                disabled={isThinking || !selectedInstrument || !isModelReady}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm focus:outline-none focus:border-accent-blue transition-all placeholder:text-text-tertiary disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={isThinking || !input.trim() || !selectedInstrument || !isModelReady}
                className="px-6 bg-accent-blue text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-500 transition-all disabled:opacity-40 flex items-center gap-2 text-[10px]"
              >
                <Play size={16} weight="fill" /> Execute
              </button>
            </form>
          </div>
        </div>

        {/* Suggestions */}
        <div className="space-y-3">
          <GlassCard level={2} className="p-4">
            <h3 className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-3 flex items-center gap-2">
              <Lightning size={12} className="text-amber-400" weight="fill" /> Agentic Prompts
            </h3>
            <div className="space-y-2">
              {AGENTIC_SUGGESTIONS.map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => setInput(s)}
                  className="w-full text-left text-[9px] text-text-tertiary hover:text-white bg-white/5 hover:bg-white/10 rounded-xl px-3 py-2 transition-all border border-transparent hover:border-amber-400/20"
                >
                  {s}
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard level={2} className="p-4">
            <h3 className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-2">Process Summary</h3>
            <ol className="text-[9px] text-text-tertiary space-y-1 list-inside list-decimal opacity-80">
              <li>Interpret NLP query</li>
              <li>Translate to SCPI header</li>
              <li>Push to Hardware API</li>
              <li>Verify SYST:ERR outcome</li>
            </ol>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
};
