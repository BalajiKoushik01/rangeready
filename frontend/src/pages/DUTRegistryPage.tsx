import React from 'react';

const DUTRegistryPage: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-light text-white mb-6 tracking-wide drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]">DUT Registry</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-white text-sm">
          <h2 className="text-xl mb-4 font-semibold text-white/90">Register New DUT</h2>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 text-white/70">Serial Number</label>
              <input type="text" className="w-full bg-black/50 border border-white/20 rounded p-2" placeholder="e.g. SN-00123" />
            </div>
            <div>
              <label className="block mb-1 text-white/70">Module Type</label>
              <select className="w-full bg-black/50 border border-white/20 rounded p-2">
                <option>TRM-S-BAND-V2</option>
                <option>TRM-X-BAND-V1</option>
              </select>
            </div>
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium transition-colors">
              Register DUT
            </button>
          </div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-white text-sm">
          <h2 className="text-xl mb-4 font-semibold text-white/90">Recent Registrations</h2>
          <ul className="space-y-2">
            <li className="flex justify-between border-b border-white/10 pb-2">
              <span>SN-00122</span>
              <span className="text-white/50">1 hour ago</span>
            </li>
            <li className="flex justify-between border-b border-white/10 pb-2">
              <span>SN-00121</span>
              <span className="text-white/50">2 hours ago</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DUTRegistryPage;
