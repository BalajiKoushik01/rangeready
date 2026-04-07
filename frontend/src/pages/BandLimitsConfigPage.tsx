import React from 'react';

const BandLimitsConfigPage: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-light text-white mb-6 tracking-wide drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]">Band & Limits Configuration</h1>
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-white text-sm">
        <p className="mb-4">Select Band Profile</p>
        <select className="w-full bg-black/50 border border-white/20 rounded p-2 mb-6">
          <option>S-Band (2-4 GHz)</option>
          <option>X-Band (8-12 GHz)</option>
        </select>
        
        <p className="mb-4">Pass/Fail Limits</p>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/20">
              <th className="py-2">Parameter</th>
              <th className="py-2">Min Limit</th>
              <th className="py-2">Max Limit</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/10">
              <td className="py-2">Transmit Gain</td>
              <td className="py-2"><input type="text" defaultValue="20.0" className="bg-black/50 border border-white/20 rounded p-1 w-20 text-center" /> dB</td>
              <td className="py-2"><input type="text" defaultValue="25.0" className="bg-black/50 border border-white/20 rounded p-1 w-20 text-center" /> dB</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-2">Noise Figure</td>
              <td className="py-2"><input type="text" defaultValue="" className="bg-black/50 border border-white/20 rounded p-1 w-20 text-center" /> dB</td>
              <td className="py-2"><input type="text" defaultValue="3.5" className="bg-black/50 border border-white/20 rounded p-1 w-20 text-center" /> dB</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BandLimitsConfigPage;
