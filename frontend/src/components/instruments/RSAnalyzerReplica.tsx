/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Target, Plus, Trash, MagnifyingGlassPlus } from '@phosphor-icons/react';

interface MarkerData { index: number; active: boolean; x: number; y: number; }

interface RSProps {
    status?: any;
}

export const RSAnalyzerReplica: React.FC<RSProps> = ({ status }) => {
    const [selectedMarker, setSelectedMarker] = useState(1);

    const sendMarkerCmd = async (index: number, params: any) => {
        try {
            await fetch(`http://${window.location.hostname}:8787/api/instrument-control/analyzer/marker`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index, ...params })
            });
        } catch (e) {
            console.error("Marker Cmd Error", e);
        }
    };

    const markers = status?.markers || [];

    return (
        <div className="grid grid-cols-12 gap-8 h-full">
            {/* Analyzer Main Screen */}
            <div className="col-span-12 lg:col-span-9">
                <div className="relative p-1 bg-[#10141d] rounded-[2.5rem] border-[12px] border-[#1E293B] shadow-2xl overflow-hidden aspect-[16/9]">
                    <div className="w-full h-full bg-[#0B0F19] rounded-[1.5rem] flex flex-col p-6 relative">
                        {/* The Grid / Trace Area */}
                        <div className="flex-1 relative border border-white/5 rounded-xl overflow-hidden bg-[#05070A]">
                            {/* SVG Grid */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                                <pattern id="grid" width="10%" height="10%" patternUnits="userSpaceOnUse">
                                    <path d="M 100 0 L 0 0 0 100" fill="none" stroke="white" strokeWidth="1"/>
                                </pattern>
                                <rect width="100%" height="100%" fill="url(#grid)" />
                            </svg>

                            {/* Synthetic Trace Path (Placeholder visualization) */}
                            <svg className="absolute inset-0 w-full h-full">
                                <polyline
                                    fill="none"
                                    stroke="#FACC15"
                                    strokeWidth="2"
                                    points="0,300 100,280 200,310 300,305 400,290 500,50 600,280 700,300 800,310 900,295 1000,300"
                                    className="drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]"
                                    style={{ transform: 'scale(1.2, 1)', transformOrigin: 'center' }}
                                />
                                
                                {/* Markers on Trace */}
                                {markers.filter((m: MarkerData) => m.active).map((m: MarkerData, i: number) => (
                                    <g key={i} transform={`translate(${300 + i*50}, ${300 - (i * 40)})`}>
                                        <path d="M 0 -10 L 10 0 L 0 10 L -10 0 Z" fill="#F43F5E" />
                                        <text x="12" y="-5" className="text-[10px] font-black fill-white">M{m.index}</text>
                                    </g>
                                ))}
                            </svg>

                            {/* Screen Overlays (Top) */}
                            <div className="absolute top-4 left-6 flex items-center gap-6">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block">Reference Level</span>
                                    <span className="text-[18px] font-black text-white">{status?.ref_level || "0.0"} <span className="text-xs opacity-50 font-medium">dBm</span></span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block">Res BW</span>
                                    <span className="text-[18px] font-black text-white">{(status?.rbw / 1e3).toFixed(1) || "100.0"} <span className="text-xs opacity-50 font-medium">kHz</span></span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Info Bar (1:1 Replica) */}
                        <div className="h-16 mt-4 grid grid-cols-4 gap-1 px-4 text-center">
                            <div className="bg-white/5 border border-white/5 rounded-lg flex flex-col justify-center">
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Center Frequency</span>
                                <span className="text-[12px] font-black text-white tracking-widest">{(status?.center / 1e9).toFixed(4) || "1.0000"} GHz</span>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-lg flex flex-col justify-center">
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Span</span>
                                <span className="text-[12px] font-black text-white tracking-widest">{(status?.span / 1e6).toFixed(1) || "10.0"} MHz</span>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-lg flex flex-col justify-center">
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Sweep Time</span>
                                <span className="text-[12px] font-black text-white tracking-widest">20.0 ms</span>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-lg flex flex-col justify-center">
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Detector</span>
                                <span className="text-[12px] font-black text-status-pass tracking-widest uppercase">Auto Peak</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Marker Hub & Advanced Control */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
                <GlassCard level={2} className="p-8 border-white/10 bg-[#0B0F19] flex flex-col h-full">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Marker Hub (X6)</h3>
                        <div className="p-2 bg-accent-blue/10 rounded-lg text-accent-blue">
                            <Target size={20} weight="duotone" />
                        </div>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                        {Array.from({ length: 6 }).map((_, i) => {
                            const marker = markers.find((m: MarkerData) => m.index === i + 1);
                            return (
                                <div 
                                    key={i}
                                    onClick={() => setSelectedMarker(i + 1)}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                                        selectedMarker === i + 1 
                                        ? 'bg-accent-blue/10 border-accent-blue/40' 
                                        : 'bg-white/5 border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[10px] font-black uppercase ${selectedMarker === i + 1 ? 'text-accent-blue' : 'text-text-tertiary'}`}>Marker {i+1}</span>
                                        <div className={`w-1.5 h-1.5 rounded-full ${marker?.active ? 'bg-status-pass' : 'bg-white/10'}`} />
                                    </div>
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-[14px] font-black text-white font-mono">
                                            {marker?.x ? (parseFloat(marker.x)/1e9).toFixed(5) : "---"} <span className="text-[10px] opacity-40">GHz</span>
                                        </span>
                                        <span className="text-[12px] font-bold text-accent-blue-lume">
                                            {marker?.y ? parseFloat(marker.y).toFixed(2) : "---"} <span className="text-[9px] opacity-40 italic">dBm</span>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 space-y-4 pt-6 border-t border-white/5">
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => sendMarkerCmd(selectedMarker, { search_peak: true })}
                                className="flex items-center justify-center gap-2 py-4 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue rounded-xl hover:bg-accent-blue/20 transition-all font-black text-[9px] uppercase tracking-widest"
                            >
                                <MagnifyingGlassPlus weight="bold" />
                                Peak Search
                            </button>
                            <button 
                                onClick={() => sendMarkerCmd(selectedMarker, { state: true })}
                                className="flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-black text-[9px] uppercase tracking-widest"
                            >
                                <Plus weight="bold" />
                                Enable M{selectedMarker}
                            </button>
                        </div>
                        <button className="w-full py-4 bg-status-fail/10 border border-status-fail/30 text-status-fail rounded-xl hover:bg-status-fail/20 transition-all font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2">
                            <Trash weight="bold" />
                            Clear All Markers
                        </button>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};
