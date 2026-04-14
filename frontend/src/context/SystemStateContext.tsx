/**
 * FILE: context/SystemStateContext.tsx
 * ROLE: Global UI & Mode State Provider.
 * SOURCE: App.tsx
 * TARGET: All wrapped UI components (Dashboard, Sidebar).
 * DESCRIPTION: Manages toggles for AI Copilot, Simulation overrides, and global notification flags.
 */
import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { RFBand } from '../types';

export type SystemStateContextType = {
  activeBand: RFBand;
  setActiveBand: (band: RFBand) => void;
  isAiMode: boolean;
  setIsAiMode: (mode: boolean) => void;
  pendingBand: RFBand | null;
  setPendingBand: (band: RFBand | null) => void;
  isHardwareBusy: boolean;
  setIsHardwareBusy: (busy: boolean) => void;
  busyMessage: string;
  setBusyMessage: (msg: string) => void;
};

export const SystemStateContext = createContext<SystemStateContextType | undefined>(undefined);

export const SystemStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeBand, setActiveBand] = useLocalStorage<RFBand>('rr-active-band', 'S-Band');
  const [isAiMode, setIsAiMode] = useLocalStorage<boolean>('rr-ai-mode', true);
  const [pendingBand, setPendingBand] = useState<RFBand | null>(null);
  const [isHardwareBusy, setIsHardwareBusy] = useState<boolean>(false);
  const [busyMessage, setBusyMessage] = useState<string>('');

  const value = React.useMemo(() => ({
    activeBand, setActiveBand,
    isAiMode, setIsAiMode,
    pendingBand, setPendingBand,
    isHardwareBusy, setIsHardwareBusy,
    busyMessage, setBusyMessage
  }), [activeBand, setActiveBand, isAiMode, setIsAiMode, pendingBand, setPendingBand, isHardwareBusy, busyMessage]);

  return (
    <SystemStateContext.Provider value={value}>
      {children}
    </SystemStateContext.Provider>
  );
};
