import React from 'react';
import { Lightning, CheckCircle, Warning } from '@phosphor-icons/react';

interface StatusBadgeProps {
  status?: string;
  healed?: boolean;
  executed?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = React.memo(({
  status, healed, executed
}) => {
  if (!status && !executed) return null;

  if (healed) {
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-black text-amber-400 bg-amber-400/10 rounded-full px-2 py-0.5">
        <Lightning size={9} weight="fill" /> AUTO-HEALED
      </span>
    );
  }

  if (executed && status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-black text-status-pass bg-status-pass/10 rounded-full px-2 py-0.5">
        <CheckCircle size={9} weight="fill" /> EXECUTED
      </span>
    );
  }

  if (status === 'fatal' || status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-black text-status-fail bg-status-fail/10 rounded-full px-2 py-0.5">
        <Warning size={9} weight="fill" /> {status.toUpperCase()}
      </span>
    );
  }

  return null;
});
