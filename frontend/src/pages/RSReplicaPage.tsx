import React, { useState, useEffect, useRef } from 'react';
import { RSAnalyzerReplica } from '../components/instruments/RSAnalyzerReplica';
import { RSSigGenReplica } from '../components/instruments/RSSigGenReplica';
import { motion, AnimatePresence } from 'framer-motion';

const API = `http://${window.location.hostname}:8787`;

interface ReplicaPageProps {
    initialTab?: 'siggen' | 'analyzer';
}

export const RSReplicaPage: React.FC<ReplicaPageProps> = ({ initialTab = 'analyzer' }) => {
    const [activeTab, setActiveTab] = useState<'siggen' | 'analyzer'>(initialTab);
    const [status, setStatus] = useState<any>({ siggen: {}, analyzer: {} });
    const wsRef = useRef<WebSocket | null>(null);

    // Synchronize tab when routed from sidebar
    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        const connectWs = () => {
            const ws = new WebSocket(`ws://${window.location.hostname}:8787/ws`);
            ws.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    if (msg.type === 'instrument_status') {
                        setStatus((prev: any) => ({
                            ...prev,
                            siggen: msg.data.siggen || prev.siggen,
                            analyzer: msg.data.analyzer || prev.analyzer
                        }));
                    }
                } catch {
                    console.warn("Malformed WS");
                }
            };
            wsRef.current = ws;
        };
        connectWs();
        return () => wsRef.current?.close();
    }, []);

    // Poll for trace data periodically
    useEffect(() => {
        const interval = setInterval(async () => {
            if (activeTab === 'analyzer') {
                try {
                    const res = await fetch(`${API}/api/instrument-control/analyzer/trace?manufacturer=rs`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.trace) {
                            setStatus((prev: any) => ({
                                ...prev,
                                analyzer: { ...prev.analyzer, trace: data.trace }
                            }));
                        }
                    }
                } catch {
                    console.warn("Failed to update trace data from hardware");
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [activeTab]);

    return (
        <div className="w-full h-full flex items-center justify-center animate-in fade-in duration-700 p-4">
            <div className="w-full max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between border-b border-[#E11D48]/30 pb-4">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Rohde & Schwarz Industrial Suite</h1>
                        <p className="text-[11px] text-[#E11D48] font-black tracking-widest uppercase mt-1">SMCV100B Signal Gen // FSW Spectral Analyzer</p>
                    </div>

                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 backdrop-blur-md">
                        <button 
                            onClick={() => setActiveTab('siggen')}
                            className={`px-6 py-2 rounded-lg text-xs font-black tracking-widest uppercase transition-all duration-300 ${activeTab === 'siggen' ? 'bg-[#E11D48] text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]' : 'text-white/40 hover:text-white'}`}
                        >
                            Signal Source
                        </button>
                        <button 
                            onClick={() => setActiveTab('analyzer')}
                            className={`px-6 py-2 rounded-lg text-xs font-black tracking-widest uppercase transition-all duration-300 ${activeTab === 'analyzer' ? 'bg-[#E11D48] text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]' : 'text-white/40 hover:text-white'}`}
                        >
                            Spectral View
                        </button>
                    </div>

                    <div className="px-4 py-2 bg-[#E11D48]/10 border border-[#E11D48]/30 rounded-lg hidden md:block">
                        <span className="text-[10px] font-black text-[#E11D48] uppercase tracking-wider">HiSLIP Control Active</span>
                    </div>
                </div>

                <div className="p-8 bg-[#040810] rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden min-h-[600px]">
                    <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                    
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
                            transition={{ duration: 0.4, ease: "circOut" }}
                            className="relative z-10"
                        >
                            {activeTab === 'siggen' ? (
                                <RSSigGenReplica status={status.siggen} />
                            ) : (
                                <RSAnalyzerReplica status={status.analyzer} />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default RSReplicaPage;
