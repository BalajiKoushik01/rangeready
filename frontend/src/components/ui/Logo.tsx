import React from 'react';
import logoImg from '../../assets/logo.png';

/**
 * GVB Tech Official Logo integration
 * Utilizing the high-fidelity 'Liquid Glass' shield.
 */
export const GvbLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Background Luminous Effect */}
      <div 
        className="absolute inset-0 bg-accent-blue/10 blur-[40px] rounded-full scale-110 pointer-events-none" 
      />
      
      {/* Official Brand Shield */}
      <img 
        src={logoImg} 
        alt="GVB Tech Logo" 
        className="relative z-10 w-full h-full object-contain pointer-events-none"
        style={{
          filter: 'drop-shadow(0 0 15px rgba(30, 111, 217, 0.3))'
        }}
      />
    </div>
  );
};
