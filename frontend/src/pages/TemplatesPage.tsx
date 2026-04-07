import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash, 
  Copy, 
  Waveform, 
  FileText
} from '@phosphor-icons/react';
import { GlassCard } from '../components/ui/GlassCard';

interface TemplateStep {
  name: string;
  measurement_type: string;
  start_freq_hz: number;
  stop_freq_hz: number;
  points: number;
  upper_limit?: number;
  lower_limit?: number;
}

interface TestTemplate {
  id: number;
  name: string;
  description: string;
  steps: TemplateStep[];
  created_at: string;
}

export const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTemplates = () => {
    setLoading(true);
    fetch("http://127.0.0.1:8787/api/templates/")
      .then(res => res.json())
      .then(data => {
        setTemplates(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const deleteTemplate = (id: number) => {
    if (window.confirm("Are you sure you want to delete this blueprint?")) {
      fetch(`http://127.0.0.1:8787/api/templates/${id}`, { method: 'DELETE' })
        .then(() => fetchTemplates());
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight italic uppercase">Blueprints</h1>
          <p className="text-sm text-text-secondary font-black tracking-widest uppercase opacity-60">ISRO-Qualified Test Sequences</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-8 py-4 bg-accent-blue text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-accent-blue/30 hover:bg-accent-blue-lume transition-all active:scale-95"
        >
          <Plus weight="bold" size={20} />
          New Blueprint
        </button>
      </header>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <GlassCard key={i} level={1} className="h-48 animate-pulse bg-white/5 border-white/10">
                <div className="w-full h-full" />
            </GlassCard>
          ))
        ) : templates.length === 0 ? (
          <GlassCard level={1} className="col-span-full py-24 text-center border-dashed border-white/10 opacity-30">
             <div className="inline-flex p-6 rounded-full bg-white/5 text-text-tertiary mb-6">
                <FileText size={64} weight="thin" />
             </div>
             <p className="text-text-secondary font-black uppercase tracking-widest text-sm">No Active Blueprints</p>
             <p className="text-xs text-text-tertiary mt-2">Initialize your first test script to begin the simulation.</p>
          </GlassCard>
        ) : (
          templates.map((template) => (
            <GlassCard key={template.id} level={1} className="p-8 flex flex-col group overflow-hidden border border-white/5">
              <div className="flex items-start justify-between mb-6">
                <div className="p-4 bg-accent-blue/10 text-accent-blue rounded-2xl border border-accent-blue/20 group-hover:scale-110 transition-transform">
                  <Waveform size={28} weight="duotone" />
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-text-tertiary hover:text-text-primary transition-all">
                      <Copy size={20} />
                   </button>
                   <button 
                    onClick={() => deleteTemplate(template.id)}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl text-text-tertiary hover:text-status-fail transition-all"
                   >
                      <Trash size={20} />
                   </button>
                </div>
              </div>
              
              <h3 className="text-xl font-black text-text-primary mb-2 italic uppercase">{template.name}</h3>
              <p className="text-xs text-text-secondary line-clamp-2 mb-8 flex-1 font-medium">{template.description}</p>
              
              <div className="flex items-center justify-between pt-6 border-t border-white/10">
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-status-pass shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-[10px] font-black text-text-tertiary uppercase tracking-wider">
                        {template.steps?.length || 0} Measurement Blocks
                    </span>
                 </div>
                 <button className="text-[10px] font-black text-accent-blue uppercase tracking-widest hover:underline hover:text-accent-blue-lume transition-colors">
                    Edit Script
                 </button>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {/* Blueprint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl">
           <GlassCard level={3} className="w-full max-w-xl p-10 space-y-8 relative border border-white/10 shadow-[0_0_50px_rgba(0,0,0,1)]">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-8 right-8 text-text-tertiary hover:text-white transition-colors uppercase font-black text-[10px] tracking-widest"
              >
                Close
              </button>
              <h2 className="text-3xl font-black text-text-primary italic uppercase underline decoration-accent-blue decoration-4 underline-offset-8">Forge Blueprint</h2>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">Blueprint Identity</label>
                    <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-accent-blue transition-all font-black italic" placeholder="e.g. MISSION_RELIABILITY_V5" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">Mission Description</label>
                    <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white min-h-[120px] focus:outline-none focus:border-accent-blue transition-all font-medium" placeholder="Describe the qualification parameters..." />
                 </div>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                 <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 rounded-2xl text-text-tertiary font-black uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all">Abort</button>
                 <button className="px-10 py-4 bg-accent-blue text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-accent-blue/40 hover:bg-accent-blue-lume transition-all hover:-translate-y-1">Initialize Blueprint</button>
              </div>
           </GlassCard>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;
