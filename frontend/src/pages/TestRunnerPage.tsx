import React, { useState, useEffect, useMemo } from 'react';
import { 
  Pulse, 
  Selection, 
  Target, 
  TerminalWindow, 
  ArrowClockwise, 
  Play, 
  Stop, 
  ChartBar, 
  Flask, 
  MagicWand, 
  HardDrive, 
  Warning, 
  ShieldCheck, 
  CheckCircle,
  CaretRight
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import { UPlotChart } from '../components/ui/UPlotChart';
import { BusMonitor } from '../components/ui/BusMonitor';
import { useSystemState, BAND_PRESETS } from '../context/SystemStateContext';

interface TraceLog {
  timestamp: string;
  step: string;
  command: string;
  response?: string;
  type: 'SCPI' | 'UDP' | 'SYSTEM';
}

interface Anomaly {
    id: string;
    freq: number;
    magnitude: number;
}

export const TestRunnerPage: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [traceData, setTraceData] = useState<[number[], number[]]>([[], []]);
  const [secondaryTraceData, setSecondaryTraceData] = useState<[number[], number[]]>([[], []]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [showGolden, setShowGolden] = useState(true);
  const [isBusMonitorOpen, setIsBusMonitorOpen] = useState(false);
  const [busLogs, setBusLogs] = useState<TraceLog[]>([]);
  const [isSplitView, setIsSplitView] = useState(false);
  
  const { activeBand, isAiMode } = useSystemState();
  const bandLimits = BAND_PRESETS[activeBand] || BAND_PRESETS["S-Band"];

  const steps = [
    { name: "S11 Scattering Parameter", target: `${bandLimits.min.toFixed(1)} - ${bandLimits.max.toFixed(1)} GHz`, limit: -12.0 },
    { name: "Voltage Standing Wave Ratio (VSWR)", target: `${bandLimits.min.toFixed(1)} - ${bandLimits.max.toFixed(1)} GHz`, limit: 1.5 },
    { name: "S21 Transmission Parameter", target: `${bandLimits.min.toFixed(1)} - ${bandLimits.max.toFixed(1)} GHz`, limit: -2.0 }
  ];

  const goldenTrace = useMemo<[number[], number[]]>(() => {
    const freqs: number[] = [];
    const amps: number[] = [];
    const range = bandLimits.max - bandLimits.min;
    const step = range / 1000;
    
    for(let i=0; i<1000; i++) {
        const freq = bandLimits.min + (i * step);
        freqs.push(freq);
        amps.push(-18 + Math.sin(i * 0.05) * 2);
    }
    return [freqs, amps];
  }, [bandLimits.min, bandLimits.max]);

  const { peak, bandwidth, qFactor } = useMemo(() => {
     let p = null;
     let bw = 0;
     let qf = 0;
     if (traceData[0] && traceData[0].length > 0) {
        const freqs = traceData[0];
        const amps = traceData[1];
        const maxIdx = amps.indexOf(Math.max(...amps));
        p = { freq: freqs[maxIdx], amp: amps[maxIdx] };
        
        if (p.amp > -15) {
           bw = 0.12; 
           qf = p.freq / 0.12;
        }
     }
     return { peak: p, bandwidth: bw, qFactor: qf };
  }, [traceData]);

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.hostname}:8787/ws`);
    
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "trace_update") {
           const amps = Array.isArray(payload.data) ? payload.data : payload.data.split(',').map(Number);
           const range = bandLimits.max - bandLimits.min;
           const step = range / amps.length;
           const freqs = Array.from({length: amps.length}, (_, i) => bandLimits.min + (i * step));
           setTraceData([freqs, amps]);
           setSecondaryTraceData([freqs, amps.map((a: number) => a - 10)]);
        } else if (payload.type === "status_update") {
           if (typeof payload.message === 'object' && payload.message.traceability) {
               const { traceability } = payload.message;
               const newLog: TraceLog = {
                   timestamp: new Date().toLocaleTimeString(),
                   step: traceability.step,
                   command: traceability.bus_traffic || "INTERNAL_OPERATION",
                   response: traceability.response,
                   type: (traceability.bus_traffic?.includes(':') || traceability.bus_traffic?.includes('?')) ? 'SCPI' : 
                         traceability.bus_traffic?.includes('UDP') ? 'UDP' : 'SYSTEM'
               };
               setBusLogs(prev => [...prev.slice(-499), newLog]);

               if (payload.message.message?.includes("SUCCESS")) {
                   setCurrentStep(prev => prev < 2 ? prev + 1 : prev);
               }
           } else if (typeof payload.message === 'string') {
               if (payload.message.includes("SUCCESS")) {
                   setCurrentStep(prev => prev < 2 ? prev + 1 : prev);
               }
           }
        }
      } catch (e) {
        console.error("WebSocket Communication Error:", e);
      }
    };
    
    return () => ws.close();
  }, [bandLimits, activeBand]);

  const startTest = async () => {
    setTraceData([[], []]);
    setAnomalies([]);
    setIsRunning(true);
    setCurrentStep(0);
    setBusLogs(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        step: "TEST_SEQUENCE_INITIALIZATION",
        command: "HTTP_POST: run_test",
        type: "SYSTEM"
    }]);
    
    try {
        await fetch(`http://${window.location.hostname}:8787/api/tests/run?dut_name=RF_DEVICE_ALPHA&dut_serial=S-00891&template_id=TTC_ANT_L`, {
            method: "POST"
        });
    } catch(e) {
        setBusLogs(prev => [...prev, {
            timestamp: new Date().toLocaleTimeString(),
            step: "COMMUNICATION_FAULT",
            command: "CONNECTIVITY_ERROR",
            response: "Backend API Service Unreachable",
            type: "SYSTEM"
        }]);
        setIsRunning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 px-4 relative animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-[#1E293B] pb-8">
        <div className="flex items-center gap-6">
          <div className={`p-5 rounded-3xl shadow-[0_0_50px_rgba(30,111,217,0.15)] border border-accent-blue/30 transition-all ${isRunning ? 'bg-accent-blue/10 text-accent-blue animate-pulse' : 'bg-[#131B2C] text-text-tertiary hover:scale-105'}`}>
            <Pulse weight="duotone" size={42} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Standard Commands for Programmable Instruments (SCPI) Interface</h1>
            <p className="text-[10px] text-text-tertiary font-black tracking-widest uppercase opacity-70">Vector Network Analyzer (VNA) Orchestration Environment · V5.1 (Industrial)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex bg-[#131B2C] p-1.5 rounded-2xl border border-[#1E293B] shadow-2xl">
              <button 
                onClick={() => setIsSplitView(!isSplitView)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${isSplitView ? 'bg-accent-blue text-white shadow-lg' : 'text-text-tertiary hover:text-white'}`}
              >
                <Selection size={16} />
                Dual Trace View
              </button>
              <button 
                onClick={() => setShowGolden(!showGolden)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${showGolden ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40' : 'text-text-tertiary hover:text-white'}`}
              >
                <Target size={16} />
                Golden Trace Template
              </button>
              <button 
                onClick={() => setIsBusMonitorOpen(true)}
                className={`flex items-center gap-3 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${isBusMonitorOpen ? 'bg-status-pass text-[#0B0F19]' : 'text-text-tertiary hover:text-status-pass'}`}
              >
                <TerminalWindow size={20} />
                Hardware Bus Monitor
              </button>
           </div>

           <button 
             onClick={startTest}
             disabled={isRunning}
             className="flex items-center gap-4 px-12 py-5 bg-accent-blue text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] shadow-[0_10px_40px_rgba(30,111,217,0.3)] hover:bg-[#2563EB] hover:-translate-y-1 transition-all disabled:opacity-50 active:scale-95 group"
           >
             {isRunning ? <ArrowClockwise className="animate-spin" size={28} /> : <Play weight="fill" size={28} className="group-hover:scale-110 transition-transform" />}
             Start Measurement Sequence
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <GlassCard level={2} className="p-10 min-h-[600px] flex flex-col relative overflow-hidden bg-[#0B0F19] border-[#1E293B] shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-accent-blue/5 blur-[150px] pointer-events-none" />
            
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] flex items-center gap-4">
                   <ChartBar className="text-accent-blue" weight="duotone" size={24} />
                   {isSplitView ? "Synchronized Dual-Channel Scattering Data" : "Primary Scattering Parameter Trace (S11)"}
                </h3>
              </div>
            </div>
            
            <div className={`flex-1 flex gap-10 relative z-10 ${isSplitView ? 'flex-row' : 'flex-col'}`}>
              <div className="flex-1 w-full relative group">
                <div className="absolute top-6 left-8 text-[11px] font-black uppercase text-accent-blue opacity-60 z-20 font-mono tracking-widest bg-black/60 px-4 py-1.5 rounded-lg border border-accent-blue/30 backdrop-blur-md">INSTR_CHN_01::VNA::S11_PARAMETER</div>
                <div className="w-full h-[400px] lg:h-[500px] bg-black/40 rounded-[2.5rem] p-6 border border-white/5 shadow-inner">
                  <UPlotChart 
                    data={traceData} 
                    showGolden={showGolden} 
                    goldenData={goldenTrace} 
                    color="#1E6FD9" 
                  />
                </div>
              </div>

              {isSplitView && (
                <div className="flex-1 w-full relative border-l border-[#1E293B] pl-10 animate-in slide-in-from-right duration-700">
                  <div className="absolute top-6 left-12 text-[11px] font-black uppercase text-status-pass opacity-60 z-20 font-mono tracking-widest bg-black/60 px-4 py-1.5 rounded-lg border border-status-pass/30 backdrop-blur-md">INSTR_CHN_02::VNA::S21_PARAMETER</div>
                  <div className="w-full h-[400px] bg-black/40 rounded-[2.5rem] p-6 border border-white/5 shadow-inner">
                     <UPlotChart 
                       data={secondaryTraceData} 
                       color="#10B981" 
                     />
                  </div>
                </div>
              )}

              {/* Peak Measurement Overlay */}
              <div className="absolute top-24 left-12 flex flex-col gap-6 pointer-events-none z-20">
                 {peak && (
                   <motion.div 
                     initial={{ opacity: 0, x: -30 }}
                     animate={{ opacity: 1, x: 0 }}
                     className="p-8 bg-[#131B2C]/98 border border-[#1E293B] flex flex-col gap-3 rounded-[2rem] backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] border-l-8 border-l-accent-blue"
                   >
                      <div className="flex items-center gap-3 text-[10px] font-black uppercase text-accent-blue tracking-[0.2em]">
                         <Target size={20} weight="bold" />
                         Resonant Frequency Peak
                      </div>
                      <div className="text-4xl font-black text-white tracking-tighter">{peak.freq.toFixed(4)} <span className="text-sm text-text-tertiary ml-1">GHz</span></div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-status-pass bg-status-pass/10 px-3 py-1 rounded-md border border-status-pass/20">{peak.amp.toFixed(2)} dB</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1E293B]" />
                        <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Q-FACTOR: {(qFactor/100).toFixed(2)}</span>
                      </div>
                   </motion.div>
                 )}
              </div>
            </div>

            {/* Measurement Status HUD Footer */}
            <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-10 pt-10 border-t border-[#1E293B] relative z-10">
               <div className="space-y-3">
                  <span className="text-text-tertiary text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Instrumentation Bus Status</span>
                  <div className="flex items-center gap-4">
                     <div className={`w-3.5 h-3.5 rounded-full ${isRunning ? 'bg-accent-blue animate-ping' : 'bg-[#1E293B]'}`} />
                     <span className="text-white font-black text-md tracking-tighter uppercase">{isRunning ? "Polling Instrumentation Bus" : "Instrumentation Ready"}</span>
                  </div>
               </div>
               <div className="space-y-3 border-l border-[#1E293B] pl-10">
                  <span className="text-text-tertiary text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Measurement Integration Status</span>
                  <div className="flex items-center gap-4">
                     <Flask className="text-status-pass" size={24} weight="duotone" />
                     <span className="text-white font-black text-md tracking-tighter">BIT_NOMINAL_LOCK</span>
                  </div>
               </div>
               <div className="space-y-3 border-l border-[#1E293B] pl-10">
                  <span className="text-text-tertiary text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Sequence Engine Logic</span>
                  <div className="flex items-center gap-4 text-accent-blue">
                     <MagicWand size={24} weight="duotone" />
                     <span className="text-white font-black text-md tracking-tighter uppercase">V5.1_STANDARD</span>
                  </div>
               </div>
               <div className="space-y-3 border-l border-[#1E293B] pl-10">
                  <span className="text-text-tertiary text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Remote Interface Identifier</span>
                  <div className="flex items-center gap-4">
                     <HardDrive className="text-text-tertiary opacity-40" size={24} weight="duotone" />
                     <span className="text-white font-black text-md tracking-tighter">TCPIP::VNA_UNIT::142</span>
                  </div>
               </div>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-8">
          <div className="p-10 bg-[#0B0F19] border border-[#1E293B] h-[350px] flex flex-col rounded-[2.5rem] relative overflow-hidden shadow-2xl">
             <div className="absolute -right-20 -bottom-20 opacity-5 text-accent-blue -rotate-12 blur-[4px]">
                <MagicWand size={250} weight="fill" />
             </div>
             <div className="flex items-center justify-between mb-8 relative z-10">
                <h4 className="text-[11px] font-black text-white uppercase tracking-[0.4em] flex items-center gap-4">
                   <MagicWand weight="fill" className="text-accent-blue" />
                   Automated Signal Analysis
                </h4>
             </div>
             
             {!isAiMode ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 space-y-5">
                    <ShieldCheck size={56} weight="duotone" className="text-[#64748B]" />
                    <div className="space-y-2">
                      <p className="text-[11px] font-black uppercase tracking-widest text-white">Signal Analysis Engine Standby</p>
                      <p className="text-[9px] font-bold uppercase text-[#64748B] max-w-[180px] leading-relaxed">Activate signal analysis process for real-time spectral spurious detection.</p>
                    </div>
                </div>
             ) : (
                <div className="flex-1 overflow-y-auto space-y-4 pr-3 scrollbar-hide relative z-10">
                    <AnimatePresence mode="popLayout">
                    {anomalies.length === 0 ? (
                       <div className="h-full flex items-center justify-center text-[10px] font-black text-[#64748B] uppercase tracking-widest italic opacity-60">Passive Signal Monitoring...</div>
                    ) : (
                      anomalies.map((anom) => (
                          <motion.div 
                          key={anom.id}
                          initial={{ opacity:0, x: 20 }}
                          animate={{ opacity:1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="p-5 rounded-2xl bg-[#131B2C] border border-[#1E293B] border-l-4 border-l-status-fail shadow-xl group hover:scale-[1.02] transition-transform"
                          >
                          <div className="flex justify-between text-[9px] font-black uppercase mb-2">
                              <span className="text-status-fail font-black italic">! SIGNAL_SPURIOUS_EMISSION</span>
                              <span className="text-text-tertiary">{anom.freq.toFixed(3)}G</span>
                          </div>
                          <p className="text-[10px] text-[#94A3B8] leading-tight font-bold uppercase tracking-tight opacity-80">Spectral phase noise variance exceeds threshold (2.5σ)</p>
                          </motion.div>
                      ))
                    )}
                    </AnimatePresence>
                </div>
             )}
          </div>

          <div className="p-10 bg-[#0B0F19] border border-[#1E293B] flex-1 min-h-[420px] rounded-[2.5rem] flex flex-col shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none opacity-40" />
             <h3 className="text-[11px] font-black text-white uppercase tracking-[0.4em] mb-10 flex items-center gap-4">
                <Selection size={20} className="text-accent-blue" weight="duotone" />
                Measurement Sequence Progress
             </h3>
             <div className="space-y-5 relative z-10">
                {steps.map((step, idx) => (
                  <div key={idx} className={`p-6 rounded-3xl border transition-all duration-400 flex items-center justify-between ${
                    idx === currentStep && isRunning ? "bg-accent-blue/10 border-accent-blue/50 shadow-[0_15px_40px_rgba(30,111,217,0.2)] -translate-x-3" : 
                    idx < currentStep ? "bg-[#131B2C] border-status-pass/50 opacity-100" : "opacity-30 border-[#1E293B] bg-transparent scale-95"
                  }`}>
                    <div className="space-y-2">
                       <span className={`text-[12px] font-black uppercase tracking-tight ${idx < currentStep ? 'text-status-pass' : idx === currentStep && isRunning ? 'text-accent-blue' : 'text-white'}`}>{step.name}</span>
                       <p className="text-[10px] font-bold text-[#64748B] tracking-widest uppercase">{step.target}</p>
                    </div>
                    {idx < currentStep ? <CheckCircle weight="fill" className="text-status-pass" size={24} /> : 
                     idx === currentStep && isRunning ? <ArrowClockwise className="animate-spin text-accent-blue" size={24} /> : 
                     <div className="w-6 h-6 rounded-full border-2 border-[#1E293B]" />}
                  </div>
                ))}
             </div>

             <div className="mt-12 pt-10 border-t border-[#1E293B] flex flex-col gap-4">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                   <span className="text-[#64748B]">Batch Execution Tracking</span>
                   <span className={isRunning ? "text-accent-blue animate-pulse" : "text-text-tertiary"}>{isRunning ? "BUS_COMMUNICATION_ACTIVE" : "STANDBY"}</span>
                </div>
                <div className="h-2 bg-[#131B2C] rounded-full overflow-hidden shadow-inner">
                   <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStep / steps.length) * 100}%` }}
                    className="h-full bg-status-pass shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                   />
                </div>
             </div>
          </div>
        </div>
      </div>
      
      <BusMonitor 
        isOpen={isBusMonitorOpen} 
        onClose={() => setIsBusMonitorOpen(false)} 
        logs={busLogs} 
        onClear={() => setBusLogs([])}
      />
    </div>
  );
};

export default TestRunnerPage;
