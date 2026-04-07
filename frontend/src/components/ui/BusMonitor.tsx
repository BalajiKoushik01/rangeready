import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Broadcast, CaretRight, XCircle, Trash } from '@phosphor-icons/react';

interface TraceLog {
  timestamp: string;
  step: string;
  command: string;
  response?: string;
  type: 'SCPI' | 'UDP' | 'SYSTEM';
}

interface BusMonitorProps {
  logs: TraceLog[];
  onClear: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const BusMonitor: React.FC<BusMonitorProps> = ({ logs, onClear, isOpen, onClose }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 w-full max-w-2xl h-[400px] bg-[#0B0F19] border border-[#1E293B] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[60] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#131B2C] border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-accent-blue/10 rounded text-accent-blue">
            <Terminal weight="bold" size={18} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Hardware Bus monitor</h3>
            <p className="text-[8px] font-bold uppercase text-text-tertiary tracking-tighter">Real-time SCPI Traceability (V5.1)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onClear}
            className="p-2 text-text-tertiary hover:text-white transition-colors"
            title="Clear Log"
          >
            <Trash size={18} />
          </button>
          <button 
            onClick={onClose}
            className="p-2 text-text-tertiary hover:text-status-fail transition-colors"
          >
            <XCircle size={20} weight="fill" />
          </button>
        </div>
      </div>

      {/* Log Terminal */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-2 bg-[#0B0F19] selection:bg-accent-blue/30 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-tertiary opacity-30 space-y-2">
              <Broadcast size={48} weight="thin" />
              <p className="uppercase tracking-[0.2em] text-[10px] font-bold">Awaiting Bus Traffic...</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="group border-l-2 border-transparent hover:border-accent-blue/40 pl-3 transition-colors"
              >
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-text-tertiary opacity-50">[{log.timestamp}]</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                    log.type === 'SCPI' ? 'bg-accent-blue/20 text-accent-blue' :
                    log.type === 'UDP' ? 'bg-status-pass/20 text-status-pass' :
                    'bg-white/10 text-white'
                  }`}>
                    {log.type}
                  </span>
                  <span className="text-white/40 font-bold uppercase tracking-widest text-[9px]">{log.step}</span>
                </div>
                <div className="flex items-start gap-2 text-glow-blue/80">
                  <CaretRight size={12} className="mt-0.5 text-accent-blue opacity-50" />
                  <span className="text-accent-blue-lume font-bold break-all">{log.command}</span>
                </div>
                {log.response && (
                  <div className="mt-1 ml-5 p-2 bg-white/5 rounded border border-white/5 text-text-secondary italic break-all">
                    <span className="text-[9px] font-black uppercase text-white/20 mr-2 not-italic">RES:</span>
                    {log.response}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-[#131B2C] border-t border-[#1E293B] flex justify-between items-center text-[8px] font-bold uppercase tracking-widest">
        <div className="flex items-center gap-4 text-text-tertiary">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-status-pass animate-pulse" />
            TCPIP::8787::READY
          </span>
          <span>BUFFER: {logs.length}/500</span>
        </div>
        <div className="text-accent-blue">
          AUTO_SCROLL: ACTIVE
        </div>
      </div>
    </motion.div>
  );
};
