import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Robot, ArrowRight, Target } from '@phosphor-icons/react';
import { GlassCard } from '../../ui/GlassCard';
import { MessageBubble } from '../shared/MessageBubble';
import type { ChatMessage } from '../shared/MessageBubble';

interface ChatTabProps {
  messages: ChatMessage[];
  input: string;
  setInput: (val: string) => void;
  isThinking: boolean;
  isModelReady: boolean;
  handleChatSubmit: (e: React.FormEvent) => void;
}

const CHAT_SUGGESTIONS = [
  "What SCPI command sets frequency to 2.4 GHz?",
  "Explain the difference between RBW and VBW",
  "How do I calibrate a VNA with SOLT?",
  "What causes gain compression in a PA?",
  "How to configure pulse modulation on Keysight?",
  "What is the SCPI command to query error register?",
];

export const ChatTab: React.FC<ChatTabProps> = ({
  messages, input, setInput, isThinking, isModelReady, handleChatSubmit
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <motion.div 
      key="chat"
      initial={{ opacity: 0, x: -10 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0 }}
      className="h-full flex flex-col gap-4"
    >
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Chat window */}
        <div className="lg:col-span-3 flex flex-col min-h-0 bg-bg-surface/40 backdrop-blur-3xl rounded-3xl border border-glass-border shadow-2xl overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
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
                    <div 
                      key={i} 
                      className="w-2 h-2 rounded-full bg-accent-blue animate-bounce"
                      style={{ animationDelay: `${d}s` }} 
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-glass-border bg-black/20">
            <form onSubmit={handleChatSubmit} className="flex gap-3">
              <input 
                ref={inputRef} 
                value={input} 
                onChange={e => setInput(e.target.value)}
                placeholder={isModelReady ? "Ask anything about RF, SCPI, or instruments..." : "Download the model first to enable AI chat"}
                disabled={isThinking}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm focus:outline-none focus:border-accent-blue transition-all placeholder:text-text-tertiary disabled:opacity-50"
              />
              <button 
                type="submit" 
                disabled={isThinking || !input.trim()}
                className="px-6 bg-accent-blue text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-500 transition-all disabled:opacity-40 flex items-center gap-2 text-[10px]"
              >
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
                <button 
                  key={i} 
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="w-full text-left text-[9px] text-text-tertiary hover:text-white bg-white/5 hover:bg-white/10 rounded-xl px-3 py-2 transition-all border border-transparent hover:border-white/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard level={2} className="p-4">
            <h3 className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-3">Model Capabilities</h3>
            <ul className="text-[9px] text-text-tertiary space-y-1.5 list-none">
              <li className="flex items-center gap-2">🟢 RF Physics & Lab Methods</li>
              <li className="flex items-center gap-2">🟢 Keysight/R&S/Anritsu SCPI</li>
              <li className="flex items-center gap-2">🟢 VNA & Signal Gen Expert</li>
              <li className="flex items-center gap-2">🟢 Autonomous Self-Healing</li>
            </ul>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
};
