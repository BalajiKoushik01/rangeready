import React from 'react';
import { motion } from 'framer-motion';
import { Robot, Sparkle, ChatText } from '@phosphor-icons/react';
import { StatusBadge } from './StatusBadge';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  text: string;
  scpi?: string;
  explanation?: string;
  executed?: boolean;
  healed?: boolean;
  heal_actions?: string[];
  response?: string;
  status?: 'success' | 'healed' | 'warning' | 'fatal' | 'no_driver';
  timestamp: string;
}

interface MessageBubbleProps {
  msg: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ msg }) => {
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

        {/* Reasoning / Explanation (XAI) */}
        {msg.explanation && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2.5 space-y-1">
            <span className="text-[8px] text-amber-500 block uppercase font-black tracking-widest flex items-center gap-1">
              <ChatText size={10} weight="fill" /> AI Technical Reasoning
            </span>
            <p className="text-[10px] text-amber-200/70 italic leading-relaxed">
              "{msg.explanation}"
            </p>
          </div>
        )}

        {/* Hardware response display */}
        {msg.response && msg.role !== 'user' && (
           <div className="bg-status-pass/5 border border-status-pass/20 rounded-xl px-4 py-2">
             <span className="text-[8px] text-status-pass block uppercase tracking-widest mb-0.5">Hardware Response</span>
             <span className="text-[11px] font-mono text-status-pass">{msg.response}</span>
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
});
