/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-page': '#F8F7F4',
        'bg-surface': 'rgba(255, 255, 255, 0.72)',
        'bg-surface-hover': 'rgba(255, 255, 255, 0.88)',
        'bg-elevated': 'rgba(255, 255, 255, 0.95)',
        'bg-input': 'rgba(255, 255, 255, 0.60)',
        'bg-sidebar': 'rgba(248, 247, 244, 0.85)',
        
        'status-pass': '#16A34A',
        'status-pass-bg': '#F0FDF4',
        'status-pass-border': '#BBF7D0',
        
        'status-fail': '#DC2626',
        'status-fail-bg': '#FEF2F2',
        'status-fail-border': '#FECACA',
        
        'status-warn': '#D97706',
        'status-warn-bg': '#FFFBEB',
        'status-warn-border': '#FDE68A',
        
        'status-info': '#0891B2',
        'status-info-bg': '#ECFEFF',
        'status-info-border': '#A5F3FC',
        
        'status-active': '#7C3AED',
        'status-active-bg': '#F5F3FF',
        
        'accent-blue': '#1E6FD9',
        'accent-blue-soft': '#EEF4FD',
        'accent-blue-mid': '#4D94F0',
        
        'text-primary': '#1A1814',
        'text-secondary': '#6B6860',
        'text-tertiary': '#A09D98',
        'text-inverse': '#FFFFFF',
        
        'border-subtle': 'rgba(0, 0, 0, 0.06)',
        'border-default': 'rgba(0, 0, 0, 0.10)',
        'border-strong': 'rgba(0, 0, 0, 0.18)',
      },
      fontFamily: {
        ui: ['"DM Sans"', 'Helvetica Neue', 'sans-serif'],
        mono: ['"DM Mono"', 'JetBrains Mono', 'monospace'],
        label: ['"DM Sans"', 'sans-serif'],
      },
      backdropBlur: {
        'glass': '12px',
        'glass-heavy': '24px',
      },
      boxShadow: {
        'glass': '0 4px 24px rgba(0, 0, 0, 0.07), 0 1px 4px rgba(0, 0, 0, 0.05)',
        'glass-lg': '0 8px 40px rgba(0, 0, 0, 0.10), 0 2px 8px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        'glass-sm': '8px',
        'glass': '12px',
        'glass-lg': '16px',
      },
      backgroundImage: {
        'glass-gradient': 'radial-gradient(ellipse at 20% 20%, rgba(30, 111, 217, 0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(22, 163, 74, 0.04) 0%, transparent 60%), #F8F7F4',
      }
    },
  },
  plugins: [],
}
