/**
 * FILE: hooks/useTelemetry.ts
 * ROLE: Hardware Communication State Store (Zustand).
 * SOURCE: App.tsx (WebSocket Dispatch)
 * TARGET: TelemetrySentry component and Dashboard Log.
 * TRACE: [backend.broadcast] -> [App.onmessage] -> [useTelemetry.addPacket()]
 */
import { create } from 'zustand';

interface TelemetryPacket {
  id: string;
  packet: string;
  address: string;
  timestamp: string;
  type: 'sent' | 'received' | 'error';
}

interface TelemetryStore {
  packets: TelemetryPacket[];
  addPacket: (packet: string, address: string, type?: 'sent' | 'received' | 'error') => void;
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
      ...state.packets.slice(0, 49), // Keep last 50 packets for the dashboard history view
    ],
  })),
  clearPackets: () => set({ packets: [] }),
}));
