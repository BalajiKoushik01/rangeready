/**
 * FILE: App.tsx
 * ROLE: Frontend Entry Logic & Global Listener.
 * SOURCE: main.tsx
 * TARGET: All Frontend pages and the backend WebSocket stream.
 * TRACE: [WS onmessage] -> [useTelemetry.addPacket()]
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PersistentSidebar } from './components/layout/PersistentSidebar';
import { DashboardPage } from './pages/DashboardPage';
import { TestRunnerPage } from './pages/TestRunnerPage';
import { HistoryPage } from './pages/HistoryPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { CalibrationPage } from './pages/CalibrationPage';
import { SettingsPage } from './pages/SettingsPage';
import { InstrumentRegistryPage } from './pages/InstrumentRegistryPage';
import { LaunchOverlay } from './components/ui/LaunchOverlay';
import DUTRegistryPage from './pages/DUTRegistryPage';
import SequenceBuilderPage from './pages/SequenceBuilderPage';
import BandLimitsConfigPage from './pages/BandLimitsConfigPage';
import SCPIConsolePage from './pages/SCPIConsolePage';
import { SystemControlBar } from './components/layout/SystemControlBar';
import { IntelligenceHUD } from './pages/IntelligenceHUD';
import { MasterControlPage } from './pages/MasterControlPage';
import { TelemetrySentry } from './components/ui/TelemetrySentry';
import { DiscoveryVisibilityPanel } from './components/ui/DiscoveryVisibilityPanel';
import { useTelemetry } from './hooks/useTelemetry';
import { useSystemState } from './hooks/useSystemState';
import { HardwareInterlockOverlay } from './components/ui/HardwareInterlockOverlay';

const App: React.FC = () => {
  const { addPacket } = useTelemetry();
  const { setIsHardwareBusy, setBusyMessage } = useSystemState();

  React.useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.hostname}:8787/ws`);
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'telemetry_packet') {
          addPacket(message.packet, message.address, 'sent');
        } else if (message.type === 'telemetry_response') {
          addPacket(message.packet, message.address, 'received');
        } else if (message.type === 'telemetry_heal') {
          // Auto-correction by SCPI Negotiation Engine — shown as orange warning
          addPacket(`[AUTO-HEAL] ${message.packet}`, message.address, 'error');
        } else if (message.type === 'status_update') {
          // Optional: handle generic status updates as received packets
          addPacket(message.message, 'SYSTEM', 'received');
        } else if (message.type === 'hardware_state') {
          setIsHardwareBusy(message.busy);
          setBusyMessage(message.message || "Background command in process...");
        }
      } catch (err) {
        console.error("WS Parse Error", err);
      }
    };

    return () => ws.close();
  }, [addPacket]);

  return (
    <Router>
      <div className="flex min-h-screen bg-bg-base overflow-hidden">
        <PersistentSidebar />
        <main className="flex-1 overflow-y-auto relative flex flex-col">
          <div className="absolute top-0 left-0 w-full h-96 bg-accent-blue/5 blur-[120px] pointer-events-none z-0" />
          
          <SystemControlBar />
          
          <div className="flex-1 p-4 md:p-10 relative z-10 w-full">
            <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/runner" element={<TestRunnerPage />} />
            <Route path="/registry" element={<InstrumentRegistryPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/calibration" element={<CalibrationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/dut-registry" element={<DUTRegistryPage />} />
            <Route path="/sequence" element={<SequenceBuilderPage />} />
            <Route path="/band-limits" element={<BandLimitsConfigPage />} />
            <Route path="/scpi" element={<SCPIConsolePage />} />
            <Route path="/intelligence" element={<IntelligenceHUD />} />
            <Route path="/control" element={<MasterControlPage />} />
            </Routes>
          </div>
        </main>
      </div>
      <LaunchOverlay />
      <TelemetrySentry />
      <DiscoveryVisibilityPanel />
      <HardwareInterlockOverlay />
    </Router>
  );
};

export default App;
