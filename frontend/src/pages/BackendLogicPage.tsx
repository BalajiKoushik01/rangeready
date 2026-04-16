/**
 * FILE: pages/BackendLogicPage.tsx
 * ROLE: Technical Logic & Orchestration Dashboard.
 * TRACE: [App.tsx] -> [This Page] -> [BackendCockpit.tsx]
 */

import React from 'react';
import { BackendCockpit } from '../components/ui/BackendCockpit';
import { Terminal, Cpu } from '@phosphor-icons/react';

export const BackendLogicPage: React.FC = () => {
    return (
        <div className="max-w-screen-2xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-white/10 pb-8">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-accent-blue/10 rounded-2xl border border-accent-blue/20 text-accent-blue shadow-glow-blue">
                        <Cpu size={36} weight="duotone" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                            Backend Logic Cockpit
                        </h1>
                        <p className="text-[10px] text-text-tertiary font-black tracking-widest uppercase mt-1 flex items-center gap-2">
                            <Terminal size={14} className="text-accent-blue" /> 
                            Industrial Orchestration · Service Matrix · Predictive Diagnostics
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                     <div className="px-5 py-2.5 bg-[#0b0f19] border border-white/5 rounded-2xl flex flex-col items-end">
                         <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Logic Version</span>
                         <span className="text-xs font-black text-white">V5.1.0-IND</span>
                     </div>
                </div>
            </div>

            {/* Main Cockpit Component */}
            <BackendCockpit />
        </div>
    );
};

export default BackendLogicPage;
