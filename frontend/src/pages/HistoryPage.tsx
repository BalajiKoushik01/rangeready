import React, { useState, useEffect, useCallback } from 'react';
import { 
  FilePdf, 
  FileXls, 
  Trash, 
  MagnifyingGlass, 
  Funnel,
  CheckCircle,
  WarningCircle,
  Calendar
} from '@phosphor-icons/react';
import { GlassCard } from '../components/ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';

interface TestSession {
  id: number;
  dut_name: string;
  dut_serial: string;
  engineer_name: string;
  timestamp: string;
  overall_result: string;
}

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchHistory = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8787/api/tests/history");
      const data = await res.json();
      setHistory(data || []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(false);
  }, [fetchHistory]);

  const deleteSession = async (id: number) => {
    if (window.confirm("Permanently delete this measurement record?")) {
      try {
        await fetch(`http://127.0.0.1:8787/api/tests/${id}`, { method: 'DELETE' });
        await fetchHistory(false);
      } catch {
        // ignore
      }
    }
  };

  const filteredHistory = (history || []).filter(s => 
    s.dut_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.dut_serial.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Measurement Historian</h1>
          <p className="text-sm text-text-secondary font-medium uppercase tracking-wider opacity-70">Archive · ISRO-Standard Reports</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-accent-blue transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search DUT or Serial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:bg-white/10 focus:border-accent-blue transition-all w-64 shadow-inner-glass"
            />
          </div>
          <button className="p-3 bg-white/5 border border-white/10 rounded-2xl text-text-secondary hover:bg-white/10 transition-all">
            <Funnel size={18} />
          </button>
        </div>
      </header>

      <GlassCard level={1} className="overflow-hidden border border-white/10 shadow-glow-blue/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5 uppercase text-[10px] font-black tracking-widest text-text-tertiary">
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">DUT Identity</th>
                <th className="px-6 py-5">Engineer</th>
                <th className="px-6 py-5">Date & Time</th>
                <th className="px-6 py-5 text-center">Export</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm font-medium">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                        <td colSpan={6} className="px-6 py-10 bg-white/5" />
                    </tr>
                  ))
                ) : filteredHistory.length === 0 ? (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan={6} className="px-6 py-24 text-center text-text-tertiary italic uppercase tracking-widest text-[10px] font-black">
                      No matching records found in the historian.
                    </td>
                  </motion.tr>
                ) : (
                  filteredHistory.map((session) => (
                    <motion.tr 
                      key={session.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-6 py-5">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${
                          session.overall_result === "PASS" 
                            ? "bg-status-pass/10 text-status-pass border border-status-pass/20 shadow-glow-pass/10" 
                            : "bg-status-fail/10 text-status-fail border border-status-fail/20 shadow-glow-fail/10"
                        }`}>
                          {session.overall_result === "PASS" ? <CheckCircle weight="fill" size={12} /> : <WarningCircle weight="fill" size={12} />}
                          {session.overall_result}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-text-primary font-bold">{session.dut_name}</span>
                          <span className="text-[10px] text-text-tertiary font-mono tracking-tighter opacity-60 uppercase">SN: {session.dut_serial}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-text-secondary text-xs uppercase font-black">{session.engineer_name}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-text-tertiary text-xs font-bold">
                          <Calendar size={14} className="text-accent-blue opacity-50" />
                          {new Date(session.timestamp).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-1">
                          <button className="p-2 text-text-tertiary hover:text-accent-blue transition-all" title="View PDF">
                             <FilePdf weight="duotone" size={22} />
                          </button>
                          <button className="p-2 text-text-tertiary hover:text-status-pass transition-all" title="Export Excel">
                             <FileXls weight="duotone" size={22} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                         <button 
                          onClick={() => deleteSession(session.id)}
                          className="p-2.5 bg-status-fail/5 text-status-fail hover:bg-status-fail/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 border border-status-fail/20"
                         >
                            <Trash weight="duotone" size={18} />
                         </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
