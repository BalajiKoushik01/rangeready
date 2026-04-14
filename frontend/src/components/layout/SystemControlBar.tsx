import type { FC } from 'react';
import { useState } from 'react';
import { useSystemState } from '../../hooks/useSystemState';
import type { RFBand } from '../../types';
import { Cpu, Sliders, Warning, CheckCircle } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

const BANDS: RFBand[] = ["UHF", "L-Band", "S-Band", "C-Band", "X-Band", "Ku-Band"];

export const SystemControlBar: FC = () => {
    const { activeBand, setActiveBand, isAiMode, setIsAiMode, pendingBand, setPendingBand } = useSystemState();
    const [showWarning, setShowWarning] = useState(false);

    const handleBandClick = (band: RFBand) => {
        if (band !== activeBand) {
            setPendingBand(band);
            setShowWarning(true);
        }
    };

    const confirmBandChange = () => {
        if (pendingBand) {
            setActiveBand(pendingBand);
        }
        setShowWarning(false);
        setPendingBand(null);
    };

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-[#0B0F19] border-b border-[#1E293B] shadow-[0_4px_24px_rgba(0,0,0,0.6)] relative z-40 gap-4">
                {/* AI vs Manual Toggle */}
                <div className="flex items-center gap-2 p-1 bg-[#131B2C] rounded-lg border border-[#1E293B]">
                    <button 
                        onClick={() => setIsAiMode(true)}
                        className={`flex items-center justify-center gap-2 px-6 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${isAiMode ? 'bg-[#1E293B] text-text-tertiary border border-white/10' : 'text-text-tertiary hover:text-white'}`}
                    >
                        <Cpu weight={isAiMode ? "fill" : "bold"} size={16} />
                        Automated Signal Analysis Engine
                    </button>
                    <button 
                        onClick={() => setIsAiMode(false)}
                        className={`flex items-center justify-center gap-2 px-6 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${isAiMode === false ? 'bg-accent-blue text-white shadow-[0_0_15px_rgba(14,115,246,0.3)]' : 'text-text-tertiary hover:text-white'}`}
                    >
                        <Sliders weight={isAiMode === false ? "bold" : "bold"} size={16} />
                        SCPI Instrumentation Control
                    </button>
                </div>

                {/* Global Band Selector */}
                <div className="flex flex-wrap items-center gap-1 bg-[#131B2C] p-1 rounded-lg border border-[#1E293B]">
                    {BANDS.map((band) => (
                        <button
                            key={band}
                            onClick={() => handleBandClick(band)}
                            className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeBand === band ? 'bg-status-pass text-[#0B0F19] shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'text-text-secondary hover:bg-[#1E293B] hover:text-white'}`}
                        >
                            {band}
                        </button>
                    ))}
                </div>
            </div>

            {/* Warning Modal */}
            <AnimatePresence mode="wait">
                {showWarning && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="w-full max-w-lg p-8 bg-[#0B0F19] border border-[#1E293B] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] space-y-6"
                        >
                            <div className="flex items-start gap-4 text-status-warn">
                                <div className="p-3 bg-status-warn/10 rounded-lg border border-status-warn/30 text-status-warn">
                                    <Warning weight="bold" size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-lg font-bold uppercase tracking-widest text-white leading-tight">Hardware System Interlock Alert</h2>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-status-warn">Instrumentation Frequency Band Shift Pending</p>
                                </div>
                            </div>
                            <div className="p-5 bg-[#131B2C] rounded-lg border border-[#1E293B]">
                                <p className="text-xs text-[#94A3B8] leading-relaxed font-bold uppercase tracking-tight">
                                    Shifting context from <span className="text-white">{activeBand}</span> to <span className="text-status-pass">{pendingBand}</span>. 
                                </p>
                                <ul className="mt-4 space-y-2 text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
                                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-sm bg-status-fail"></div> Current active sweeps will be ABORTED.</li>
                                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-sm bg-status-fail"></div> Frequency & power guardrails will reset.</li>
                                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-sm bg-status-warn"></div> Verify no DUT is actively transmitting.</li>
                                </ul>
                            </div>
                            <div className="flex gap-4 pt-2">
                                <button
                                    onClick={() => setShowWarning(false)}
                                    className="flex-1 py-3 bg-[#1E293B] hover:bg-[#2e3e55] text-white rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all"
                                >
                                    Cancel Operation
                                </button>
                                <button
                                    onClick={confirmBandChange}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-status-warn hover:bg-yellow-600 text-[#0B0F19] rounded-lg font-bold uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all"
                                >
                                    <CheckCircle weight="bold" size={16} />
                                    Confirm Frequency Shift
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </>
    );
};
