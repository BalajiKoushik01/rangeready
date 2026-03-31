import React from "react";
import { Outlet } from "react-router-dom";
import { PersistentSidebar } from "./PersistentSidebar";

export const Layout: React.FC = () => {
  return (
    <div className="flex h-screen w-full bg-[#F8F7F4] overflow-hidden">
      {/* Resizable & Collapsible Sidebar */}
      <PersistentSidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-screen">
        {/* Dynamic Background Noise/Texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')]" />
        
        {/* Content Wrapper */}
        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
