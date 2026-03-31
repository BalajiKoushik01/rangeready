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

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex min-h-screen bg-bg-base overflow-hidden">
        <PersistentSidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-10 relative">
          <div className="absolute top-0 left-0 w-full h-96 bg-accent-blue/5 blur-[120px] pointer-events-none" />
          
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/runner" element={<TestRunnerPage />} />
            <Route path="/registry" element={<InstrumentRegistryPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/calibration" element={<CalibrationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
      <LaunchOverlay />
    </Router>
  );
};

export default App;
