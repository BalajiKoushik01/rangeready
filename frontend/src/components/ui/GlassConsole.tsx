import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  PaperPlaneTilt, 
  Trash, 
  ArrowClockwise,
  X 
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './GlassCard';

interface LogEntry {
  type: 'cmd' | 'resp' | 'err';
  content: string;
  time: string;
}

export const GlassConsole: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [command, setCommand] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const sendCommand = async () => {
    if (!command.trim()) return;
    
    const newLog: LogEntry = { 
      type: 'cmd', 
      content: command, 
      time: new Date().toLocaleTimeString() 
    };
    
    setLogs(prev => [...prev, newLog]);
    setCommand("");
    setIsProcessing(true);

    try {
      const res = await fetch("http://127.0.0.1:8787/api/commands/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_name: "SiglentSSADriver",
          command: command,
          address: "TCPIP::127.0.0.1::INSTR"
        })
      });
      const data = await res.json();
      
      setLogs(prev => [...prev, { 
        type: 'resp', 
        content: data.response || "No response.", 
        time: new Date().toLocaleTimeString() 
      }]);
    } catch (e) {
      setLogs(prev => [...prev, { 
        type: 'err', 
        content: "Network error: Hardware target unreachable.", 
        time: new Date().toLocaleTimeString() 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-[450px] z-50 p-6"
        >
          <GlassCard level={3} className="h-full flex flex-col overflow-hidden bg-bg-surface/80 border-l border-white/20 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 p-2">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-accent-blue/10 text-accent-blue rounded-xl">
                    <Terminal weight="duotone" size={24} />
                 </div>
                 <div>
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">SCPI Discovery Console</h3>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-status-pass uppercase">
                       <span className="w-1.5 h-1.5 rounded-full bg-status-pass animate-pulse" />
                       Siglent SSA Native (VXI-11)
                    </div>
                 </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-tertiary"
              >
                <X size={20} />
              </button>
            </div>

            {/* Log Area */}
            <div className="flex-1 overflow-y-auto mb-6 pr-2 scrollbar-hide space-y-4 font-mono text-[11px]">
               {logs.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-10">
                    <Terminal size={48} className="mb-4" />
                    <p className="uppercase tracking-widest">Awaiting Command Entry...</p>
                 </div>
               )}
               {logs.map((log, idx) => (
                 <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center opacity-50 text-[8px] uppercase font-black">
                       <span>{log.type === 'cmd' ? "TX (SEND)" : "RX (REPLY)"}</span>
                       <span>{log.time}</span>
                    </div>
                    <div className={`p-3 rounded-xl border ${
                      log.type === 'cmd' ? "bg-white/5 border-white/10" : 
                      log.type === 'err' ? "bg-status-fail/10 border-status-fail/20 text-status-fail" : 
                      "bg-accent-blue/5 border-accent-blue/20 text-accent-blue"
                    }`}>
                       {log.type === 'cmd' && <span className="mr-2 opacity-40">{">"}</span>}
                       {log.content}
                    </div>
                 </div>
               ))}
               <div ref={logEndRef} />
            </div>

            {/* Input Area */}
            <div className="space-y-4">
              <div className="relative group">
                 <input 
                  type="text" 
                  value={command}
                  onChange={(e) => setCommand(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
                  placeholder="ENTER SCPI COMMAND (E.G. *IDN?)"
                  className="w-full pl-6 pr-14 py-4 bg-white/5 border border-white/10 rounded-2xl text-[12px] font-black tracking-widest placeholder:opacity-30 focus:outline-none focus:bg-white/10 focus:border-accent-blue transition-all"
                 />
                 <button 
                  onClick={sendCommand}
                  disabled={isProcessing || !command}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-accent-blue text-white rounded-xl shadow-lg hover:bg-accent-blue-lume disabled:opacity-50 transition-all"
                 >
                    {isProcessing ? <ArrowClockwise className="animate-spin" size={18} /> : <PaperPlaneTilt size={18} weight="fill" />}
                 </button>
              </div>

              <div className="flex items-center justify-between">
                 <button 
                  onClick={() => setLogs([])}
                  className="flex items-center gap-2 text-[10px] font-black text-text-tertiary uppercase hover:text-status-fail transition-colors"
                 >
                    <Trash size={14} />
                    Reset Terminal
                 </button>
                 <span className="text-[10px] font-black text-text-tertiary opacity-50 uppercase">UTF-8 SCPI · V1.2</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
