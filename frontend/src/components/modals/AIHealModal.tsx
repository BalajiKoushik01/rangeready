/**
 * FILE: components/modals/AIHealModal.tsx
 * ROLE: Supervised AI Permission Interface (XAI).
 * TRACE: [Telemetry Proposal] -> [This Modal] -> [POST /api/ai/confirm-heal]
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Warning, CheckCircle, Lightning, Code, Sparkle, ChatText } from '@phosphor-icons/react';
import type { TelemetryPacket } from '../../hooks/useTelemetry';

interface Props {
  proposal: TelemetryPacket;
  onResolve: (approved: boolean) => void;
}

export const AIHealModal: React.FC<Props> = ({ proposal, onResolve }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async (approved: boolean) => {
    setIsSubmitting(true);
    try {
      const API_BASE = `http://${globalThis.location.hostname}:8787/api`;
      await fetch(`${API_BASE}/ai/confirm-heal/${proposal.proposal_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved })
      });
      onResolve(approved);
    } catch (err) {
      console.error("Failed to send approval", err);
      onResolve(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-[#0f1118]/90 border border-amber-500/30 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(245,158,11,0.15)]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/20 to-transparent p-8 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/30 shadow-glow-amber">
              <Brain size={32} weight="duotone" className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                AI Permission Required
              </h2>
              <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest flex items-center gap-1">
                <Sparkle size={12} weight="fill" /> Supervised Autonomy Mode
              </p>
            </div>
          </div>
          <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 text-[10px] font-mono text-text-tertiary">
            ID: {proposal.proposal_id}
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* THE PROBLEM */}
          <section className="space-y-2">
            <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
              <Warning size={14} className="text-status-fail" /> The Problem
            </h3>
            <div className="p-5 bg-status-fail/5 border border-status-fail/20 rounded-2xl space-y-3">
              <div className="flex justify-between items-start">
                  <span className="text-xs text-text-secondary">Hardware Error:</span>
                  <span className="text-xs font-mono text-status-fail">{proposal.packet}</span>
              </div>
              <div className="flex justify-between items-start">
                  <span className="text-xs text-text-secondary">Failing Command:</span>
                  <span className="text-xs font-mono text-white/50">{proposal.original_cmd}</span>
              </div>
            </div>
          </section>

          {/* THE LOGIC (XAI) */}
          <div className="grid grid-cols-2 gap-4">
            <section className="space-y-2">
              <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
                <ChatText size={14} className="text-accent-blue" /> AI Engineering Reasoning
              </h3>
              <div className="p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-2xl h-full">
                <p className="text-xs text-text-secondary leading-relaxed italic">
                  "{proposal.explanation}"
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
                <Lightning size={14} className="text-status-pass" /> Expected Impact
              </h3>
              <div className="p-4 bg-status-pass/5 border border-status-pass/20 rounded-2xl h-full">
                <p className="text-xs text-text-secondary leading-relaxed serif">
                  {proposal.impact || "Restores system compliance with hardware protocol."}
                </p>
              </div>
            </section>
          </div>

          {/* THE SOLUTION */}
          <section className="space-y-2">
            <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
              <Code size={14} className="text-status-pass" /> Proposed Solution
            </h3>
            <div className="p-6 bg-black/40 border-2 border-status-pass/30 rounded-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-status-pass/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-lg font-mono text-status-pass font-bold tracking-tight">
                {proposal.suggestion}
              </span>
              <div className="absolute top-3 right-3 opacity-20">
                <Lightning size={32} weight="fill" className="text-status-pass" />
              </div>
            </div>
          </section>
        </div>

        {/* Actions */}
        <div className="p-8 bg-black/40 border-t border-white/5 flex gap-4">
          <button
            onClick={() => handleAction(false)}
            disabled={isSubmitting}
            className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
          >
            Decline & STOP
          </button>
          <button
            onClick={() => handleAction(true)}
            disabled={isSubmitting}
            className="flex-[2] py-4 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-glow-amber flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle size={20} weight="fill" />
                Approve & Execute Fix
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
