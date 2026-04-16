/**
 * FILE: hooks/useTelemetry.ts
 * ROLE: Hardware Communication State Store (Zustand).
 * SOURCE: App.tsx (WebSocket Dispatch)
 * TARGET: TelemetrySentry component and Dashboard Log.
 */
import { create } from 'zustand';

// Augmented packet types to include AI Intelligence events
export type PacketType = 'sent' | 'received' | 'error' | 'ai_heal' | 'system_info' | 'proposal';

export interface TelemetryPacket {
  id: string;
  packet: string;
  address: string;
  timestamp: string;
  type: PacketType;
  // Proposal extras
  proposal_id?: string;
  suggestion?: string;
  explanation?: string;
  original_cmd?: string;
  impact?: 'low' | 'medium' | 'high' | 'critical';
}

interface TelemetryStore {
  packets: TelemetryPacket[];
  addPacket: (packet: string, address: string, type?: PacketType) => void;
  clearPackets: () => void;
}

export const useTelemetry = create<TelemetryStore>((set) => ({
  packets: [],
  addPacket: (packet, address, type = 'sent') => set((state) => ({
    packets: [
      {
        id: Math.random().toString(36).substring(7),
        packet,
        address,
        type,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...state.packets.slice(0, 49),
    ],
  })),
  clearPackets: () => set({ packets: [] }),
}));
