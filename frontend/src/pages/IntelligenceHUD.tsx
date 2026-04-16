/**
 * FILE: pages/IntelligenceHUD.tsx
 * ROLE: Modular Intelligence HUD Orchestrator.
 * DESCRIPTION:
 *   Parent component that manages the AI state and coordinates the 
 *   modular sub-components (Chat, Agentic Control, Model Management).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSystemState } from '../hooks/useSystemState';

// Modular Components
import { StatusHeader } from '../components/intelligence/StatusHeader';
import type { AiStatus } from '../components/intelligence/StatusHeader';
import { TabNavigation } from '../components/intelligence/TabNavigation';
import type { HudTab } from '../components/intelligence/TabNavigation';
import { ChatTab } from '../components/intelligence/tabs/ChatTab';
import { AgenticTab } from '../components/intelligence/tabs/AgenticTab';
import { ModelTab } from '../components/intelligence/tabs/ModelTab';
import type { ChatMessage } from '../components/intelligence/shared/MessageBubble';

const API_BASE = `http://${globalThis.location.hostname}:8787/api`;

export const IntelligenceHUD: React.FC = () => {
  const { activeBand } = useSystemState();
  const [activeTab, setActiveTab] = useState<HudTab>('chat');
  const [input, setInput] = useState('');
  
  // State 
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agenticHistory, setAgenticHistory] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [instruments, setInstruments] = useState<any[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<any | null>(null);

  const conversationHistory = useRef<{role: string; content: string}[]>([]);

  // 1. Initial Greetings
  useEffect(() => {
    setMessages([{ 
      id: 'init-chat', role: 'ai', timestamp: new Date().toISOString(), 
      text: `RangeReady AI active for ${activeBand}. I am trained on your codebase and industry SCPI standards.` 
    }]);
    setAgenticHistory([{ 
      id: 'init-agentic', role: 'ai', timestamp: new Date().toISOString(), 
      text: 'Supervised Agentic Mode ready. Describe a hardware target state to begin.' 
    }]);
  }, [activeBand]);

  // 2. Persistent Polling (AI Engine)
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/ai/status`);
        const data = await res.json();
        setAiStatus(data);
      } catch { /* Backend disconnected */ }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // 3. Fetch Hardware Inventory
  useEffect(() => {
    fetch(`${API_BASE}/instruments/`)
      .then(r => r.json())
      .then(setInstruments)
      .catch(() => {});
  }, []);

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
    return fullMsg;
  }, []);

  // 4. Handlers
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
        text: looksLikeScpi ? 'Generated Translation:' : aiReply,
        scpi: looksLikeScpi ? aiReply : undefined,
      });
      conversationHistory.current.push({ role: 'assistant', content: aiReply });
    } catch {
      addMessage({ role: 'ai', text: '❌ Backend connection failed.' });
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
        text: data.status === 'no_driver' ? 'Hardware unreachable.' : `Execution summary for ${selectedInstrument.name}:`,
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

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-20 px-4 relative flex flex-col h-[calc(100vh-140px)]">
      <StatusHeader aiStatus={aiStatus} />
      
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <ChatTab 
              messages={messages}
              input={input}
              setInput={setInput}
              isThinking={isThinking}
              isModelReady={isModelReady}
              handleChatSubmit={handleChatSubmit}
            />
          )}

          {activeTab === 'agentic' && (
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
          )}

          {activeTab === 'model' && (
            <ModelTab 
              aiStatus={aiStatus}
              isModelReady={isModelReady}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
