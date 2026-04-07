import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

export type RFBand = 'UHF' | 'L-Band' | 'S-Band' | 'C-Band' | 'X-Band' | 'Ku-Band';

export const BAND_PRESETS: Record<RFBand, { min: number; max: number }> = {
  'UHF': { min: 0.3, max: 3.0 },
  'L-Band': { min: 1.0, max: 2.0 },
  'S-Band': { min: 2.0, max: 4.0 },
  'C-Band': { min: 4.0, max: 8.0 },
  'X-Band': { min: 8.0, max: 12.0 },
  'Ku-Band': { min: 12.0, max: 18.0 }
};

interface SystemStateContextType {
  activeBand: RFBand;
  setActiveBand: (band: RFBand | ((prev: RFBand) => RFBand)) => void;
  isAiMode: boolean;
  setIsAiMode: (mode: boolean | ((prev: boolean) => boolean)) => void;
  pendingBand: RFBand | null;
  setPendingBand: (band: RFBand | null) => void;
}

const SystemStateContext = createContext<SystemStateContextType | undefined>(undefined);

export const SystemStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeBand, setActiveBand] = useLocalStorage<RFBand>('rr-active-band', 'S-Band');
  const [isAiMode, setIsAiMode] = useLocalStorage<boolean>('rr-ai-mode', true);
  const [pendingBand, setPendingBand] = useState<RFBand | null>(null);

  const value = React.useMemo(() => ({
    activeBand, setActiveBand,
    isAiMode, setIsAiMode,
    pendingBand, setPendingBand
  }), [activeBand, setActiveBand, isAiMode, setIsAiMode, pendingBand, setPendingBand]);

  return (
    <SystemStateContext.Provider value={value}>
      {children}
    </SystemStateContext.Provider>
  );
};

export const useSystemState = () => {
  const context = useContext(SystemStateContext);
  if (!context) {
    throw new Error('useSystemState must be used within a SystemStateProvider');
  }
  return context;
};
