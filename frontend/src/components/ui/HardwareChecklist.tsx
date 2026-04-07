import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plug, 
  Globe, 
  ShieldCheck, 
  CaretRight, 
  CaretLeft, 
  CheckCircle,
  Gear,
  HardDrive
} from '@phosphor-icons/react';

interface ChecklistStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
}

const STEPS: ChecklistStep[] = [
  {
    title: "Primary Power Interface",
    description: "Ensure the Instrument Mainframe (VNA/SA) is connected to a stabilized 230V AC source. Verify the Power LED is green and the internal fan is operational.",
    icon: <Plug weight="duotone" size={32} />,
    action: "Power ON & Warm-up (15m recommended)"
  },
  {
    title: "Physical Layer (TCPIP/LAN)",
    description: "Connect a high-speed Cat6 Ethernet cable between the Control Hub and the Instrument LAN port. Ensure the Link status LED is active.",
    icon: <Globe weight="duotone" size={32} />,
    action: "Verify IP: 192.168.1.142"
  },
  {
    title: "VISA Runtime Environment",
    description: "Confirm National Instruments (NI-VISA) or Keysight IO Libraries are active in the background. The VXI-11 protocol must be unblocked by system firewall.",
    icon: <HardDrive weight="duotone" size={32} />,
    action: "Check NI-MAX / IO Libraries"
  },
  {
    title: "Bus Loopback (*IDN?)",
    description: "Execute a mandatory identity query to ensure the command bus is open. The instrument must return a valid Model & Serial Number string.",
    icon: <ShieldCheck weight="duotone" size={32} />,
    action: "Run Manual *IDN? Query"
  }
];

interface HardwareChecklistProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
}

export const HardwareChecklist: React.FC<HardwareChecklistProps> = ({ isOpen, onComplete, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-2xl bg-[#0B0F19] border border-[#1E293B] rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="h-1 bg-[#131B2C] w-full flex">
          {STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`h-full transition-all duration-500 ${i <= currentStep ? 'bg-accent-blue' : 'bg-transparent'}`}
              style={{ width: `${100 / STEPS.length}%` }}
            />
          ))}
        </div>

        <div className="p-10">
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#131B2C] border border-[#1E293B] rounded-xl text-accent-blue">
                <Gear weight="bold" size={24} className="animate-spin-slow" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Industrial Connection Checklist</h2>
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Protocol V5.1 | Mandatory First-Time Initialization</p>
              </div>
            </div>
            <div className="text-[11px] font-black font-mono text-accent-blue">
              STEP {currentStep + 1} / {STEPS.length}
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-[220px] flex flex-col items-center text-center justify-center space-y-6"
            >
              <div className="p-6 bg-accent-blue/10 border border-accent-blue/30 rounded-3xl text-accent-blue shadow-[0_0_40px_rgba(30,111,217,0.15)]">
                {STEPS[currentStep].icon}
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">{STEPS[currentStep].title}</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed max-w-md mx-auto font-medium">
                  {STEPS[currentStep].description}
                </p>
              </div>
              <div className="px-4 py-2 bg-[#131B2C] border border-[#1E293B] rounded-md">
                <span className="text-[10px] font-black text-accent-blue-lume uppercase tracking-widest">{STEPS[currentStep].action}</span>
              </div>
            </motion.div>
          </AnimatePresence>

          <footer className="flex items-center justify-between mt-12 pt-8 border-t border-[#1E293B]">
            <button
              onClick={currentStep === 0 ? onClose : handleBack}
              className="flex items-center gap-2 px-6 py-3 text-[10px] font-black text-text-tertiary uppercase tracking-widest hover:text-white transition-colors"
            >
              <CaretLeft weight="bold" size={16} />
              {currentStep === 0 ? "Abort Setup" : "Previous Stage"}
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-4 px-10 py-4 bg-accent-blue text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-accent-blue/30 hover:bg-[#2563EB] hover:-translate-y-1 transition-all active:scale-95"
            >
              {currentStep === STEPS.length - 1 ? (
                <>
                  Establish Connection
                  <CheckCircle weight="fill" size={20} />
                </>
              ) : (
                <>
                  Validate & Proceed
                  <CaretRight weight="bold" size={16} />
                </>
              )}
            </button>
          </footer>
        </div>
      </motion.div>
    </div>
  );
};
