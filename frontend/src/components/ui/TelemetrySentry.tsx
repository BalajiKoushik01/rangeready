/**
 * FILE: components/ui/TelemetrySentry.tsx
 * ROLE: Real-Time AI & Hardware Visualization.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetry } from '../../hooks/useTelemetry';
import { Terminal, Broadcast, ShieldCheck, Sparkle, Info, Warning } from '@phosphor-icons/react';

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
                        <div className={`relative overflow-hidden rounded-2xl bg-black/40 backdrop-blur-2xl border p-4 shadow-2xl shadow-black/50 ${
                            pkt.type === 'ai_heal' ? 'border-yellow-400/30' : 
                            pkt.type === 'proposal' ? 'border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]' :
                            pkt.type === 'error' ? 'border-status-fail/30' : 'border-white/10'
                        }`}>
                            
                            {/* AI Pulse Glow (Gold for Proposal, Yellow for Heal) */}
                            {(pkt.type === 'ai_heal' || pkt.type === 'proposal') && (
                                <motion.div 
                                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className={`absolute inset-0 ${pkt.type === 'proposal' ? 'bg-amber-500/10' : 'bg-yellow-400/5'}`}
                                />
                            )}
                            
                            <div className="flex items-start gap-3 relative z-10">
                                <div className={`p-2 rounded-lg ${
                                    pkt.type === 'sent' ? 'bg-accent-blue/10 text-accent-blue' : 
                                    pkt.type === 'received' ? 'bg-status-pass/10 text-status-pass' : 
                                    pkt.type === 'ai_heal' ? 'bg-yellow-400/10 text-yellow-400' :
                                    pkt.type === 'proposal' ? 'bg-amber-500/10 text-amber-500' :
                                    pkt.type === 'system_info' ? 'bg-white/10 text-white' :
                                    'bg-status-fail/10 text-status-fail'
                                } border border-current/20`}>
                                    {pkt.type === 'sent' ? <Broadcast size={16} weight="bold" /> : 
                                     pkt.type === 'received' ? <Terminal size={16} weight="bold" /> :
                                     pkt.type === 'ai_heal' ? <Sparkle size={16} weight="fill" /> :
                                     pkt.type === 'proposal' ? <Warning size={16} weight="fill" /> :
                                     <Info size={16} weight="bold" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${
                                            pkt.type === 'ai_heal' ? 'text-yellow-400' : 
                                            pkt.type === 'proposal' ? 'text-amber-500' : 'text-text-tertiary'
                                        }`}>
                                            {pkt.type === 'sent' ? 'Command Sent' : 
                                             pkt.type === 'ai_heal' ? 'AI Autonomous Repair' :
                                             pkt.type === 'proposal' ? 'Pending AI Review' :
                                             pkt.type === 'received' ? 'Hardware Response' : 'System Event'} · {pkt.timestamp.slice(11, 19)}
                                        </span>
                                        <span className="text-[7px] font-black text-accent-blue opacity-50 truncate max-w-[100px]">
                                            {pkt.address}
                                        </span>
                                    </div>
                                    <div className={`font-mono text-[10px] truncate selection:bg-accent-blue/30 ${
                                        pkt.type === 'ai_heal' || pkt.type === 'proposal' ? 'text-yellow-100 italic' : 'text-text-primary'
                                    }`}>
                                        {pkt.packet}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Discovery Status Indicator */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/5 rounded-full w-fit backdrop-blur-md"
            >
                <ShieldCheck size={12} className="text-accent-blue" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-accent-blue">AI Sentry Active</span>
            </motion.div>
        </div>
    );
};
