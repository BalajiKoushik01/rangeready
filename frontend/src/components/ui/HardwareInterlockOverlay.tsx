import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemState } from '../../hooks/useSystemState';
import { Gear } from '@phosphor-icons/react';

export const HardwareInterlockOverlay: React.FC = () => {
    const { isHardwareBusy, busyMessage } = useSystemState();

    return (
        <AnimatePresence>
            {isHardwareBusy && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                    id="hardware-interlock-overlay"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="w-full max-w-sm p-8 bg-[#0B0F19]/90 border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col items-center text-center space-y-6"
                    >
                        {/* Animated Gear Icon */}
                        <div className="relative">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                                className="text-accent-blue"
                            >
                                <Gear weight="duotone" size={64} />
                            </motion.div>
                            <div className="absolute inset-0 bg-accent-blue/20 blur-xl rounded-full" />
                        </div>

                        {/* Text Content */}
                        <div className="space-y-2">
                            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
                                Hardware Interlock Active
                            </h2>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                                {busyMessage || "Deterministic command execution in progress..."}
                            </p>
                        </div>

                        {/* Progress Bar / Waiting Text */}
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ x: "-100%" }}
                                animate={{ x: "100%" }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                className="w-1/2 h-full bg-gradient-to-r from-transparent via-accent-blue to-transparent"
                            />
                        </div>

                        <p className="text-[9px] font-bold uppercase tracking-tighter text-status-warn animate-pulse">
                            Please wait for command completion to continue.
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
