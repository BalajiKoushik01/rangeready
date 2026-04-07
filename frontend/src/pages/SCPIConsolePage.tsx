import React from 'react';
import { GlassConsole } from '../components/ui/GlassConsole';

const SCPIConsolePage: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-light text-white mb-6 tracking-wide drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]">SCPI Glass Console</h1>
      <div className="absolute top-0 right-0 h-full">
        <GlassConsole isOpen={true} onClose={() => {}} />
      </div>
    </div>
  );
};

export default SCPIConsolePage;
