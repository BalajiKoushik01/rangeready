import React, { useState } from 'react';
import { 
  Pulse, 
  ArrowRight, 
  CheckCircle, 
  Warning, 
  Flask,
  Target,
  ArrowClockwise,
  Selection,
  SelectionAll,
  HardDrive
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';

type CalStep = 'IDLE' | 'OPEN' | 'SHORT' | 'LOAD' | 'THRU' | 'VERIFY';

export const CalibrationPage: React.FC = () => {
    const [currentStep, setCurrentStep] = useState<CalStep>('IDLE');
    const [capturedSteps, setCapturedSteps] = useState<CalStep[]>([]);
    const [isCalibrating, setIsCalibrating] = useState(false);

    const steps = [
        { id: 'OPEN', label: 'Open Standard', desc: 'S11 Reflex (Infinite Impedance)', icon: <Target weight="duotone" size={24} /> },
        { id: 'SHORT', label: 'Short Standard', desc: 'S11 Reflex (Zero Impedance)', icon: <SelectionAll weight="duotone" size={24} /> },
        { id: 'LOAD', label: 'Load Standard', desc: 'Matched 50Ω Termination', icon: <Selection weight="duotone" size={24} /> },
        { id: 'THRU', label: 'Through Link', desc: 'S21 Transmission Path', icon: <ArrowRight weight="duotone" size={24} /> }
    ];

    const captureReflect = async (id: CalStep) => {
        setIsCalibrating(true);
        // Simulate real VISA command fetch for V5.0
        await new Promise(r => setTimeout(r, 2500));
        setCapturedSteps(prev => [...prev, id]);
        setIsCalibrating(false);
        if (id === 'THRU') setCurrentStep('VERIFY');
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 relative min-h-screen">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 rounded-3xl bg-accent-blue/10 text-accent-blue shadow-glow-blue border border-accent-blue/20">
                        <Flask weight="duotone" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-text-primary tracking-tight uppercase italic">Calibration Matrix</h1>
                        <p className="text-sm text-text-secondary font-black tracking-widest uppercase opacity-70">OSLT Vector Precision · 1-Port / 2-Port</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                        <HardDrive size={16} className="text-accent-blue" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary italic">Siglent SSA-A123</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <GlassCard level={2} className="p-10 min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-3xl border-white/5">
                        <div className="absolute top-0 left-0 w-full h-1 bg-white/5" />
                        
                        <AnimatePresence mode="wait">
                            {currentStep === 'IDLE' ? (
                                <motion.div 
                                    key="idle"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-center space-y-8"
                                >
                                    <div className="w-24 h-24 rounded-full bg-accent-blue/10 flex items-center justify-center mx-auto border border-accent-blue/30 shadow-glow-blue">
                                        <Pulse size={48} className="text-accent-blue animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Initialize Lab Phase</h3>
                                        <p className="text-text-tertiary text-sm tracking-widest uppercase font-black opacity-50 max-w-lg mx-auto">Precision vector calibration is NOT optional for high-throughput RF qualification. Ensure all standard connections are torqued.</p>
                                    </div>
                                    <button 
                                        onClick={() => setCurrentStep('OPEN')}
                                        className="px-10 py-5 bg-accent-blue text-white rounded-2xl font-black text-lg shadow-2xl shadow-accent-blue/40 transform hover:-translate-y-1 transition-all"
                                    >
                                        BEGIN OSLT SEQUENCE
                                    </button>
                                </motion.div>
                            ) : currentStep === 'VERIFY' ? (
                                <motion.div 
                                    key="verify"
                                    className="text-center space-y-6"
                                >
                                    <CheckCircle size={80} weight="fill" className="text-status-pass mx-auto" />
                                    <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">CALIBRATION ACTIVE</h2>
                                    <p className="text-text-tertiary uppercase font-black tracking-widest opacity-60">Correction Coefficients Successfully Transferred to Instrument DSP Layer.</p>
                                    <div className="grid grid-cols-3 gap-8 mt-12 py-8 border-y border-white/5">
                                        <div>
                                            <div className="text-[10px] font-black text-text-tertiary uppercase mb-2">Phase Stability</div>
                                            <div className="text-2xl font-black text-status-pass italic">OPTIMAL</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-text-tertiary uppercase mb-2">Error Factor</div>
                                            <div className="text-2xl font-black text-white italic">0.0014</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-text-tertiary uppercase mb-2">Valid Until</div>
                                            <div className="text-2xl font-black text-accent-blue italic tracking-tighter">24 HR</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setCurrentStep('IDLE');
                                            setCapturedSteps([]);
                                        }}
                                        className="mt-8 text-sm font-black text-text-tertiary hover:text-white transition-all uppercase tracking-[10px] opacity-40 hover:opacity-100"
                                    >
                                        Exit Sequence
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="calibrating"
                                    className="w-full space-y-12"
                                    initial={{ opacity:0, x: 20 }}
                                    animate={{ opacity:1, x: 0 }}
                                >
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <span className="text-[10px] font-black text-accent-blue uppercase tracking-[10px] opacity-50">CURRENT PHASE</span>
                                            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">{currentStep}</h2>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-text-tertiary uppercase italic mb-1">Real-time DSP status</div>
                                            <div className="text-xl font-black text-status-pass animate-pulse font-mono tracking-tighter">
                                                {isCalibrating ? "SWEEPING_RAW_DATA..." : "AWAITING_TRIGGER"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div 
                                            className="absolute top-0 left-0 h-full bg-accent-blue shadow-glow-blue"
                                            initial={{ width: "0%" }}
                                            animate={{ width: isCalibrating ? "100%" : "0%" }}
                                            transition={{ duration: 2.5, ease: "linear" }}
                                        />
                                    </div>

                                    <div className="p-10 bg-white/[0.02] border border-white/10 rounded-[40px] flex items-center justify-between group hover:border-white/20 transition-all">
                                        <div className="space-y-2">
                                            <h4 className="text-xl font-black text-text-primary uppercase tracking-tight italic">Connect {currentStep} Standard</h4>
                                            <p className="text-[10px] text-text-tertiary font-bold leading-relaxed max-w-md uppercase tracking-widest opacity-60">Ensure 8 lb-in torque is applied. Phase drift detected above 2GHz will invalidate this calibration set automatically.</p>
                                        </div>
                                        <button 
                                            disabled={isCalibrating}
                                            onClick={() => captureReflect(currentStep)}
                                            className={`px-12 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                                                isCalibrating 
                                                    ? 'bg-status-pass/20 text-status-pass cursor-wait' 
                                                    : 'bg-white text-black hover:bg-accent-blue hover:text-white shadow-2xl'
                                            }`}
                                        >
                                            {isCalibrating ? (
                                                <div className="flex items-center gap-2">
                                                    <ArrowClockwise className="animate-spin" size={18} />
                                                    Capturing...
                                                </div>
                                            ) : "Acquire Matrix"}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </GlassCard>
                </div>

                <div className="space-y-6">
                    <GlassCard level={1} className="p-6 h-fit bg-black/20 border-white/5">
                        <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[5px] mb-8 opacity-50 italic">Full OSLT Stack</h3>
                        <div className="space-y-4">
                            {steps.map((step) => (
                                <div 
                                    key={step.id} 
                                    className={`p-5 rounded-3xl border transition-all duration-700 relative overflow-hidden group ${
                                        capturedSteps.includes(step.id as CalStep) 
                                            ? "bg-status-pass/10 border-status-pass/20" 
                                            : currentStep === step.id 
                                                ? "bg-accent-blue/10 border-accent-blue/30 shadow-glow-blue/20" 
                                                : "bg-white/5 border-white/5 opacity-20"
                                    }`}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`p-3 rounded-2xl transition-colors ${capturedSteps.includes(step.id as CalStep) ? 'bg-status-pass/20 text-status-pass' : 'bg-accent-blue/20 text-accent-blue'}`}>
                                            {step.icon}
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-black text-text-primary uppercase tracking-tight italic">{step.label}</div>
                                            <div className="text-[9px] font-bold text-text-tertiary uppercase tracking-tighter opacity-70 truncate max-w-[120px]">{step.desc}</div>
                                        </div>
                                    </div>
                                    {capturedSteps.includes(step.id as CalStep) && (
                                        <CheckCircle className="absolute right-6 top-1/2 -translate-y-1/2 text-status-pass" weight="fill" size={24} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard level={3} className="p-6 bg-status-fail/5 border-status-fail/10 backdrop-blur-3xl">
                         <div className="flex items-center gap-2 text-status-fail text-[10px] font-black uppercase mb-4 tracking-widest italic">
                            <Warning weight="fill" />
                            Hardware Guard
                         </div>
                         <p className="text-[9px] text-text-secondary leading-relaxed font-black uppercase opacity-60">Correction is limited to 3.2GHz for the current instrument model. Full phase correlation required for V5.0 compliance.</p>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
