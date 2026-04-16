/**
 * FILE: pages/InstrumentProfilerWizard.tsx
 * ROLE: Interactive "Unknown Hardware" Onboarding Wizard.
 * SOURCE: InstrumentRegistryPage.tsx (modal) and App Router (/profiler)
 * TARGET: POST /api/instruments/probe, GET /api/instruments/wizard-questions/{class},
 *         POST /api/instruments/ (final save with command_map)
 *
 * TRACE: Step 1 → POST /api/instruments/probe → auto-detect IDN and commands
 *        Step 2 → GET /api/instruments/wizard-questions/{class} → load question list
 *        Step 3 → User reviews and edits auto-detected commands
 *        Step 4 → POST /api/instruments/ with {command_map, driver_id: "GenericSCPIDriver"}
 *
 * DESCRIPTION:
 *   This wizard guides the user through registering hardware that is not
 *   in our known driver list. It auto-probes the device, detects what SCPI
 *   commands work, and allows customization before saving.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, MagnifyingGlass, CheckCircle, ArrowRight,
  ArrowLeft, FloppyDisk, Plug, Wrench, Terminal, Sparkle
} from '@phosphor-icons/react';
import { GlassCard } from '../components/ui/GlassCard';

const API_BASE = `http://${window.location.hostname}:8787/api`;

// Human-readable labels for each SCPI action key
const ACTION_LABELS: Record<string, { label: string; description: string; unit: string }> = {
  set_frequency:   { label: "Set Frequency",     description: "Command to set the carrier frequency",    unit: "Hz (e.g. FREQ {value})" },
  query_frequency: { label: "Query Frequency",   description: "Command to read back the current freq",   unit: "(should contain ?)" },
  set_power:       { label: "Set Power/Level",   description: "Command to set amplitude or power",       unit: "dBm or V (e.g. POW {value})" },
  query_power:     { label: "Query Power",        description: "Command to read back power/level",        unit: "(should contain ?)" },
  rf_on:           { label: "RF Output ON",       description: "Command to enable the RF output",         unit: "(e.g. OUTP ON)" },
  rf_off:          { label: "RF Output OFF",      description: "Command to disable the RF output",        unit: "(e.g. OUTP OFF)" },
  query_rf:        { label: "Query RF State",     description: "Command to check if RF is on",            unit: "(should contain ?)" },
  query_error:     { label: "Query Error Register", description: "Command to read hardware error codes", unit: "(e.g. SYST:ERR?)" },
  am_on:           { label: "AM Modulation ON",   description: "Enable Amplitude Modulation",             unit: "(e.g. AM:STAT ON)" },
  am_off:          { label: "AM Modulation OFF",  description: "Disable Amplitude Modulation",            unit: "" },
  am_depth:        { label: "AM Depth",           description: "Set AM modulation depth",                 unit: "% (e.g. AM:DEPT {value})" },
  fm_on:           { label: "FM Modulation ON",   description: "Enable Frequency Modulation",             unit: "(e.g. FM:STAT ON)" },
  fm_off:          { label: "FM Modulation OFF",  description: "Disable Frequency Modulation",            unit: "" },
  fm_dev:          { label: "FM Deviation",       description: "Set FM deviation",                        unit: "Hz (e.g. FM:DEV {value})" },
  pm_on:           { label: "Phase Mod ON",       description: "Enable Phase Modulation",                 unit: "" },
  pm_off:          { label: "Phase Mod OFF",      description: "Disable Phase Modulation",                unit: "" },
  pulse_on:        { label: "Pulse Mod ON",       description: "Enable Pulse Modulation",                 unit: "(e.g. PULM:STAT ON)" },
  pulse_off:       { label: "Pulse Mod OFF",      description: "Disable Pulse Modulation",                unit: "" },
  pulse_period:    { label: "Pulse Period",       description: "Set the pulse period",                    unit: "s (e.g. PULM:INT:PER {value})" },
  pulse_width:     { label: "Pulse Width",        description: "Set the pulse width",                     unit: "s (e.g. PULM:INT:PWID {value})" },
  sweep_start:     { label: "Sweep Start Freq",   description: "Set the sweep start frequency",           unit: "Hz" },
  sweep_stop:      { label: "Sweep Stop Freq",    description: "Set the sweep stop frequency",            unit: "Hz" },
  sweep_step:      { label: "Sweep Step Size",    description: "Set the frequency step for sweep",        unit: "Hz" },
  sweep_dwell:     { label: "Sweep Dwell Time",   description: "Set time at each freq step",              unit: "s" },
  sweep_trigger:   { label: "Trigger Sweep",      description: "Command to fire the sweep",               unit: "(e.g. TRIG)" },
  trig_source_imm: { label: "Trigger: Immediate", description: "Set trigger source to immediate (free-run)", unit: "" },
  trig_source_ext: { label: "Trigger: External",  description: "Set trigger source to external",         unit: "" },
  trig_source_bus: { label: "Trigger: Bus",       description: "Set trigger source to GPIB bus",         unit: "" },
  sa_center:       { label: "SA: Center Frequency", description: "Set spectrum analyzer center freq",    unit: "Hz" },
  sa_span:         { label: "SA: Span",           description: "Set spectrum analyzer frequency span",    unit: "Hz" },
  sa_start:        { label: "SA: Start Frequency", description: "Set spectrum start frequency",          unit: "Hz" },
  sa_stop:         { label: "SA: Stop Frequency", description: "Set spectrum stop frequency",             unit: "Hz" },
  sa_ref_level:    { label: "SA: Reference Level", description: "Set the top of the Y-axis",             unit: "dBm" },
  sa_rbw:          { label: "SA: RBW",            description: "Set Resolution Bandwidth",                unit: "Hz" },
  sa_vbw:          { label: "SA: VBW",            description: "Set Video Bandwidth",                     unit: "Hz" },
  sa_sweep_time:   { label: "SA: Sweep Time",     description: "Set the sweep time",                      unit: "s" },
  sa_sweep_points: { label: "SA: Points",         description: "Set the number of sweep points",          unit: "" },
  sa_att:          { label: "SA: Attenuation",    description: "Set the input attenuation",               unit: "dB" },
  sa_att_auto:     { label: "SA: Auto Attenuation", description: "Enable auto attenuation",              unit: "" },
  sa_init_cont:    { label: "SA: Continuous Sweep", description: "Put SA in continuous sweep mode",      unit: "" },
  sa_init_single:  { label: "SA: Single Sweep",   description: "Trigger a single sweep",                  unit: "" },
  sa_trace:        { label: "SA: Get Trace Data", description: "Query the trace amplitude data",          unit: "(e.g. TRAC:DATA? TRACE{value})" },
  psu_volt:        { label: "PSU: Set Voltage",   description: "Set the output voltage",                  unit: "V" },
  psu_curr:        { label: "PSU: Set Current",   description: "Set the current limit",                   unit: "A" },
  psu_out_on:      { label: "PSU: Output ON",     description: "Enable power supply output",              unit: "" },
  psu_out_off:     { label: "PSU: Output OFF",    description: "Disable power supply output",             unit: "" },
  psu_query_volt:  { label: "PSU: Measure Voltage", description: "Read back the measured voltage",       unit: "(should contain ?)" },
  psu_query_curr:  { label: "PSU: Measure Current", description: "Read back the measured current",       unit: "(should contain ?)" },
};

interface ProbeResult {
  idn: string;
  vendor: string;
  instrument_class: string;
  suggested_driver: string;
  discovered_command_map: Record<string, string>;
  heal_cache: Record<string, string>;
}

interface WizardProps {
  onComplete: (profiledData: any) => void;
  onCancel: () => void;
}

type WizardStep = 'probe' | 'classify' | 'map_required' | 'map_optional' | 'confirm';

const INSTRUMENT_CLASSES = [
  { id: 'signal_generator',       label: 'Signal Generator',       icon: '📡' },
  { id: 'spectrum_analyzer',      label: 'Spectrum Analyzer',      icon: '📊' },
  { id: 'vector_network_analyzer',label: 'Vector Network Analyzer', icon: '🔭' },
  { id: 'oscilloscope',           label: 'Oscilloscope',           icon: '🌊' },
  { id: 'power_supply',           label: 'Power Supply',           icon: '⚡' },
  { id: 'generic',                label: 'Other / Generic SCPI',   icon: '🔧' },
];

export const InstrumentProfilerWizard: React.FC<WizardProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<WizardStep>('probe');
  const [address, setAddress] = useState('');
  const [port, setPort] = useState('5025');
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState('signal_generator');
  const [commandMap, setCommandMap] = useState<Record<string, string>>({});
  const [wizardProfile, setWizardProfile] = useState<{ required: string[]; optional: string[] }>({ required: [], optional: [] });
  const [instrumentName, setInstrumentName] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('GenericSCPIDriver');

  // ─── Step 1: Probe the hardware ───────────────────────────────────────────
  const handleProbe = async () => {
    if (!address.trim()) return;
    setIsProbing(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/instruments/probe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim(), port: parseInt(port) }),
      });
      if (!res.ok) throw new Error(`Connection failed: ${await res.text()}`);
      const data: ProbeResult = await res.json();
      setProbeResult(data);
      setSelectedClass(data.instrument_class || 'generic');
      setSelectedDriver(data.suggested_driver);
      setCommandMap(data.discovered_command_map || {});
      setInstrumentName(`${data.vendor} ${data.idn.split(',')[1] || 'Instrument'}`);
    } catch (e: any) {
      setError(e.message || 'Could not connect to device.');
    } finally {
      setIsProbing(false);
    }
  };

  // ─── Step 2: Load wizard questions based on selected class ────────────────
  const handleClassConfirm = async () => {
    try {
      const res = await fetch(`${API_BASE}/instruments/wizard-questions/${selectedClass}`);
      const data = await res.json();
      setWizardProfile({ required: data.required_mappings, optional: data.optional_mappings });
      // Pre-fill IEEE defaults for anything that wasn't auto-discovered
      const defaults = data.all_defaults || {};
      const merged = { ...defaults, ...commandMap };
      setCommandMap(merged);
      setStep('map_required');
    } catch {
      setStep('map_required');
    }
  };

  // ─── Final: Save the profile ───────────────────────────────────────────────
  const handleSave = async () => {
    const payload = {
      name: instrumentName,
      model: probeResult?.idn.split(',')[1] || 'Custom Instrument',
      serial_number: probeResult?.idn.split(',')[2] || `CUSTOM-${Date.now()}`,
      connection_type: 'TCPIP',
      address: address,
      driver_id: selectedDriver,
      instrument_class: selectedClass,
      vendor: probeResult?.vendor || 'Unknown',
      command_map: commandMap,
      is_active: true,
    };
    try {
      const res = await fetch(`${API_BASE}/instruments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      onComplete(saved);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl"
      >
        <GlassCard level={2} className="p-8 border-accent-blue/20">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-accent-blue/10 rounded-2xl border border-accent-blue/20 text-accent-blue">
              <Sparkle size={28} weight="duotone" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Hardware Profiler Wizard
              </h2>
              <p className="text-[10px] text-text-tertiary font-black uppercase tracking-widest opacity-60">
                Auto-discover and configure any SCPI instrument
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex gap-2 mb-8">
            {(['probe', 'classify', 'map_required', 'map_optional', 'confirm'] as WizardStep[]).map((s, i) => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-all ${
                ['probe','classify','map_required','map_optional','confirm'].indexOf(step) >= i
                  ? 'bg-accent-blue' : 'bg-white/10'
              }`} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1: PROBE */}
            {step === 'probe' && (
              <motion.div key="probe" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                  <MagnifyingGlass weight="duotone" className="text-accent-blue" />
                  Step 1: Find Your Hardware
                </h3>
                <p className="text-[10px] text-text-tertiary mb-6">
                  Enter the instrument's IP address. The system will automatically connect, send *IDN?, detect vendor/model, and probe which SCPI commands work.
                </p>
                <div className="flex gap-3 mb-4">
                  <input
                    value={address} onChange={e => setAddress(e.target.value)}
                    placeholder="192.168.1.100"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-accent-blue transition-all"
                    onKeyDown={e => e.key === 'Enter' && handleProbe()}
                  />
                  <input
                    value={port} onChange={e => setPort(e.target.value)}
                    placeholder="Port"
                    className="w-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-accent-blue transition-all"
                  />
                  <button onClick={handleProbe} disabled={isProbing || !address}
                    className="px-6 bg-accent-blue text-white rounded-xl text-[11px] font-black uppercase tracking-widest disabled:opacity-40 hover:bg-blue-500 transition-all flex items-center gap-2">
                    {isProbing ? <span className="animate-spin">⟳</span> : <Plug size={16} />}
                    {isProbing ? 'Probing...' : 'Probe'}
                  </button>
                </div>

                {error && <p className="text-status-fail text-[10px] mb-4 font-bold">{error}</p>}

                {probeResult && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-status-pass/10 border border-status-pass/20 rounded-2xl space-y-2">
                    <p className="text-status-pass text-[10px] font-black uppercase flex items-center gap-2">
                      <CheckCircle weight="fill" /> Hardware Detected
                    </p>
                    <p className="text-white font-mono text-xs">{probeResult.idn}</p>
                    <div className="flex gap-4 text-[10px] text-text-tertiary">
                      <span>Vendor: <span className="text-white font-bold">{probeResult.vendor}</span></span>
                      <span>Class: <span className="text-white font-bold">{probeResult.instrument_class}</span></span>
                      <span>Driver: <span className="text-accent-blue font-bold">{probeResult.suggested_driver}</span></span>
                    </div>
                    <p className="text-[10px] text-text-tertiary">
                      Auto-discovered {Object.keys(probeResult.discovered_command_map).length} working SCPI commands
                    </p>
                  </motion.div>
                )}

                <div className="flex justify-between mt-6">
                  <button onClick={onCancel} className="text-text-tertiary text-[10px] font-black uppercase hover:text-white transition-all">Cancel</button>
                  {probeResult && (
                    <button onClick={() => setStep('classify')}
                      className="px-6 py-3 bg-accent-blue text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 transition-all">
                      Next <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 2: CLASSIFY */}
            {step === 'classify' && (
              <motion.div key="classify" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                  <Cpu weight="duotone" className="text-accent-blue" /> Step 2: Confirm Instrument Type
                </h3>
                <p className="text-[10px] text-text-tertiary mb-6">
                  The system detected this as a <strong className="text-white">{probeResult?.instrument_class}</strong>. Confirm or change the type below.
                </p>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {INSTRUMENT_CLASSES.map(cls => (
                    <button key={cls.id} onClick={() => setSelectedClass(cls.id)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        selectedClass === cls.id
                          ? 'bg-accent-blue/10 border-accent-blue text-white'
                          : 'bg-white/5 border-white/10 text-text-tertiary hover:border-white/30'
                      }`}>
                      <div className="text-2xl mb-2">{cls.icon}</div>
                      <div className="text-[10px] font-black uppercase">{cls.label}</div>
                    </button>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2 block">Display Name</label>
                  <input value={instrumentName} onChange={e => setInstrumentName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-accent-blue transition-all"
                  />
                </div>
                <div className="flex justify-between mt-4">
                  <button onClick={() => setStep('probe')} className="flex items-center gap-2 text-text-tertiary text-[10px] font-black uppercase hover:text-white transition-all">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button onClick={handleClassConfirm}
                    className="px-6 py-3 bg-accent-blue text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 transition-all">
                    Next <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: MAP REQUIRED */}
            {step === 'map_required' && (
              <motion.div key="map_req" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                  <Wrench weight="duotone" className="text-accent-blue" /> Step 3: Core SCPI Mappings
                </h3>
                <p className="text-[10px] text-text-tertiary mb-4">
                  These are pre-filled from auto-discovery. Edit any command if needed. Use <code className="text-accent-blue">{'{{value}}'}</code> as a placeholder where a numeric value should go.
                </p>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                  {wizardProfile.required.map(action => {
                    const meta = ACTION_LABELS[action] || { label: action, description: '', unit: '' };
                    return (
                      <div key={action} className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-black text-white uppercase">{meta.label}</span>
                          <span className="text-[9px] text-accent-blue font-mono">{meta.unit}</span>
                        </div>
                        <p className="text-[9px] text-text-tertiary mb-2">{meta.description}</p>
                        <input
                          value={commandMap[action] || ''}
                          onChange={e => setCommandMap(m => ({...m, [action]: e.target.value}))}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-white outline-none focus:border-accent-blue transition-all"
                          placeholder={`e.g. ${meta.unit.replace('(e.g. ', '').replace(')', '') || action.toUpperCase()}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-6">
                  <button onClick={() => setStep('classify')} className="flex items-center gap-2 text-text-tertiary text-[10px] font-black uppercase hover:text-white transition-all">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button onClick={() => setStep('map_optional')}
                    className="px-6 py-3 bg-accent-blue text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 transition-all">
                    Next <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: OPTIONAL MAPPINGS */}
            {step === 'map_optional' && (
              <motion.div key="map_opt" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                  <Terminal weight="duotone" className="text-accent-blue" /> Step 4: Advanced Controls (Optional)
                </h3>
                <p className="text-[10px] text-text-tertiary mb-4">
                  Leave blank to use IEEE 488.2 defaults. Fill in only if your hardware uses different commands.
                </p>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                  {wizardProfile.optional.map(action => {
                    const meta = ACTION_LABELS[action] || { label: action, description: '', unit: '' };
                    return (
                      <div key={action} className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-black text-white uppercase">{meta.label}</span>
                          <span className="text-[9px] text-text-tertiary font-mono opacity-60">optional</span>
                        </div>
                        <p className="text-[9px] text-text-tertiary mb-2">{meta.description}</p>
                        <input
                          value={commandMap[action] || ''}
                          onChange={e => setCommandMap(m => ({...m, [action]: e.target.value}))}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-white outline-none focus:border-accent-blue/50 transition-all"
                          placeholder={`Default: ${(ACTION_LABELS[action]?.unit || '').replace('(e.g. ', '').replace(')', '')}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-6">
                  <button onClick={() => setStep('map_required')} className="flex items-center gap-2 text-text-tertiary text-[10px] font-black uppercase hover:text-white transition-all">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button onClick={() => setStep('confirm')}
                    className="px-6 py-3 bg-accent-blue text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 transition-all">
                    Review <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: CONFIRM */}
            {step === 'confirm' && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                  <CheckCircle weight="duotone" className="text-status-pass" /> Step 5: Confirm & Register
                </h3>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-6 space-y-3">
                  <div className="flex justify-between"><span className="text-text-tertiary text-[10px] uppercase">Name</span><span className="text-white text-[11px] font-bold">{instrumentName}</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary text-[10px] uppercase">Address</span><span className="text-white text-[11px] font-mono">{address}</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary text-[10px] uppercase">IDN</span><span className="text-white text-[11px] font-mono truncate max-w-[60%]">{probeResult?.idn}</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary text-[10px] uppercase">Type</span><span className="text-accent-blue text-[11px] font-bold">{selectedClass}</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary text-[10px] uppercase">Driver</span><span className="text-accent-blue text-[11px] font-bold">{selectedDriver}</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary text-[10px] uppercase">Mapped Commands</span><span className="text-status-pass text-[11px] font-bold">{Object.keys(commandMap).length} commands</span></div>
                </div>
                {error && <p className="text-status-fail text-[10px] mb-4 font-bold">{error}</p>}
                <div className="flex justify-between">
                  <button onClick={() => setStep('map_optional')} className="flex items-center gap-2 text-text-tertiary text-[10px] font-black uppercase hover:text-white transition-all">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button onClick={handleSave}
                    className="px-6 py-3 bg-status-pass text-black rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-green-400 transition-all">
                    <FloppyDisk size={16} weight="fill" /> Save & Register
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default InstrumentProfilerWizard;
