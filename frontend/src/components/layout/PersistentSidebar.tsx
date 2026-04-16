import React, { useState, useCallback, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  House,
  Pulse,
  ClockCounterClockwise,
  Gear,
  CaretDoubleLeft,
  CaretDoubleRight,
  ShieldCheck,
  HardDrives,
  Flask,
  Cpu,
  Joystick,
  TerminalWindow
} from "@phosphor-icons/react";
import { GvbLogo } from "../ui/Logo";
import { useLocalStorage } from "../../hooks/useLocalStorage";

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const COLLAPSED_WIDTH = 64;

export const PersistentSidebar: React.FC = () => {
  const [width, setWidth] = useLocalStorage<number>("sidebar-width", 260);
  const [isCollapsed, setIsCollapsed] = useLocalStorage<boolean>("sidebar-collapsed", false);
  const [isResizing, setIsResizing] = useState(false);
  
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
          setWidth(newWidth);
        }
      }
    },
    [isResizing, setWidth]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

    const mainNav = [
    { name: "RF System Dashboard", path: "/dashboard", icon: <House weight="fill" size={24} /> },
    { name: "Master Hardware Control", path: "/control", icon: <Joystick weight="duotone" size={24} /> },
    { name: "SCPI Instrumentation Control", path: "/runner", icon: <Pulse weight="duotone" size={24} /> },
    { name: "Equipment Logistics Registry", path: "/registry", icon: <HardDrives weight="duotone" size={24} /> },
    { name: "Vector Network Analysis Interface", path: "/calibration", icon: <Flask weight="duotone" size={24} /> },
    { name: "Measurement History and Logs", path: "/history", icon: <ClockCounterClockwise weight="bold" size={24} /> },
    { name: "Automated Test Procedure Engine", path: "/templates", icon: <ShieldCheck weight="duotone" size={24} /> },
    { name: "Hardware Configuration and Settings", path: "/settings", icon: <Gear weight="fill" size={24} /> },
    { name: "Advanced Signal Processing", path: "/intelligence", icon: <Cpu weight="duotone" size={24} /> },
    { name: "SCPI Terminal Console", path: "/scpi", icon: <TerminalWindow weight="duotone" size={24} /> },
  ];

  const renderNavGroup = (items: typeof mainNav, title?: string) => (
    <div className="space-y-1">
      {title && !isCollapsed && (
        <div className="px-4 pt-4 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic">
          {title}
        </div>
      )}
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex items-center gap-4 px-3 py-3 rounded-lg transition-all duration-150 group ${
              isActive 
                ? "nav-active" 
                : "text-text-tertiary hover:bg-[#131B2C] hover:text-white"
            }`
          }
        >
          <span className="flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">{item.icon}</span>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
              >
                {item.name}
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
      ))}
    </div>
  );

  return (
    <motion.div
      ref={sidebarRef}
      initial={false}
      animate={{ width: isCollapsed ? COLLAPSED_WIDTH : width }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative flex flex-col h-screen bg-[#0B0F19] border-r border-[#1E293B] shadow-[4px_0_24px_rgba(0,0,0,0.5)] select-none z-50"
    >
      {/* Logo Area */}
      <div className="flex items-center justify-center h-20 border-b border-[#1E293B]">
        <GvbLogo size={isCollapsed ? 32 : 40} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-6 overflow-y-auto scrollbar-hide">
        {renderNavGroup(mainNav)}
      </nav>

      {/* Footer / Collapse Toggle */}
      <div className="p-3 border-t border-glass-border/50">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-center w-full h-10 rounded-lg text-text-tertiary hover:bg-glass-border/30 hover:text-text-primary transition-colors"
        >
          {isCollapsed ? <CaretDoubleRight size={20} /> : <CaretDoubleLeft size={20} />}
        </button>
      </div>

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          onMouseDown={startResizing}
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize transition-all ${
            isResizing ? "bg-accent-blue/50" : "hover:bg-accent-blue/20"
          }`}
        />
      )}
    </motion.div>
  );
};
