import React, { useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Brain, TerminalWindow, Sparkle, Target, Waveform } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemState } from '../context/SystemStateContext';

export const IntelligenceHUD: React.FC = () => {
    const { isAiMode, activeBand } = useSystemState();
    const [query, setQuery] = useState("");
    const [history, setHistory] = useState<{role: 'user' | 'ai', text: string}[]>([
        { role: 'ai', text: `Intelligence matrix initialized at ${activeBand}. Awaiting SCPI translation directives or trace anomaly parameters.` }
    ]);
    const [isThinking, setIsThinking] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || !isAiMode) return;
        
        const q = query;
        setQuery("");
        setHistory(prev => [...prev, { role: 'user', text: q }]);
        setIsThinking(true);

        try {
            const res = await fetch(`http://localhost:8787/api/ai/scpi?query=${encodeURIComponent(q)}`);
            const data = await res.json();
            setHistory(prev => [...prev, { role: 'ai', text: data.command || data.response || "Execution complete." }]);
        } catch (error) {
            setHistory(prev => [...prev, { role: 'ai', text: "ERROR: Failed to reach offline matrix. Check if the GGUF model is loaded." }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 relative flex flex-col h-[calc(100vh-140px)]">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-3xl border ${isAiMode ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/20 shadow-glow-blue animate-pulse' : 'bg-white/5 text-text-tertiary border-white/10'}`}>
                        <Brain weight="duotone" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-text-primary tracking-tight">Intelligence HUD</h1>
                        <p className="text-sm text-text-secondary font-black tracking-widest uppercase opacity-70">Neural Architecture · Local Matrix</p>
                    </div>
                </div>
            </header>

            {!isAiMode ? (
                <GlassCard level={2} className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-white/5">
                    <div className="p-8 rounded-full bg-white/5 text-text-tertiary mb-6">
                        <TerminalWindow size={64} weight="duotone" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Neural Matrix Disabled</h2>
                    <p className="text-text-secondary max-w-md">Activate Intelligence Mode via the global System Control Bar to leverage offline GGUF analysis and natural language SCPI translation.</p>
                </GlassCard>
            ) : (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
                    <div className="lg:col-span-2 flex flex-col min-h-0 bg-bg-surface/40 backdrop-blur-3xl rounded-3xl border border-glass-border shadow-2xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-6 flex gap-4 opacity-30 pointer-events-none">
                            <Waveform size={200} className="text-accent-blue" weight="thin" />
                         </div>
                         
                         <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide z-10">
                            <AnimatePresence>
                            {history.map((msg, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] p-5 rounded-3xl ${
                                        msg.role === 'user' 
                                            ? 'bg-accent-blue text-white rounded-br-sm shadow-glow-blue' 
                                            : 'bg-white/5 text-text-secondary border border-white/10 rounded-bl-sm font-mono text-sm'
                                    }`}>
                                        {msg.role === 'user' && <span className="block text-[8px] font-black uppercase tracking-widest opacity-50 mb-2">Target Directives</span>}
                                        {msg.role === 'ai' && <span className="flex items-center gap-2 text-[8px] font-black uppercase text-accent-blue tracking-widest mb-2"><Sparkle weight="fill"/> Context Synthesized</span>}
                                        {msg.text}
                                    </div>
                                </motion.div>
                            ))}
                            </AnimatePresence>
                            {isThinking && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                    <div className="p-5 bg-white/5 rounded-3xl rounded-bl-sm border border-white/10 flex gap-2">
                                        <div className="w-2 h-2 rounded-full bg-accent-blue animate-bounce" />
                                        <div className="w-2 h-2 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '0.1s' }} />
                                        <div className="w-2 h-2 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    </div>
                                </motion.div>
                            )}
                         </div>

                         <div className="p-4 border-t border-glass-border bg-black/20 z-10">
                             <form onSubmit={handleSubmit} className="flex gap-4">
                                 <input 
                                     type="text"
                                     value={query}
                                     onChange={(e) => setQuery(e.target.value)}
                                     placeholder="Describe the SCPI command you need..."
                                     className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-accent-blue transition-colors font-medium placeholder:text-text-tertiary"
                                 />
                                 <button type="submit" disabled={isThinking || !query.trim()} className="px-8 bg-accent-blue text-white font-black uppercase tracking-widest rounded-2xl hover:bg-accent-blue-lume transition-colors disabled:opacity-50">
                                     Transmit
                                 </button>
                             </form>
                         </div>
                    </div>

                    <div className="space-y-6">
                        <GlassCard level={2} className="p-6 h-full flex flex-col">
                            <div className="flex-1">
                                <h3 className="text-[10px] font-black text-text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Target size={16} className="text-accent-blue" weight="duotone" />
                                    Context Parameters
                                </h3>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl border border-status-pass/20 bg-status-pass/5">
                                        <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest block mb-1">Active Band limits</span>
                                        <span className="text-sm font-bold text-status-pass">{activeBand}</span>
                                    </div>
                                    <div className="p-4 rounded-xl border border-white/5 bg-white/5">
                                        <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest block mb-1">Current Model</span>
                                        <span className="text-sm font-bold text-text-secondary">gemma-2-2b-it.Q4</span>
                                    </div>
                                    <div className="p-4 rounded-xl border border-white/5 bg-white/5">
                                        <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest block mb-1">Inference Engine</span>
                                        <span className="text-sm font-bold text-text-secondary line-clamp-1">llama-cpp-python (Offline)</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-auto pt-6 border-t border-white/5">
                                <p className="text-[10px] text-text-tertiary leading-relaxed">
                                    The neural engine operates autonomously. <strong>No metrics leave the host terminal.</strong>
                                </p>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IntelligenceHUD;
