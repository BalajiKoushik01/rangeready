import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { 
  Play, 
  Stop, 
  ArrowClockwise, 
  CheckCircle, 
  Warning,
  Pulse,
  MagicWand,
  Target,
  Flask,
  TerminalWindow,
  ChartBar,
  HardDrive,
  Selection
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassConsole } from '../components/ui/GlassConsole';

interface TracePoint {
  freq: number;
  amp: number;
}

interface Anomaly {
  id: string;
  freq: number;
  amp: number;
  message: string;
  timestamp: number;
}

export const TestRunnerPage: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [traceData, setTraceData] = useState<TracePoint[]>([]);
  const [secondaryTraceData, setSecondaryTraceData] = useState<TracePoint[]>([]);
  const [goldenTrace, setGoldenTrace] = useState<TracePoint[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [showGolden, setShowGolden] = useState(true);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  
  // Advanced Marker State
  const [peak, setPeak] = useState<TracePoint | null>(null);
  const [bandwidth, setBandwidth] = useState<number>(0);
  const [qFactor, setQFactor] = useState<number>(0);

  // Mock steps
  const steps = [
    { name: "S11 Return Loss", target: "1.0 - 2.0 GHz", limit: -12 },
    { name: "VSWR Check", target: "1.0 - 2.0 GHz", limit: 1.5 },
    { name: "S21 Insertion Loss", target: "1.0 - 2.0 GHz", limit: -2 }
  ];

  // Initialize Golden Sample
  useEffect(() => {
    const points: TracePoint[] = [];
    for(let i=0; i<100; i++) {
        points.push({
            freq: 1.0 + (i * 0.01),
            amp: -18 + Math.sin(i * 0.2) * 2
        });
    }
    setGoldenTrace(points);
  }, []);

  // Intelligence HUD Update
  useEffect(() => {
    if (traceData.length > 0) {
      const p = traceData.reduce((prev, curr) => (prev.amp > curr.amp) ? prev : curr);
      setPeak(p);
      
      // Simulate real-time BW/Q calculation
      if (p.amp > -15) {
         setBandwidth(0.12);
         setQFactor(p.freq / 0.12);
      } else {
         setBandwidth(0);
         setQFactor(0);
      }
    }
  }, [traceData]);

  // WebSocket / Simulation
  useEffect(() => {
    let interval: any;
    if (isRunning) {
      setStatus("running");
      let points = 0;
      interval = setInterval(() => {
        if (points < 100) {
          const freq = 1.0 + (points * 0.01);
          const isAnomaly = Math.random() > 0.98; 
          const baseAmp = -18 + Math.sin(points * 0.2) * 5;
          const noise = (Math.random() * 1.5);
          const amp = isAnomaly ? baseAmp + 15 : baseAmp + noise;

          setTraceData(prev => [...prev.slice(-60), { freq, amp }]); 
          setSecondaryTraceData(prev => [...prev.slice(-60), { freq, amp: amp - 10 + Math.sin(points * 0.5) * 3 }]);
          
          if (isAnomaly) {
            setAnomalies(prev => [{
              id: Math.random().toString(36),
              freq,
              amp,
              message: "Phase glitched at " + freq.toFixed(2),
              timestamp: Date.now()
            }, ...prev].slice(0, 3));
          }
          points++;
        } else {
          setIsRunning(false);
          setStatus("completed");
          clearInterval(interval);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const startTest = () => {
    setTraceData([]);
    setSecondaryTraceData([]);
    setAnomalies([]);
    setIsRunning(true);
    setCurrentStep(0);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-3xl shadow-glow-blue border border-accent-blue/20 ${isRunning ? 'bg-accent-blue/10 text-accent-blue animate-pulse' : 'bg-white/5 text-text-tertiary'}`}>
            <Pulse weight="duotone" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Intelligence Runner</h1>
            <p className="text-sm text-text-secondary font-black tracking-widest uppercase opacity-70">Universal VNA Orchestrator · PHASE-3</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 mr-4">
              <button 
                onClick={() => setIsSplitView(!isSplitView)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${isSplitView ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40' : 'text-text-tertiary hover:text-text-secondary'}`}
              >
                <Selection size={14} />
                {isSplitView ? "Dual Monitor" : "Matrix Mode"}
              </button>
              <button 
                onClick={() => setShowGolden(!showGolden)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${showGolden ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40' : 'text-text-tertiary hover:text-text-secondary'}`}
              >
                <Target size={14} />
                Golden
              </button>
              <button 
                onClick={() => setIsConsoleOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-text-tertiary hover:text-accent-blue transition-all text-[10px] font-black uppercase tracking-widest"
              >
                <TerminalWindow size={16} />
                Console
              </button>
           </div>

           <button 
             onClick={startTest}
             disabled={isRunning}
             className="flex items-center gap-2 px-8 py-4 bg-accent-blue text-white rounded-2xl font-black shadow-xl shadow-accent-blue/40 hover:bg-accent-blue-lume hover:-translate-y-1 transition-all disabled:opacity-50 active:scale-95 group"
           >
             {isRunning ? <ArrowClockwise className="animate-spin" size={24} /> : <Play weight="fill" size={24} className="group-hover:scale-110 transition-transform" />}
             Sweep
           </button>
           <button 
             onClick={() => setIsRunning(false)}
             className="p-3 bg-white/10 border border-white/20 text-status-fail rounded-2xl hover:bg-status-fail/20 transition-all"
           >
             <Stop weight="fill" size={24} />
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <GlassCard level={2} className="p-8 min-h-[550px] flex flex-col relative overflow-hidden backdrop-blur-3xl">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent-blue/10 blur-[100px] pointer-events-none" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-black text-text-primary uppercase tracking-widest flex items-center gap-2">
                   <ChartBar className="text-accent-blue" weight="duotone" />
                   {isSplitView ? "Synchronized Dual-Channel View" : "Primary Measurement Matrix"}
                </h3>
              </div>
            </div>
            
            <div className={`flex-1 flex gap-8 relative z-10 ${isSplitView ? 'flex-row' : 'flex-col'}`}>
              <div className="flex-1 w-full relative">
                <div className="absolute top-2 left-2 text-[8px] font-black uppercase text-accent-blue opacity-50 z-20">CHANNEL_01 (S11)</div>
                <ResponsiveContainer width="100%" height={isSplitView ? 350 : 450}>
                  <LineChart data={traceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis 
                      dataKey="freq" 
                      type="number" 
                      domain={[1.0, 2.0]} 
                      stroke="rgba(255,255,255,0.4)" 
                      fontSize={8} 
                      tickFormatter={(val) => val.toFixed(2) + "G"}
                    />
                    <YAxis 
                      domain={[-40, 0]} 
                      stroke="rgba(255,255,255,0.4)" 
                      fontSize={8} 
                      tickFormatter={(val) => val + "dB"}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 15, 15, 0.9)', 
                        backdropFilter: 'blur(20px)', 
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        fontSize: '10px'
                      }} 
                    />
                    {showGolden && (
                      <Line data={goldenTrace} type="monotone" dataKey="amp" stroke="rgba(255,255,255,0.05)" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                    )}
                    <Line type="monotone" dataKey="amp" stroke="#1E6FD9" strokeWidth={2} dot={false} animationDuration={0} />
                    {peak && <ReferenceLine x={peak.freq} stroke="rgba(30,111,217,0.2)" strokeDasharray="3 3" />}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {isSplitView && (
                <div className="flex-1 w-full relative border-l border-white/5 pl-8">
                  <div className="absolute top-2 left-10 text-[8px] font-black uppercase text-status-pass opacity-50 z-20">CHANNEL_02 (S21)</div>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={secondaryTraceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="freq" type="number" domain={[1.0, 2.0]} stroke="rgba(255,255,255,0.4)" fontSize={8} tickFormatter={(val) => val.toFixed(2) + "G"} />
                      <YAxis domain={[-40, 0]} stroke="rgba(255,255,255,0.4)" fontSize={8} tickFormatter={(val) => val + "dB"} />
                      <Line type="monotone" dataKey="amp" stroke="#10B981" strokeWidth={2} dot={false} animationDuration={0} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Floating Intelligence Markers */}
              <div className="absolute top-12 left-4 flex flex-col gap-3 pointer-events-none z-20">
                 {peak && (
                   <GlassCard level={3} className="p-4 bg-black/60 border-white/10 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[8px] font-black uppercase text-accent-blue tracking-widest">
                         <Target size={12} />
                         Peak Info
                      </div>
                      <div className="text-lg font-black text-white">{peak.freq.toFixed(4)} G</div>
                      <div className="text-xs font-bold text-status-pass">{peak.amp.toFixed(1)} dB</div>
                   </GlassCard>
                 )}
                 
                 {bandwidth > 0 && (
                    <GlassCard level={3} className="p-4 bg-accent-blue/10 border-accent-blue/20 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[8px] font-black uppercase text-accent-blue tracking-widest">
                         <ChartBar size={12} />
                         -3dB BW
                      </div>
                      <div className="text-md font-black text-white">{(bandwidth * 1000).toFixed(0)} MHz</div>
                      <div className="text-[9px] font-black text-text-tertiary">Q: {qFactor.toFixed(1)}</div>
                    </GlassCard>
                 )}
              </div>
            </div>

            {/* AI Insights HUD Footer */}
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-8 pt-8 border-t border-white/5 relative z-10">
               <div className="space-y-1">
                  <span className="text-text-tertiary text-[9px] font-black uppercase tracking-widest">Sweep Status</span>
                  <div className="flex items-center gap-2">
                     <Pulse className={isRunning ? "text-accent-blue animate-pulse" : "text-text-tertiary"} size={18} />
                     <span className="text-text-primary font-black text-md tracking-tighter">{isRunning ? "RUNNING" : "IDLE"}</span>
                  </div>
               </div>
               <div className="space-y-1 border-l border-white/5 pl-8">
                  <span className="text-text-tertiary text-[9px] font-black uppercase tracking-widest">RF Integrity</span>
                  <div className="flex items-center gap-2">
                     <Flask className="text-status-pass" size={18} />
                     <span className="text-text-primary font-black text-md">OPTIMAL</span>
                  </div>
               </div>
               <div className="space-y-1 border-l border-white/5 pl-8">
                  <span className="text-text-tertiary text-[9px] font-black uppercase tracking-widest">Precision</span>
                  <div className="flex items-center gap-2 text-accent-blue">
                     <MagicWand size={18} />
                     <span className="text-text-primary font-black text-md">ISRO-3</span>
                  </div>
               </div>
               <div className="space-y-1 border-l border-white/5 pl-8">
                  <span className="text-text-tertiary text-[9px] font-black uppercase tracking-widest">Hardware</span>
                  <div className="flex items-center gap-2">
                     <HardDrive className="opacity-50" size={18} />
                     <span className="text-text-primary font-black text-md">SIGLENT Native</span>
                  </div>
               </div>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard level={3} className="p-6 bg-status-fail/5 border-status-fail/20 h-[300px] flex flex-col">
             <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black text-status-fail uppercase tracking-widest flex items-center gap-2">
                   <Warning weight="fill" />
                   AI Anomaly engine
                </h4>
             </div>
             
             <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                <AnimatePresence mode="popLayout">
                  {anomalies.map((anom) => (
                    <motion.div 
                      key={anom.id}
                      initial={{ opacity:0, y: 10 }}
                      animate={{ opacity:1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10"
                    >
                       <div className="flex justify-between text-[8px] font-black uppercase mb-1">
                          <span className="text-status-fail">Glitch Detected</span>
                          <span className="text-text-tertiary">@{anom.freq.toFixed(2)} G</span>
                       </div>
                       <p className="text-[9px] text-text-secondary leading-tight opacity-70">Spike detected above floor.</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
             </div>
          </GlassCard>

          <GlassCard level={1} className="p-6 flex-1 min-h-[350px]">
             <h3 className="text-[10px] font-black text-text-primary uppercase tracking-widest mb-6">Automation Stack</h3>
             <div className="space-y-3">
                {steps.map((step, idx) => (
                  <div key={idx} className={`p-4 rounded-3xl border transition-all ${
                    idx === currentStep && isRunning ? "bg-accent-blue/10 border-accent-blue/30" : 
                    idx < currentStep ? "bg-status-pass/5 border-status-pass/10" : "opacity-30 border-white/5"
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-[10px] font-black text-text-primary uppercase">{step.name}</span>
                       {idx < currentStep && <CheckCircle weight="fill" className="text-status-pass" size={14} />}
                    </div>
                    <span className="text-[8px] font-bold text-text-tertiary tracking-widest uppercase">{step.target}</span>
                  </div>
                ))}
             </div>
          </GlassCard>
        </div>
      </div>
      
      <GlassConsole isOpen={isConsoleOpen} onClose={() => setIsConsoleOpen(false)} />
    </div>
  );
};
