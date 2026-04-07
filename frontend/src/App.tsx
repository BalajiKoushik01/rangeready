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

const App: React.FC = () => {
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
            </Routes>
          </div>
        </main>
      </div>
      <LaunchOverlay />
    </Router>
  );
};

export default App;
