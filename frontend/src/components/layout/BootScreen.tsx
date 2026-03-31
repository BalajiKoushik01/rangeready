import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GvbLogo } from '../ui/Logo';

interface BootScreenProps {
  onBootComplete: () => void;
}

export const BootScreen: React.FC<BootScreenProps> = ({ onBootComplete }) => {
  const [status, setStatus] = useState("Initializing System...");
  
  useEffect(() => {
    const sequence = async () => {
      await new Promise(r => setTimeout(r, 1200));
      setStatus("Loading Calibration Data...");
      await new Promise(r => setTimeout(r, 1000));
      setStatus("Connecting to Analysis Engine...");
      await new Promise(r => setTimeout(r, 800));
      setStatus("Ready.");
      await new Promise(r => setTimeout(r, 500));
      onBootComplete();
    };
    
    sequence();
  }, [onBootComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#F8F7F4] overflow-hidden">
      {/* Dynamic Background Gradient */}
      <motion.div 
        className="absolute inset-0 opacity-40"
        animate={{ 
          background: [
            "radial-gradient(circle at 20% 20%, #E8F1FF 0%, transparent 50%)",
            "radial-gradient(circle at 80% 80%, #E8F1FF 0%, transparent 50%)",
            "radial-gradient(circle at 20% 20%, #E8F1FF 0%, transparent 50%)"
          ] 
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      <div className="flex flex-col items-center">
        {/* Animated Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <GvbLogo size={120} />
        </motion.div>

        {/* Text Reveal */}
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1.2 }}
            className="mt-8 text-center"
        >
            <h1 className="text-3xl font-bold tracking-[0.2em] uppercase text-text-primary">
                GVB TECH SOLUTIONS
            </h1>
            <p className="mt-2 text-sm font-medium tracking-[0.4em] uppercase text-text-tertiary">
                Precision RF Platform
            </p>
        </motion.div>

        {/* Loading Indicator */}
        <div className="mt-16 w-64 h-[1px] bg-border-subtle relative overflow-hidden">
            <motion.div 
                className="absolute inset-0 bg-accent-blue"
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 3.5, ease: "easeInOut" }}
            />
        </div>
        
        <AnimatePresence mode="wait">
            <motion.p 
                key={status}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-4 text-[10px] font-mono tracking-[0.1em] uppercase text-text-tertiary"
            >
                {status}
            </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};
