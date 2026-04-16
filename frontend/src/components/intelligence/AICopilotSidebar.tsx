import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ChevronRight, MessageSquare, Terminal, Cpu } from 'lucide-react';
import { useSystemState } from '../../hooks/useSystemState';
import { ChatTab } from './tabs/ChatTab';
import { AgenticTab } from './tabs/AgenticTab';
import { ModelTab } from './tabs/ModelTab';
import { StatusHeader } from './StatusHeader';
import type { AiStatus } from './StatusHeader';
import type { ChatMessage } from './shared/MessageBubble';

const API_BASE = `http://${globalThis.location.hostname}:8787/api`;

export const AICopilotSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { activeBand } = useSystemState();
  const [activeTab, setActiveTab] = useState<'chat' | 'agentic' | 'model'>('chat');
  const [input, setInput] = useState('');
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agenticHistory, setAgenticHistory] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [instruments, setInstruments] = useState<any[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<any | null>(null);

  const conversationHistory = useRef<{role: string; content: string}[]>([]);

  useEffect(() => {
    setMessages([{ 
      id: 'sidebar-init-chat', role: 'ai', timestamp: new Date().toISOString(), 
      text: `Copilot active. How can I help with your ${activeBand} calibration today?` 
    }]);
    setAgenticHistory([{ 
      id: 'sidebar-init-agentic', role: 'ai', timestamp: new Date().toISOString(), 
      text: 'Agentic Mode: I can control your hardware directly. Select an instrument to begin.' 
    }]);
  }, [activeBand]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/ai/status`);
        const data = await res.json();
        setAiStatus(data);
      } catch { }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/instruments/`)
      .then(r => r.json())
      .then(data => {
        setInstruments(data);
        if (data.length > 0 && !selectedInstrument) {
          setSelectedInstrument(data[0]);
        }
      })
      .catch(() => {});
  }, [selectedInstrument]);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>, isAgentic = false) => {
    const fullMsg: ChatMessage = { 
        ...msg, 
        id: crypto.randomUUID(), 
        timestamp: new Date().toISOString() 
    } as ChatMessage;
    if (isAgentic) {
      setAgenticHistory(prev => [...prev, fullMsg]);
    } else {
      setMessages(prev => [...prev, fullMsg]);
    }
  }, []);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking || !aiStatus?.model_loaded) return;
    const query = input.trim();
    setInput('');
    addMessage({ role: 'user', text: query });
    setIsThinking(true);
    conversationHistory.current.push({ role: 'user', content: query });

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, history: conversationHistory.current.slice(-10) }),
      });
      const data = await res.json();
      const aiReply = data.response || data.command || 'No response.';
      const looksLikeScpi = /^[A-Z:*][A-Z:*]{2,}/.test(aiReply.trim());

      addMessage({
        role: 'ai',
        text: looksLikeScpi ? 'Generated SCPI:' : aiReply,
        scpi: looksLikeScpi ? aiReply : undefined,
      });
      conversationHistory.current.push({ role: 'assistant', content: aiReply });
    } catch {
      addMessage({ role: 'ai', text: '❌ Backend connection lost.' });
    } finally {
      setIsThinking(false);
    }
  };

  const handleAgenticSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking || !selectedInstrument || !aiStatus?.model_loaded) return;
    const query = input.trim();
    setInput('');
    addMessage({ role: 'user', text: query }, true);
    setIsThinking(true);

    try {
      const res = await fetch(`${API_BASE}/ai/agentic-execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          driver_name: selectedInstrument.driver_id,
          address: selectedInstrument.address,
          simulation: false,
          command_map: selectedInstrument.command_map || {},
        }),
      });
      const data = await res.json();

      addMessage({
        role: 'ai',
        text: data.status === 'no_driver' ? 'Hardware unreachable.' : `Agentic result for ${selectedInstrument.name}:`,
        scpi: data.translated_command,
        executed: data.status !== 'no_driver',
        healed: (data.heal_actions?.length ?? 0) > 0,
        response: data.response,
        status: data.status,
        explanation: data.explanation,
      }, true);
    } catch (err) {
      addMessage({ role: 'ai', text: `❌ Agentic error: ${err}` }, true);
    } finally {
      setIsThinking(false);
    }
  };

  const isModelReady = !!aiStatus?.model_loaded;

  useEffect(() => {
    const handleGlobalTrigger = (e: any) => {
      const { query, tab } = e.detail || {};
      setIsOpen(true);
      if (tab) setActiveTab(tab);
      if (query) setInput(query);
    };

    window.addEventListener('RANGE_READY_AICOPILOT_TRIGGER', handleGlobalTrigger);
    return () => window.removeEventListener('RANGE_READY_AICOPILOT_TRIGGER', handleGlobalTrigger);
  }, []);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-1/2 -translate-y-1/2 right-0 z-50 p-2 bg-accent-blue text-white rounded-l-xl shadow-2xl transition-all hover:pr-4 ${isOpen ? 'right-[400px]' : 'right-0'}`}
      >
        {isOpen ? <ChevronRight size={24} /> : (
          <div className="flex flex-col items-center gap-2">
            <Bot size={24} className="animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest [writing-mode:vertical-lr]">Copilot</span>
          </div>
        )}
      </button>

      {/* Sidebar Panel */}
      <motion.div
        initial={false}
        animate={{ x: isOpen ? 0 : 400 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-screen w-[400px] bg-bg-card border-l border-border-base z-40 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col"
      >
        <div className="p-4 border-b border-border-base flex items-center justify-between bg-bg-base/50">
          <div className="flex items-center gap-2">
            <Bot className="text-accent-blue" size={20} />
            <h2 className="font-bold text-text-main uppercase tracking-tighter">AI Copilot Intelligence</h2>
          </div>
          <StatusHeader aiStatus={aiStatus} />
        </div>

        {/* Mini Tab Navigation */}
        <div className="flex p-2 gap-1 bg-bg-base/30">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${activeTab === 'chat' ? 'bg-accent-blue text-white' : 'text-text-muted hover:bg-white/5'}`}
          >
            <MessageSquare size={16} />
            <span className="text-xs font-medium">Chat</span>
          </button>
          <button 
            onClick={() => setActiveTab('agentic')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${activeTab === 'agentic' ? 'bg-accent-purple text-white' : 'text-text-muted hover:bg-white/5'}`}
          >
            <Terminal size={16} />
            <span className="text-xs font-medium">Agentic</span>
          </button>
          <button 
            onClick={() => setActiveTab('model')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${activeTab === 'model' ? 'bg-accent-green text-white' : 'text-text-muted hover:bg-white/5'}`}
          >
            <Cpu size={16} />
            <span className="text-xs font-medium">Brain</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <ChatTab 
                  messages={messages}
                  input={input}
                  setInput={setInput}
                  isThinking={isThinking}
                  isModelReady={isModelReady}
                  handleChatSubmit={handleChatSubmit}
                />
              </motion.div>
            )}

            {activeTab === 'agentic' && (
              <motion.div 
                key="agentic"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <AgenticTab 
                  agenticHistory={agenticHistory}
                  input={input}
                  setInput={setInput}
                  isThinking={isThinking}
                  isModelReady={isModelReady}
                  instruments={instruments}
                  selectedInstrument={selectedInstrument}
                  setSelectedInstrument={setSelectedInstrument}
                  handleAgenticSubmit={handleAgenticSubmit}
                />
              </motion.div>
            )}

            {activeTab === 'model' && (
              <motion.div 
                key="model"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <ModelTab 
                  aiStatus={aiStatus}
                  isModelReady={isModelReady}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};
