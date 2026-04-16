import React from 'react';
import { ChatDots, Robot, Cpu } from '@phosphor-icons/react';

export type HudTab = 'chat' | 'agentic' | 'model';

interface TabNavigationProps {
  activeTab: HudTab;
  setActiveTab: (tab: HudTab) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, setActiveTab }) => {
  const TABS = [
    { id: 'chat' as HudTab,    label: 'Chat',    icon: <ChatDots size={16} weight="duotone" /> },
    { id: 'agentic' as HudTab, label: 'Agentic', icon: <Robot size={16} weight="duotone" /> },
    { id: 'model' as HudTab,   label: 'Model',   icon: <Cpu size={16} weight="duotone" /> },
  ];

  return (
    <div className="flex gap-2 flex-shrink-0">
      {TABS.map(tab => (
        <button 
          key={tab.id} 
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
            activeTab === tab.id
              ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
              : 'bg-white/5 border-white/10 text-text-tertiary hover:border-white/20'
          }`}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
};
