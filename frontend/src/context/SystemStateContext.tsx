/**
 * FILE: context/SystemStateContext.tsx
 * ROLE: Global UI & Mode State Provider.
 * SOURCE: App.tsx
 * TARGET: All wrapped UI components (Dashboard, Sidebar).
 * DESCRIPTION: Manages toggles for AI Copilot, Simulation overrides, and global notification flags.
 */
import React, { createContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { RFBand } from '../types';

export type ConnStatus = 'connected' | 'connecting' | 'offline';

export type SystemStatus = {
  keysight_sg: ConnStatus;
  keysight_sa: ConnStatus;
  rs_sg: ConnStatus;
  rs_sa: ConnStatus;
};

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
  systemStatus: SystemStatus;
  setInstrumentStatus: (instrument: keyof SystemStatus, status: ConnStatus) => void;
};

export const SystemStateContext = createContext<SystemStateContextType | undefined>(undefined);

export const SystemStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeBand, setActiveBand] = useLocalStorage<RFBand>('rr-active-band', 'S-Band');
  const [isAiMode, setIsAiMode] = useLocalStorage<boolean>('rr-ai-mode', true);
  const [pendingBand, setPendingBand] = useState<RFBand | null>(null);
  const [isHardwareBusy, setIsHardwareBusy] = useState<boolean>(false);
  const [busyMessage, setBusyMessage] = useState<string>('');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    keysight_sg: 'offline',
    keysight_sa: 'offline',
    rs_sg: 'offline',
    rs_sa: 'offline',
  });

  const setInstrumentStatus = (instrument: keyof SystemStatus, status: ConnStatus) => {
    setSystemStatus(prev => ({ ...prev, [instrument]: status }));
  };

  const value = React.useMemo(() => ({
    activeBand, setActiveBand,
    isAiMode, setIsAiMode,
    pendingBand, setPendingBand,
    isHardwareBusy, setIsHardwareBusy,
    busyMessage, setBusyMessage,
    systemStatus, setInstrumentStatus
  }), [activeBand, setActiveBand, isAiMode, setIsAiMode, pendingBand, setPendingBand, isHardwareBusy, busyMessage, systemStatus]);

  return (
    <SystemStateContext.Provider value={value}>
      {children}
    </SystemStateContext.Provider>
  );
};
