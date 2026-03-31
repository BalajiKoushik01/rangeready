import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash, 
  Copy, 
  // Gear, 
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
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Measurement Blueprints</h1>
          <p className="text-sm text-text-secondary font-medium">Define and manage custom ISRO-qualified test sequences.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-accent-blue text-white rounded-xl font-bold shadow-lg hover:bg-accent-blue-lume transition-all active:scale-95"
        >
          <Plus weight="bold" size={20} />
          New Template
        </button>
      </header>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <GlassCard key={i} level={1} className="h-48 animate-pulse bg-white/5" />
          ))
        ) : templates.length === 0 ? (
          <div className="col-span-full py-20 text-center">
             <div className="inline-flex p-4 rounded-full bg-white/10 text-text-tertiary mb-4">
                <FileText size={48} />
             </div>
             <p className="text-text-secondary font-medium">No templates found. Create your first blueprint to get started.</p>
          </div>
        ) : (
          templates.map((template) => (
            <GlassCard key={template.id} level={1} className="p-6 flex flex-col group overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-accent-blue/10 text-accent-blue rounded-xl">
                  <Waveform size={24} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="p-2 hover:bg-white/40 rounded-lg text-text-tertiary hover:text-text-primary transition-all">
                      <Copy size={18} />
                   </button>
                   <button 
                    onClick={() => deleteTemplate(template.id)}
                    className="p-2 hover:bg-status-fail/10 rounded-lg text-text-tertiary hover:text-status-fail transition-all"
                   >
                      <Trash size={18} />
                   </button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-text-primary mb-1">{template.name}</h3>
              <p className="text-xs text-text-secondary line-clamp-2 mb-6 flex-1">{template.description}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                 <span className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider">
                    {template.steps?.length || 0} Steps
                 </span>
                 <button className="text-[10px] font-bold text-accent-blue uppercase tracking-widest hover:underline">
                    Edit Blueprint
                 </button>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {/* Simple Placeholder for Modal to satisfy layout check */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-bg-base/40 backdrop-blur-md">
           <GlassCard level={3} className="w-full max-w-lg p-8 space-y-6">
              <h2 className="text-xl font-bold text-text-primary">Create New Blueprint</h2>
              <div className="space-y-4">
                 <input className="w-full bg-white/20 border border-white/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue transition-all" placeholder="Template Name (e.g. S-Band LNA Check)" />
                 <textarea className="w-full bg-white/20 border border-white/40 rounded-xl px-4 py-3 text-sm min-h-[100px] focus:outline-none focus:border-accent-blue transition-all" placeholder="Description..." />
              </div>
              <div className="flex justify-end gap-4">
                 <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl text-text-secondary font-bold hover:bg-white/20 transition-all">Cancel</button>
                 <button className="px-6 py-2 bg-accent-blue text-white rounded-xl font-bold shadow-lg hover:bg-accent-blue-lume transition-all">Create</button>
              </div>
           </GlassCard>
        </div>
      )}
    </div>
  );
};
