import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoImg from '../../assets/logo.png';

/**
 * GVB Tech High-Fidelity Launch Sequence
 * Featuring the 'Liquid Glass' brand shield and holographic loading telemetry.
 */
export const LaunchOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [loadingText, setLoadingText] = useState('Initializing Matrix...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const loadingSteps = [
      'Initializing Matrix...',
      'Linking VISA Resource Layer...',
      'Loading OSLT Coefficients...',
      'Verifying ISRO-PHASE-3 Protocol...',
      'System Ready.'
    ];
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length - 1) {
        currentStep++;
        setLoadingText(loadingSteps[currentStep]);
        setProgress((currentStep / (loadingSteps.length - 1)) * 100);
      } else {
        clearInterval(interval);
        setTimeout(() => setIsVisible(false), 800);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="fixed inset-0 z-[999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 1.2, ease: "circOut" }}
        >
          {/* Luminous Core Glow */}
          <div className="absolute w-[600px] h-[600px] bg-accent-blue/5 blur-[150px] rounded-full" />
          
          <div className="relative z-10 flex flex-col items-center">
            {/* Animated Logo Shield */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-accent-blue/20 blur-[60px] rounded-full scale-125 opacity-50 group-hover:opacity-100 transition-opacity" />
              <img 
                src={logoImg} 
                alt="GVB Tech" 
                className="w-48 h-48 object-contain relative z-20 drop-shadow-[0_0_30px_rgba(30,111,217,0.4)]" 
              />
            </motion.div>

            {/* GVB TECH Logotype (from logo image typography) */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1.5 }}
              className="mt-8 flex flex-col items-center"
            >
                <h1 className="text-4xl font-black text-white italic tracking-[15px] uppercase select-none opacity-90">GVB TECH</h1>
                <p className="mt-2 text-[10px] font-bold text-accent-blue tracking-[10px] uppercase opacity-60">Professional RF Intelligence</p>
            </motion.div>

            {/* Telemetry Loader */}
            <div className="mt-24 w-64 space-y-4">
               <div className="flex justify-between items-end">
                   <div className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">{loadingText}</div>
                   <div className="text-[9px] font-mono text-accent-blue">{Math.round(progress)}%</div>
               </div>
               <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     className="h-full bg-accent-blue shadow-glow-blue"
                     initial={{ width: "0%" }}
                     animate={{ width: `${progress}%` }}
                     transition={{ duration: 0.8 }}
                   />
               </div>
            </div>
          </div>

          {/* Corner Metadata (Industry Feel) */}
          <div className="absolute bottom-10 left-10 text-[8px] font-black text-text-tertiary uppercase tracking-widest opacity-20">
             Build V5.0.4-STABLE // ISRO_SPEC
          </div>
          <div className="absolute bottom-10 right-10 text-[8px] font-black text-text-tertiary uppercase tracking-widest opacity-20">
             © 2026 GVB LABS CORE
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
