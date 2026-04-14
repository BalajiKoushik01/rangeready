/**
 * FILE: components/ui/TelemetrySentry.tsx
 * ROLE: Real-Time SCPI Toast Visualization.
 * SOURCE: App.tsx (Mounted at root level).
 * TARGET: useTelemetry hook.
 * DESCRIPTION: Animates incoming and outgoing SCPI packets in the bottom-left corner of the GUI for instant feedback.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetry } from '../../hooks/useTelemetry';
import { Terminal, Broadcast, ShieldCheck } from '@phosphor-icons/react';

export const TelemetrySentry: React.FC = () => {
    const { packets } = useTelemetry();

    return (
        <div className="fixed bottom-8 left-8 z-[200] flex flex-col gap-3 w-80 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {packets.map((pkt) => (
                    <motion.div
                        key={pkt.id}
                        initial={{ opacity: 0, x: -40, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                        layout
                        className="pointer-events-auto group"
                    >
                        <div className="relative overflow-hidden rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 p-4 shadow-2xl shadow-black/50">
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            <div className="flex items-start gap-3 relative z-10">
                                <div className={`p-2 rounded-lg ${
                                    pkt.type === 'sent' ? 'bg-accent-blue/10 text-accent-blue' : 
                                    pkt.type === 'received' ? 'bg-status-pass/10 text-status-pass' : 
                                    'bg-status-fail/10 text-status-fail'
                                } border border-current/20`}>
                                    {pkt.type === 'sent' ? <Broadcast size={16} weight="bold" /> : <Terminal size={16} weight="bold" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-text-tertiary">
                                            {pkt.type === 'sent' ? 'Packet Sent' : 'Response'} · {pkt.timestamp}
                                        </span>
                                        <span className="text-[7px] font-black text-accent-blue opacity-50 truncate max-w-[100px]">
                                            {pkt.address}
                                        </span>
                                    </div>
                                    <div className="font-mono text-[10px] text-text-primary truncate selection:bg-accent-blue/30 italic">
                                        {pkt.packet}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Discovery Status Indicator (Optional but cool) */}
            {packets.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-blue/5 border border-accent-blue/10 rounded-full w-fit backdrop-blur-md"
                >
                    <ShieldCheck size={12} className="text-accent-blue" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-accent-blue">Live Telemetry Link Active</span>
                </motion.div>
            )}
        </div>
    );
};
