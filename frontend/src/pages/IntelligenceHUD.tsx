/**
 * FILE: pages/IntelligenceHUD.tsx
 * ROLE: Offline AI Interface — Chat, Agentic Control, Model Manager.
 * SOURCE: App Router (/intelligence)
 * TARGET:
 *   GET  /api/ai/status          → polls model state and download progress
 *   POST /api/ai/download        → triggers Gemma-2 model download
 *   POST /api/ai/translate       → natural language → SCPI (no hardware)
 *   POST /api/ai/chat            → general RF domain questions
 *   POST /api/ai/agentic-execute → AI generates SCPI and executes on hardware
 *
 * DESCRIPTION:
 *   This page is the user's window into the offline AI system.
 *   Tabs:
 *     [Chat]     — Type anything. The AI answers RF/SCPI questions.
 *     [Agentic]  — Select hardware + type a command. AI executes it on the instrument.
 *     [Model]    — Download/status panel. Shows model size, load state, download bar.
 *
 * DATA FLOW (Agentic):
 *   User types "Set frequency to 2.4 GHz"
 *   → POST /api/ai/agentic-execute {query, driver_name, address}
 *   → Backend: AI translates → sends SOUR:FREQ:CW 2.4E9 to hardware
 *   → Hardware responds → Negotiation Engine checks SYST:ERR?
 *   → Response appears in chat + in TelemetrySentry bottom-left
 *
 * TRACE:
 *   The "⚡ executed" badge on a message means the command was sent to hardware.
 *   The "🔧 healed" badge means the Negotiation Engine auto-corrected the command.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import {
  Brain, TerminalWindow, Sparkle, Target, Waveform, Lightning,
  DownloadSimple, CheckCircle, Warning, Robot, ChatDots,
  ArrowRight, Cpu, Play, Plug, CircleNotch
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemState } from '../hooks/useSystemState';

const API_BASE = `http://${window.location.hostname}:8787/api`;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface AiStatus {
  model_loaded: boolean;
  is_loading: boolean;
  model_found_on_disk: boolean;
  model_size_mb: number;
  model_filename: string;
  load_error: string | null;
  download: {
    status: 'idle' | 'downloading' | 'complete' | 'error';
    percent: number;
    downloaded_mb: number;
    total_mb: number;
    speed_mbps: number;
    error?: string;
  };
  capabilities: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  text: string;
  scpi?: string;         // Translated SCPI command (if translation mode)
  executed?: boolean;    // True if this was sent to hardware
  healed?: boolean;      // True if Negotiation Engine fixed it
  heal_actions?: string[];
  response?: string;     // Hardware's actual response
  status?: 'success' | 'healed' | 'warning' | 'fatal' | 'no_driver';
  timestamp: string;
}

interface Instrument {
  id: number;
  name: string;
  address: string;
  driver_id: string;
  vendor: string;
  instrument_class: string;
  command_map?: Record<string, string>;
}

type HudTab = 'chat' | 'agentic' | 'model';

// ─────────────────────────────────────────────────────────────────────────────
// QUICK PROMPT SUGGESTIONS
// ─────────────────────────────────────────────────────────────────────────────
const CHAT_SUGGESTIONS = [
  "What SCPI command sets frequency to 2.4 GHz?",
  "Explain the difference between RBW and VBW",
  "How do I calibrate a VNA with SOLT?",
  "What causes gain compression in a PA?",
  "How to configure pulse modulation on Keysight?",
  "What is the SCPI command to query error register?",
];

const AGENTIC_SUGGESTIONS = [
  "Set frequency to 2.4 GHz",
  "Turn on the RF output",
  "Set power level to -20 dBm",
  "Enable AM modulation at 30% depth",
  "Turn off all modulation",
  "Query the current output frequency",
];

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status?: string; healed?: boolean; executed?: boolean }> = ({
  status, healed, executed
}) => {
  if (!status && !executed) return null;
  if (healed) return (
    <span className="inline-flex items-center gap-1 text-[8px] font-black text-amber-400 bg-amber-400/10 rounded-full px-2 py-0.5">
      <Lightning size={9} weight="fill" /> AUTO-HEALED
    </span>
  );
  if (executed && status === 'success') return (
    <span className="inline-flex items-center gap-1 text-[8px] font-black text-status-pass bg-status-pass/10 rounded-full px-2 py-0.5">
      <CheckCircle size={9} weight="fill" /> EXECUTED
    </span>
  );
  if (status === 'fatal' || status === 'warning') return (
    <span className="inline-flex items-center gap-1 text-[8px] font-black text-status-fail bg-status-fail/10 rounded-full px-2 py-0.5">
      <Warning size={9} weight="fill" /> {status?.toUpperCase()}
    </span>
  );
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const MessageBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[9px] text-text-tertiary bg-white/5 rounded-full px-3 py-1 font-mono">
          {msg.text}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      {!isUser && (
        <div className="mr-2 mt-1 p-1.5 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue shrink-0 self-start">
          <Robot size={14} weight="duotone" />
        </div>
      )}

      <div className={`max-w-[82%] space-y-2`}>
        {/* Main text bubble */}
        <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-accent-blue text-white rounded-br-sm shadow-glow-blue'
            : 'bg-white/5 text-text-secondary border border-white/10 rounded-bl-sm'
        }`}>
          {isUser && (
            <span className="block text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">You</span>
          )}
          {!isUser && (
            <span className="flex items-center gap-1 text-[8px] font-black uppercase text-accent-blue tracking-widest mb-1">
              <Sparkle size={9} weight="fill" /> RangeReady AI
            </span>
          )}
          <p className="whitespace-pre-wrap">{msg.text}</p>
        </div>

        {/* SCPI Command display */}
        {msg.scpi && (
          <div className="bg-black/40 border border-accent-blue/20 rounded-xl px-4 py-2.5 font-mono text-[11px] text-accent-blue">
            <span className="text-[8px] text-text-tertiary block mb-1 uppercase tracking-widest">SCPI Command</span>
            {msg.scpi}
          </div>
        )}

        {/* Hardware response display */}
        {msg.response && msg.response !== 'Executed' && (
          <div className="bg-status-pass/5 border border-status-pass/20 rounded-xl px-4 py-2">
            <span className="text-[8px] text-status-pass block uppercase tracking-widest mb-0.5">Hardware Response</span>
            <span className="text-[11px] font-mono text-status-pass">{msg.response}</span>
          </div>
        )}

        {/* Heal actions */}
        {msg.heal_actions && msg.heal_actions.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2 space-y-1">
            <span className="text-[8px] text-amber-400 block uppercase tracking-widest">Auto-Heal Actions</span>
            {msg.heal_actions.map((a, i) => (
              <p key={i} className="text-[10px] text-amber-400/70 font-mono">{a}</p>
            ))}
          </div>
        )}

        {/* Status badges + timestamp */}
        <div className="flex items-center gap-2">
          <StatusBadge status={msg.status} healed={msg.healed} executed={msg.executed} />
          <span className="text-[8px] text-text-tertiary font-mono">
            {msg.timestamp.slice(11, 19)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const IntelligenceHUD: React.FC = () => {
  const { activeBand } = useSystemState();
  const [activeTab, setActiveTab] = useState<HudTab>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '0', role: 'ai', timestamp: new Date().toISOString(),
    text: `RangeReady AI initialized. Active band: ${activeBand}.\n\nI can:\n• Answer RF/SCPI questions\n• Translate natural language to SCPI commands\n• Control your hardware directly in Agentic Mode\n\nType anything to begin, or switch to the Agentic tab to control hardware.`,
  }]);
  const [isThinking, setIsThinking] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Agentic mode state
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [agenticHistory, setAgenticHistory] = useState<ChatMessage[]>([{
    id: 'a0', role: 'ai', timestamp: new Date().toISOString(),
    text: 'Agentic mode ready. Select a connected instrument and describe what you want it to do in plain English. I will translate and execute.',
  }]);

  const conversationHistory = useRef<{role: string; content: string}[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const agenticEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch AI status on mount and poll every 2s during download
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/ai/status`);
        const data: AiStatus = await res.json();
        setAiStatus(data);
        setIsDownloading(data.download.status === 'downloading');
      } catch { /* backend not yet started */ }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 2500);
    return () => clearInterval(interval);
  }, []);

  // ─── Fetch instruments for Agentic selector
  useEffect(() => {
    fetch(`${API_BASE}/instruments/`)
      .then(r => r.json())
      .then(setInstruments)
      .catch(() => {});
  }, []);

  // ─── Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  useEffect(() => {
    agenticEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agenticHistory]);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>, isAgentic = false) => {
    const fullMsg: ChatMessage = { ...msg, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
    if (isAgentic) {
      setAgenticHistory(prev => [...prev, fullMsg]);
    } else {
      setMessages(prev => [...prev, fullMsg]);
    }
    return fullMsg;
  }, []);

  // ─── Chat submit handler
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    const query = input.trim();
    setInput('');

    addMessage({ role: 'user', text: query });
    setIsThinking(true);

    // Add to conversation history for context
    conversationHistory.current.push({ role: 'user', content: query });

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, history: conversationHistory.current.slice(-10) }),
      });
      const data = await res.json();
      const aiReply = data.response || data.command || 'No response.';

      // Check if the AI replied with a SCPI command
      const looksLikeScpi = /^[A-Z:*][A-Z:*]{2,}/.test(aiReply.trim());
      addMessage({
        role: 'ai',
        text: looksLikeScpi ? 'Here is the SCPI command:' : aiReply,
        scpi: looksLikeScpi ? aiReply : undefined,
      });

      conversationHistory.current.push({ role: 'assistant', content: aiReply });
    } catch {
      addMessage({ role: 'ai', text: '❌ Failed to reach AI backend. Is the server running?' });
    } finally {
      setIsThinking(false);
    }
  };

  // ─── Agentic execute handler
  const handleAgenticSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking || !selectedInstrument) return;
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
        text: data.status === 'no_driver'
          ? 'Could not connect to instrument. Check connection and try again.'
          : `Executed on ${selectedInstrument.name}.`,
        scpi: data.translated_command,
        executed: data.status !== 'no_driver',
        healed: (data.heal_actions?.length ?? 0) > 0,
        heal_actions: data.heal_actions || [],
        response: data.response,
        status: data.status,
      }, true);
    } catch (err) {
      addMessage({ role: 'ai', text: `❌ Agentic execution failed: ${err}` }, true);
    } finally {
      setIsThinking(false);
    }
  };

  // ─── Model download handler
  const handleDownload = async () => {
    await fetch(`${API_BASE}/ai/download`, { method: 'POST' });
    setIsDownloading(true);
  };

  const isModelReady = aiStatus?.model_loaded;
  const isModelOnDisk = aiStatus?.model_found_on_disk;
  const downloadPct = aiStatus?.download.percent ?? 0;

  // ─── Tabs definition
  const TABS: { id: HudTab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat',    label: 'Chat',    icon: <ChatDots size={16} weight="duotone" /> },
    { id: 'agentic', label: 'Agentic', icon: <Robot size={16} weight="duotone" /> },
    { id: 'model',   label: 'Model',   icon: <Cpu size={16} weight="duotone" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-20 px-4 relative flex flex-col h-[calc(100vh-140px)]">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-3xl border transition-all ${
            isModelReady
              ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/20 shadow-glow-blue'
              : 'bg-white/5 text-text-tertiary border-white/10'
          }`}>
            <Brain weight="duotone" size={32} className={isModelReady ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight italic uppercase underline decoration-accent-blue decoration-4 underline-offset-8">
              Intelligence HUD
            </h1>
            <p className="text-[10px] text-text-secondary font-black tracking-widest uppercase opacity-60 mt-1">
              Offline AI · {isModelReady ? '🟢 Model Ready' : isModelOnDisk ? '🟡 Loading...' : '🔴 Model Not Downloaded'}
            </p>
          </div>
        </div>

        {/* Model status pill */}
        <div className={`px-4 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${
          isModelReady ? 'bg-status-pass/10 border-status-pass/30 text-status-pass' :
          isDownloading ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' :
          'bg-white/5 border-white/10 text-text-tertiary'
        }`}>
          {isModelReady ? <CheckCircle size={14} weight="fill" /> :
           isDownloading ? <CircleNotch size={14} className="animate-spin" /> :
           <Warning size={14} weight="fill" />}
          {isModelReady ? `${aiStatus?.model_size_mb} MB Loaded` :
           isDownloading ? `Downloading ${downloadPct}%` :
           'No Model'}
        </div>
      </header>

      {/* ─── Tabs ─── */}
      <div className="flex gap-2 flex-shrink-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              activeTab === tab.id
                ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
                : 'bg-white/5 border-white/10 text-text-tertiary hover:border-white/20'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">

          {/* ─── CHAT TAB ─── */}
          {activeTab === 'chat' && (
            <motion.div key="chat"
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="h-full flex flex-col gap-4"
            >
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
                {/* Chat window */}
                <div className="lg:col-span-3 flex flex-col min-h-0 bg-bg-surface/40 backdrop-blur-3xl rounded-3xl border border-glass-border shadow-2xl overflow-hidden">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <AnimatePresence>
                      {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                    </AnimatePresence>
                    {isThinking && (
                      <div className="flex justify-start mb-4">
                        <div className="mr-2 p-1.5 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue">
                          <Robot size={14} weight="duotone" />
                        </div>
                        <div className="px-5 py-3 bg-white/5 rounded-2xl rounded-bl-sm border border-white/10 flex gap-1.5 items-center">
                          {[0, 0.1, 0.2].map((d, i) => (
                            <div key={i} className="w-2 h-2 rounded-full bg-accent-blue animate-bounce"
                              style={{ animationDelay: `${d}s` }} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-glass-border bg-black/20">
                    <form onSubmit={handleChatSubmit} className="flex gap-3">
                      <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                        placeholder={isModelReady ? "Ask anything about RF, SCPI, or instruments..." : "Download the model first to enable AI chat"}
                        disabled={isThinking}
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm focus:outline-none focus:border-accent-blue transition-all placeholder:text-text-tertiary disabled:opacity-50"
                      />
                      <button type="submit" disabled={isThinking || !input.trim()}
                        className="px-6 bg-accent-blue text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-500 transition-all disabled:opacity-40 flex items-center gap-2 text-[10px]">
                        <ArrowRight size={16} />
                      </button>
                    </form>
                  </div>
                </div>

                {/* Suggestions panel */}
                <div className="space-y-3">
                  <GlassCard level={2} className="p-4">
                    <h3 className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Target size={12} className="text-accent-blue" /> Quick Prompts
                    </h3>
                    <div className="space-y-2">
                      {CHAT_SUGGESTIONS.map((s, i) => (
                        <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                          className="w-full text-left text-[9px] text-text-tertiary hover:text-white bg-white/5 hover:bg-white/10 rounded-xl px-3 py-2 transition-all border border-transparent hover:border-white/10">
                          {s}
                        </button>
                      ))}
                    </div>
                  </GlassCard>

                  <GlassCard level={2} className="p-4">
                    <h3 className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-3">
                      Model Info
                    </h3>
                    <div className="space-y-2 text-[9px]">
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Model</span>
                        <span className="text-white font-mono">Gemma-2-2B-IT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Quantization</span>
                        <span className="text-white font-mono">Q4_K_M</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Engine</span>
                        <span className="text-white font-mono">llama.cpp</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Mode</span>
                        <span className="text-status-pass font-mono">CPU · Offline</span>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── AGENTIC TAB ─── */}
          {activeTab === 'agentic' && (
            <motion.div key="agentic"
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="h-full flex flex-col gap-4"
            >
              {/* Instrument selector */}
              <GlassCard level={2} className="p-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <Plug size={20} className="text-accent-blue" weight="duotone" />
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1">
                      Target Instrument
                    </p>
                    <select
                      value={selectedInstrument?.id || ''}
                      onChange={e => {
                        const inst = instruments.find(i => i.id === parseInt(e.target.value));
                        setSelectedInstrument(inst || null);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent-blue transition-all"
                    >
                      <option value="">— Select connected hardware —</option>
                      {instruments.map(inst => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.address}) [{inst.driver_id}]
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedInstrument && (
                    <div className="shrink-0 px-3 py-2 bg-status-pass/10 border border-status-pass/30 rounded-xl text-[9px] text-status-pass font-black">
                      <CheckCircle size={12} className="inline mr-1" weight="fill" />
                      Selected
                    </div>
                  )}
                </div>
                {selectedInstrument && (
                  <div className="mt-3 flex gap-3 text-[9px] text-text-tertiary">
                    <span>Driver: <span className="text-accent-blue font-mono">{selectedInstrument.driver_id}</span></span>
                    <span>Class: <span className="text-white">{selectedInstrument.instrument_class}</span></span>
                    <span>Vendor: <span className="text-white">{selectedInstrument.vendor}</span></span>
                  </div>
                )}
              </GlassCard>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
                {/* Agentic chat window */}
                <div className="lg:col-span-3 flex flex-col min-h-0 bg-bg-surface/40 backdrop-blur-3xl rounded-3xl border border-glass-border shadow-2xl overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <AnimatePresence>
                      {agenticHistory.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                    </AnimatePresence>
                    {isThinking && (
                      <div className="flex justify-start mb-4">
                        <div className="mr-2 p-1.5 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue">
                          <Robot size={14} weight="duotone" />
                        </div>
                        <div className="px-5 py-3 bg-white/5 rounded-2xl rounded-bl-sm border border-white/10 flex gap-1.5 items-center">
                          <Lightning size={14} className="text-accent-blue animate-pulse" />
                          <span className="text-[10px] text-text-tertiary">Translating and executing...</span>
                        </div>
                      </div>
                    )}
                    <div ref={agenticEndRef} />
                  </div>

                  <div className="p-4 border-t border-glass-border bg-black/20">
                    <form onSubmit={handleAgenticSubmit} className="flex gap-3">
                      <input value={input} onChange={e => setInput(e.target.value)}
                        placeholder={
                          !selectedInstrument ? "Select an instrument above first" :
                          !isModelReady ? "Download the AI model first" :
                          "Describe what you want the instrument to do..."
                        }
                        disabled={isThinking || !selectedInstrument || !isModelReady}
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm focus:outline-none focus:border-accent-blue transition-all placeholder:text-text-tertiary disabled:opacity-50"
                      />
                      <button type="submit"
                        disabled={isThinking || !input.trim() || !selectedInstrument || !isModelReady}
                        className="px-6 bg-accent-blue text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-500 transition-all disabled:opacity-40 flex items-center gap-2 text-[10px]">
                        <Play size={16} weight="fill" /> Execute
                      </button>
                    </form>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="space-y-3">
                  <GlassCard level={2} className="p-4">
                    <h3 className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Lightning size={12} className="text-amber-400" weight="fill" /> Agentic Prompts
                    </h3>
                    <div className="space-y-2">
                      {AGENTIC_SUGGESTIONS.map((s, i) => (
                        <button key={i} onClick={() => setInput(s)}
                          className="w-full text-left text-[9px] text-text-tertiary hover:text-white bg-white/5 hover:bg-white/10 rounded-xl px-3 py-2 transition-all border border-transparent hover:border-amber-400/20">
                          {s}
                        </button>
                      ))}
                    </div>
                  </GlassCard>

                  <GlassCard level={2} className="p-4">
                    <h3 className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-2">
                      How Agentic Works
                    </h3>
                    <ol className="space-y-2 text-[9px] text-text-tertiary list-none">
                      {[
                        '1. AI translates your text to SCPI',
                        '2. Command sent to real hardware',
                        '3. Negotiation Engine checks errors',
                        '4. Auto-heals & retries if needed',
                        '5. Hardware response shown here',
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-accent-blue font-black shrink-0">{i + 1}.</span>
                          <span>{step.replace(/^\d+\. /, '')}</span>
                        </li>
                      ))}
                    </ol>
                  </GlassCard>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── MODEL TAB ─── */}
          {activeTab === 'model' && (
            <motion.div key="model"
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="h-full"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
                {/* Model card */}
                <GlassCard level={2} className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`p-4 rounded-2xl ${isModelReady ? 'bg-status-pass/10 text-status-pass border border-status-pass/20' : 'bg-white/5 text-text-tertiary border border-white/10'}`}>
                      <Brain size={28} weight="duotone" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white">Gemma-2-2B-IT</h2>
                      <p className="text-[9px] text-text-tertiary">Q4_K_M · llama.cpp · CPU-only</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {[
                      { label: 'Status', value: isModelReady ? '✅ Loaded & Ready' : isModelOnDisk ? '⏳ On disk, loading...' : '❌ Not downloaded', color: isModelReady ? 'text-status-pass' : 'text-text-tertiary' },
                      { label: 'File', value: aiStatus?.model_filename || '...', color: 'text-white font-mono' },
                      { label: 'Size on Disk', value: aiStatus?.model_size_mb ? `${aiStatus.model_size_mb} MB` : '~1,600 MB (to download)', color: 'text-white' },
                      { label: 'Inference Mode', value: 'CPU · n_threads=4 · air-gapped', color: 'text-white' },
                      { label: 'Context Window', value: '2048 tokens', color: 'text-white' },
                      { label: 'License', value: 'Gemma ToU (research/commercial)', color: 'text-text-tertiary' },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-[10px] text-text-tertiary">{row.label}</span>
                        <span className={`text-[10px] ${row.color}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Download section */}
                  {!isModelReady && (
                    <>
                      {isDownloading ? (
                        <div className="space-y-3">
                          <div className="flex justify-between text-[9px] text-text-tertiary">
                            <span>Downloading Gemma-2...</span>
                            <span>{downloadPct}% · {aiStatus?.download.speed_mbps} MB/s</span>
                          </div>
                          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              animate={{ width: `${downloadPct}%` }}
                              transition={{ type: 'spring', stiffness: 60 }}
                              className="h-full bg-accent-blue rounded-full"
                            />
                          </div>
                          <p className="text-[9px] text-text-tertiary">
                            {aiStatus?.download.downloaded_mb || 0} / {aiStatus?.download.total_mb || 1600} MB
                          </p>
                        </div>
                      ) : (
                        <button onClick={handleDownload}
                          className="w-full flex items-center justify-center gap-3 py-4 bg-accent-blue text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-500 transition-all shadow-glow-blue">
                          <DownloadSimple size={20} weight="bold" />
                          Download Model (~1.6 GB)
                        </button>
                      )}
                      <p className="text-[9px] text-text-tertiary mt-3 text-center">
                        Downloaded once. Runs fully offline forever after.
                      </p>
                    </>
                  )}

                  {isModelReady && (
                    <div className="flex items-center justify-center gap-2 py-3 bg-status-pass/10 rounded-2xl border border-status-pass/20 text-status-pass text-[11px] font-black">
                      <CheckCircle size={18} weight="fill" /> AI Ready · All features enabled
                    </div>
                  )}

                  {aiStatus?.load_error && (
                    <div className="mt-4 p-3 bg-status-fail/10 rounded-xl border border-status-fail/20">
                      <p className="text-[9px] text-status-fail font-mono">{aiStatus.load_error}</p>
                    </div>
                  )}
                </GlassCard>

                {/* Capabilities card */}
                <GlassCard level={2} className="p-8">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">
                    AI Capabilities
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        icon: <ChatDots size={20} weight="duotone" />,
                        title: 'RF Domain Chat',
                        desc: 'Ask any question about RF engineering, SCPI protocol, VNA calibration, spectrum analysis, and instrument setup.',
                        tab: 'chat',
                      },
                      {
                        icon: <TerminalWindow size={20} weight="duotone" />,
                        title: 'SCPI Translation',
                        desc: 'Type natural language. AI outputs the exact SCPI command string for your instrument.',
                        tab: 'chat',
                      },
                      {
                        icon: <Robot size={20} weight="duotone" />,
                        title: 'Agentic Hardware Control',
                        desc: 'In Agentic mode, AI translates your command AND executes it directly on the connected hardware, resolving errors automatically.',
                        tab: 'agentic',
                      },
                      {
                        icon: <Lightning size={20} weight="duotone" />,
                        title: 'AI-Assisted Error Healing',
                        desc: 'If the SCPI Negotiation Engine exhausts all static strategies, the AI provides a context-aware fix using instrument IDN and error code.',
                        tab: null,
                      },
                    ].map((cap, i) => (
                      <div key={i} className="flex gap-3 p-4 rounded-2xl border border-white/5 bg-white/5 hover:border-white/10 transition-all">
                        <div className="text-accent-blue shrink-0 mt-0.5">{cap.icon}</div>
                        <div>
                          <p className="text-[11px] font-black text-white mb-1">{cap.title}</p>
                          <p className="text-[10px] text-text-tertiary leading-relaxed">{cap.desc}</p>
                          {cap.tab && (
                            <button onClick={() => setActiveTab(cap.tab as HudTab)}
                              className="mt-2 text-[9px] text-accent-blue font-black uppercase hover:underline">
                              Open {cap.tab} tab →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default IntelligenceHUD;
