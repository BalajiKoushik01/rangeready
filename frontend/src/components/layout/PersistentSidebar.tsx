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
  Flask
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

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: <House weight="duotone" size={24} /> },
    { name: "Intelligence Runner", path: "/runner", icon: <Pulse weight="duotone" size={24} /> },
    { name: "Asset Registry", path: "/registry", icon: <HardDrives weight="duotone" size={24} /> },
    { name: "Calibration Matrix", path: "/calibration", icon: <Flask weight="duotone" size={24} /> },
    { name: "Measurement History", path: "/history", icon: <ClockCounterClockwise weight="duotone" size={24} /> },
    { name: "Test Templates", path: "/templates", icon: <ShieldCheck weight="duotone" size={24} /> },
    { name: "System Settings", path: "/settings", icon: <Gear weight="duotone" size={24} /> },
  ];

  return (
    <motion.div
      ref={sidebarRef}
      initial={false}
      animate={{ width: isCollapsed ? COLLAPSED_WIDTH : width }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative flex flex-col h-screen bg-bg-surface/60 backdrop-blur-xl border-r border-glass-border select-none"
    >
      {/* Logo Area */}
      <div className="flex items-center justify-center h-20 border-b border-glass-border/50">
        <GvbLogo size={isCollapsed ? 32 : 40} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? "bg-accent-blue/10 text-accent-blue shadow-[0_0_20px_rgba(30,111,217,0.1)]" 
                  : "text-text-secondary hover:bg-glass-border/30 hover:text-text-primary"
              }`
            }
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-label text-sm font-medium whitespace-nowrap"
                >
                  {item.name}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
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
