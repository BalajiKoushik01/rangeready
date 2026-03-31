import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  level?: 1 | 2 | 3;
}

/**
 * RangeReady Glass Card Component
 * Implements the three levels of the Liquid Glass system (Section 3.3)
 */
export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = "", 
  level = 1 
}) => {
  const levelStyles = {
    1: "glass-card",
    2: "glass-elevated",
    3: "glass-inset"
  };

  return (
    <div className={`${levelStyles[level]} ${className}`}>
      {children}
    </div>
  );
};

export default GlassCard;
