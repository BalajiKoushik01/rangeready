/**
 * FILE: components/ui/DiscoveryVisibilityPanel.tsx
 * ROLE: Real-time Background Discovery & SCPI Healing Monitor.
 * SOURCE: App.tsx (WebSocket), DashboardPage.tsx, InstrumentRegistryPage.tsx
 * TARGET: No direct API calls - receives push data from WebSocket (ws://host:8787/ws)
 *
 * TRACE:
 *   Backend [discovery_service.py] → [broadcast.py] → WebSocket
 *   → App.tsx [ws.onmessage] → SystemStateContext [addDiscoveryEvent]
 *   → This component renders it in real-time
 *
 * DESCRIPTION:
 *   A collapsible bottom-right panel that shows everything happening
 *   in the background:
 *     - Hardware discovery scans (IPs being probed)
 *     - Instruments found or lost
 *     - SCPI Negotiation Engine heal events (auto-corrections)
 *     - System health events
 *
 *   This gives the user FULL VISIBILITY into what the system is doing
 *   autonomously without needing to open the SCPI Console.
 *
 * HOW TO USE:
 *   Mount this in App.tsx or any page layout.
 *   It connects to the same WebSocket feed as TelemetrySentry.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radar, ChevronUp, ChevronDown, CheckCircle, Warning,
  X, Cpu, Heartbeat, WifiHigh, ArrowsClockwise, Lightning
} from '@phosphor-icons/react';

// ─────────────────────────────────────────────────────────────────────────────
// EVENT TYPES that come from the WebSocket
// ─────────────────────────────────────────────────────────────────────────────
interface DiscoveryEvent {
  id: string;
  timestamp: string;
  type: 'probe'      // Scanning an IP
       | 'found'     // New instrument found
       | 'lost'      // Instrument went offline
       | 'heal'      // SCPI negotiation engine auto-corrected a command
       | 'error'     // Non-recoverable error
       | 'info';     // General system info
  message: string;
  address?: string;
  detail?: string;   // e.g. the healed SCPI command
}

const EVENT_ICONS: Record<DiscoveryEvent['type'], React.ReactNode> = {
  probe: <WifiHigh size={12} className="text-text-tertiary" weight="bold" />,
  found: <CheckCircle size={12} className="text-status-pass" weight="fill" />,
  lost:  <X size={12} className="text-status-fail" weight="bold" />,
  heal:  <Lightning size={12} className="text-amber-400" weight="fill" />,
  error: <Warning size={12} className="text-status-fail" weight="fill" />,
  info:  <Cpu size={12} className="text-accent-blue" weight="duotone" />,
};

const EVENT_COLORS: Record<DiscoveryEvent['type'], string> = {
  probe: 'text-text-tertiary',
  found: 'text-status-pass',
  lost:  'text-status-fail',
  heal:  'text-amber-400',
  error: 'text-status-fail',
  info:  'text-accent-blue',
};

// One event row
const EventRow: React.FC<{ event: DiscoveryEvent }> = ({ event }) => (
  <motion.div
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0"
  >
    <span className="mt-0.5 shrink-0">{EVENT_ICONS[event.type]}</span>
    <div className="flex-1 min-w-0">
      <p className={`text-[10px] font-mono leading-tight ${EVENT_COLORS[event.type]}`}>
        {event.message}
      </p>
      {event.detail && (
        <p className="text-[9px] text-text-tertiary font-mono mt-0.5 truncate opacity-70">
          {event.detail}
        </p>
      )}
    </div>
    <span className="text-[8px] text-text-tertiary shrink-0 font-mono">
      {event.timestamp.slice(11, 19)}
    </span>
  </motion.div>
);

export const DiscoveryVisibilityPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [events, setEvents] = useState<DiscoveryEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // ─── Stats counters
  const found = events.filter(e => e.type === 'found').length;
  const heals = events.filter(e => e.type === 'heal').length;
  const errors = events.filter(e => e.type === 'error').length;

  // ─── WebSocket connection
  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:8787/ws`;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        addEvent({
          type: 'info',
          message: 'Discovery monitor connected',
          detail: wsUrl,
        });
      };

      ws.onclose = () => {
        setIsConnected(false);
        addEvent({ type: 'error', message: 'Monitor disconnected — reconnecting...' });
        setTimeout(connect, 3000);
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          // Map incoming WS message types to DiscoveryEvent types
          if (msg.type === 'discovery_probe') {
            addEvent({ type: 'probe', message: `Probing ${msg.address}`, address: msg.address });
          } else if (msg.type === 'discovery_found') {
            addEvent({ type: 'found', message: `Found: ${msg.name || msg.idn || msg.address}`, address: msg.address, detail: msg.idn });
          } else if (msg.type === 'discovery_lost') {
            addEvent({ type: 'lost', message: `Lost contact: ${msg.address}`, address: msg.address });
          } else if (msg.type === 'telemetry_heal') {
            addEvent({ type: 'heal', message: 'Auto-corrected SCPI command', detail: msg.packet, address: msg.address });
          } else if (msg.type === 'system_error') {
            addEvent({ type: 'error', message: msg.message || 'System error', detail: msg.detail });
          } else if (msg.type === 'system_info') {
            addEvent({ type: 'info', message: msg.message });
          }
        } catch { /* non-JSON frames are ignored */ }
      };
    };

    connect();
    return () => { wsRef.current?.close(); };
  }, []);

  // ─── Auto-scroll to bottom when a new event arrives
  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, isExpanded]);

  const addEvent = (partial: Omit<DiscoveryEvent, 'id' | 'timestamp'>) => {
    const event: DiscoveryEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...partial,
    };
    setEvents(prev => [...prev.slice(-199), event]); // keep last 200
    if (!isExpanded) setUnreadCount(prev => prev + 1);
  };

  const handleExpand = () => {
    setIsExpanded(v => !v);
    setUnreadCount(0);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 select-none">
      {/* ─── Expanded Event Log ─── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className="mb-2 bg-bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Stats row */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 bg-white/5">
              <span className="text-[9px] text-status-pass font-black">
                <CheckCircle size={10} className="inline mr-1" weight="fill" />
                {found} found
              </span>
              <span className="text-[9px] text-amber-400 font-black">
                <Lightning size={10} className="inline mr-1" weight="fill" />
                {heals} healed
              </span>
              <span className="text-[9px] text-status-fail font-black">
                <Warning size={10} className="inline mr-1" weight="fill" />
                {errors} errors
              </span>
              <button
                onClick={() => setEvents([])}
                className="ml-auto text-[8px] text-text-tertiary hover:text-status-fail transition-all"
              >
                Clear
              </button>
            </div>

            {/* Event stream */}
            <div
              ref={scrollRef}
              className="overflow-y-auto max-h-64 px-3 py-2 custom-scrollbar space-y-0"
            >
              {events.length === 0 ? (
                <p className="text-[10px] text-text-tertiary text-center py-6 opacity-50">
                  No background events yet
                </p>
              ) : (
                <AnimatePresence initial={false}>
                  {[...events].reverse().map(e => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Collapsed Header / Toggle ─── */}
      <button
        onClick={handleExpand}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all shadow-lg
          ${isConnected
            ? 'bg-bg-surface/90 backdrop-blur-xl border-white/10 hover:border-accent-blue/40'
            : 'bg-status-fail/10 border-status-fail/30'
          }`}
      >
        {/* Animated radar icon */}
        <div className={`relative shrink-0 ${isConnected ? 'text-accent-blue' : 'text-status-fail'}`}>
          <Radar size={18} weight="duotone" />
          {isConnected && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-status-pass rounded-full animate-pulse border border-bg-surface" />
          )}
        </div>

        <div className="flex-1 text-left">
          <p className="text-[10px] font-black text-white uppercase tracking-widest">
            Background Monitor
          </p>
          <p className="text-[8px] text-text-tertiary">
            {isConnected
              ? events.length === 0
                ? 'Watching for hardware events...'
                : events[events.length - 1]?.message.slice(0, 32) + '...'
              : 'Disconnected'
            }
          </p>
        </div>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="px-2 py-0.5 bg-accent-blue text-white text-[8px] font-black rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Spinning indicator when actively discovering */}
        {isConnected && (
          <ArrowsClockwise size={12} className="text-text-tertiary animate-spin-slow shrink-0" />
        )}

        {isExpanded ? (
          <ChevronDown size={14} className="text-text-tertiary shrink-0" />
        ) : (
          <ChevronUp size={14} className="text-text-tertiary shrink-0" />
        )}
      </button>
    </div>
  );
};

export default DiscoveryVisibilityPanel;
