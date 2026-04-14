/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Power, CheckCircle } from '@phosphor-icons/react';

interface KeysightProps {
    status?: any;
}

export const KeysightSigGenReplica: React.FC<KeysightProps> = ({ status }) => {
    const [lastAction, setLastAction] = useState<string>("Ready");

    const sendControl = async (command: string, params: any) => {
        setLastAction(`Updating ${command}...`);
        try {
            const res = await fetch(`http://${window.location.hostname}:8787/api/instrument-control/siggen/${command}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            if (res.ok) setLastAction(`${command} Updated!`);
        } catch {
            setLastAction("Comm Error");
        }
    };

    const toggleMod = (type: string) => {
        sendControl('modulation', { state: !status?.mod_state, type });
    };

    return (
        <div className="grid grid-cols-12 gap-8 h-full">
            {/* Main Instrument Display (The "Faceplate") */}
            <div className="col-span-12 lg:col-span-9">
                <div className="relative p-1 bg-[#1a202c] rounded-[2.5rem] border-[12px] border-[#2D3748] shadow-2xl overflow-hidden aspect-[16/9]">
                    {/* The Blue LCD Screen */}
                    <div className="w-full h-full bg-[#000080] rounded-[1.5rem] p-8 flex flex-col relative shadow-inner">
                        {/* LCD Grid/Noise Overlay */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:4px_4px]" />
                        
                        {/* LCD Header Strip */}
                        <div className="flex items-center justify-between border-b border-white/20 pb-4 mb-8">
                            <span className="text-[14px] font-bold text-white/50 tracking-widest uppercase">Keysight N5172B EXG</span>
                            <div className="flex items-center gap-4">
                                <span className={`text-[12px] font-black tracking-widest px-3 py-1 rounded-md border ${status?.rf_state ? 'bg-white text-blue-900 border-white' : 'text-white/20 border-white/20'}`}>RF ON</span>
                                <span className={`text-[12px] font-black tracking-widest px-3 py-1 rounded-md border ${status?.mod_state ? 'bg-white text-blue-900 border-white' : 'text-white/20 border-white/20'}`}>MOD ON</span>
                            </div>
                        </div>

                        {/* Central Telemetry (Large Digits) */}
                        <div className="flex-1 flex flex-col justify-center space-y-12">
                            <div className="space-y-2">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-[12px] font-black text-white/40 uppercase tracking-widest">Frequency</span>
                                    <span className="text-[12px] font-black text-accent-blue-lume animate-pulse italic">Locked</span>
                                </div>
                                <div className="text-[7rem] font-black text-white tracking-tighter leading-none font-mono drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                    {status?.freq ? (parseFloat(status.freq)/1e6).toFixed(3) : "1000.000"} <span className="text-4xl">MHz</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-[12px] font-black text-white/40 uppercase tracking-widest">Amplitude</span>
                                    <span className="text-[12px] font-black text-white/40 uppercase tracking-widest italic">ALC ON</span>
                                </div>
                                <div className="text-[5rem] font-black text-white tracking-tighter leading-none font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                    {status?.power || "-20.00"} <span className="text-3xl font-light opacity-50">dBm</span>
                                </div>
                            </div>
                        </div>

                        {/* Right-Side Softkeys (Virtual) */}
                        <div className="absolute top-0 right-0 h-full w-48 border-l border-white/10 p-4 flex flex-col justify-around bg-black/10 backdrop-blur-sm">
                            {['Frequency', 'Amplitude', 'Pulse Gen', 'Modulation', 'LF Output', 'ARB Setup'].map((label, i) => (
                                <button key={i} className="group flex flex-col items-end gap-1 outline-none">
                                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter group-hover:text-white transition-colors">Softkey {i+1}</span>
                                    <div className="px-4 py-2 border-r-4 border-accent-blue bg-white/5 text-[11px] font-black text-white uppercase tracking-widest group-hover:bg-accent-blue/20 transition-all text-right w-full">
                                        {label}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional "Advanced" Controls (Modern UI) */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
                <GlassCard level={2} className="p-8 border-white/10 bg-[#0B0F19]">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Hardware Controls</h3>
                       <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-status-pass animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[8px] font-black text-white/50 uppercase">Connected</span>
                       </div>
                    </div>

                    <div className="space-y-4">
                        <button 
                            onClick={() => sendControl('modulation', { state: !status?.rf_state, type: 'RF' })}
                            className={`w-full py-6 rounded-2xl border flex flex-col items-center gap-3 transition-all ${
                                status?.rf_state 
                                ? 'bg-status-fail/10 border-status-fail/30 text-status-fail' 
                                : 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
                            }`}
                        >
                            <Power size={32} weight="duotone" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {status?.rf_state ? "Disable RF Output" : "Enable RF Output"}
                            </span>
                        </button>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => toggleMod('AM')} className="p-4 bg-white/5 border border-white/5 rounded-xl text-center hover:bg-white/10 transition-colors">
                                <span className="block text-[14px] font-black text-white">AM</span>
                                <span className="text-[8px] font-bold text-text-tertiary uppercase">Toggle</span>
                            </button>
                            <button onClick={() => toggleMod('FM')} className="p-4 bg-white/5 border border-white/5 rounded-xl text-center hover:bg-white/10 transition-colors">
                                <span className="block text-[14px] font-black text-white">FM</span>
                                <span className="text-[8px] font-bold text-text-tertiary uppercase">Toggle</span>
                            </button>
                        </div>

                        <div className="p-6 bg-black/20 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-text-tertiary uppercase tracking-wider">Pulse Modulation</span>
                                <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${status?.mod_state ? 'bg-status-pass/20 text-status-pass' : 'bg-white/10 text-white/30'}`}>
                                    {status?.mod_state ? 'ACTIVE' : 'IDLE'}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 space-y-1">
                                    <span className="block text-[8px] font-bold text-text-tertiary uppercase">Period</span>
                                    <input type="text" placeholder="10ms" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-[12px] font-mono outline-none focus:border-accent-blue" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <span className="block text-[8px] font-bold text-text-tertiary uppercase">Width</span>
                                    <input type="text" placeholder="1ms" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-[12px] font-mono outline-none focus:border-accent-blue" />
                                </div>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                <div className="p-8 bg-black/40 border border-white/5 rounded-[2.5rem] flex items-center justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/5 to-transparent pointer-events-none" />
                    <div>
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-[.2em] mb-1">Last Action</p>
                        <p className="text-[12px] font-black text-white uppercase tracking-widest">{lastAction}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-accent-blue border border-white/10 group-hover:scale-110 transition-transform">
                        <CheckCircle weight="duotone" size={24} />
                    </div>
                </div>
            </div>
        </div>
    );
};
