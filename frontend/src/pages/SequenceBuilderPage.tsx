import { type FC, useState } from 'react';

const SequenceBuilderPage: FC = () => {
  const [steps] = useState([
    { id: 1, type: 'INSTRUMENT_CONFIG', label: 'Set S-Band Center Frequency' },
    { id: 2, type: 'DUT_COMMAND', label: 'Set TRM to TX Mode' },
    { id: 3, type: 'WAIT', label: 'Dwell 1000ms' },
    { id: 4, type: 'MEASURE', label: 'Measure TX Output Power' }
  ]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-light text-white mb-6 tracking-wide drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]">Sequence Builder</h1>
      <div className="flex gap-6">
        {/* Tool Palette */}
        <div className="w-64 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-white text-sm">
          <h3 className="font-semibold mb-4 text-white/90">Add Step</h3>
          <div className="space-y-2">
            <button className="w-full text-left bg-blue-900/40 hover:bg-blue-800/60 border border-blue-500/30 p-2 rounded transition-colors">+ Config Instrument</button>
            <button className="w-full text-left bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 p-2 rounded transition-colors">+ DUT Command</button>
            <button className="w-full text-left bg-green-900/40 hover:bg-green-800/60 border border-green-500/30 p-2 rounded transition-colors">+ Measure</button>
            <button className="w-full text-left bg-orange-900/40 hover:bg-orange-800/60 border border-orange-500/30 p-2 rounded transition-colors">+ Wait/Dwell</button>
          </div>
        </div>
        
        {/* Sequence List */}
        <div className="flex-1 space-y-3">
          {steps.map((step, idx) => (
            <div key={step.id} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center shadow-lg">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-white mr-4">
                {idx + 1}
              </div>
              <div className="flex-1">
                <span className="text-xs font-mono text-blue-400 mb-1 block">{step.type}</span>
                <span className="text-white font-medium">{step.label}</span>
              </div>
              <button className="text-red-400 hover:text-red-300 ml-4">Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SequenceBuilderPage;
