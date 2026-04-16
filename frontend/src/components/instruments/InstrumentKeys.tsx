/**
 * FILE: InstrumentKeys.tsx
 * Shared hardware-key button primitives for all instrument replicas.
 * Defined at MODULE LEVEL (outside any render function) to satisfy React's
 * "Cannot create components during render" rule.
 */
import React from 'react';

// ── Hardkey (labelled physical button, silver chassis style) ─────────────────
interface HKeyProps {
    label: string;
    sub?: string;
    onClick?: () => void;
}
export const HKey: React.FC<HKeyProps> = ({ label, sub, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="flex flex-col items-center justify-center h-10 bg-[#E2E8F0] border border-[#CBD5E1] border-b-[#A0AEC0] rounded shadow text-[9px] font-bold uppercase text-[#2D3748] hover:bg-white active:translate-y-px active:shadow-inner transition-all select-none"
    >
        <span>{label}</span>
        {sub && <span className="text-[7px] text-[#718096] font-normal normal-case">{sub}</span>}
    </button>
);

// ── Numeric Pad Key (large digit, white) ─────────────────────────────────────
interface PKeyProps {
    v: string;
    onPad: (key: string) => void;
}
export const PKey: React.FC<PKeyProps> = ({ v, onPad }) => (
    <button
        type="button"
        onClick={() => onPad(v)}
        className="h-10 bg-white border border-[#CBD5E1] rounded shadow text-[14px] font-bold text-[#2D3748] hover:bg-[#EBF8FF] active:translate-y-px active:shadow-inner transition-all select-none"
    >
        {v}
    </button>
);

// ── Unit Terminator Key (GHz/MHz/kHz/Hz · V/mV/dBm) ─────────────────────────
interface UKeySGProps {
    top: string;
    bot: string;
    mult: number;
    entryType: 'freq' | 'pow';
    onEnter: (mult: number, type: 'freq' | 'pow') => void;
}
export const USGKey: React.FC<UKeySGProps> = ({ top, bot, mult, entryType, onEnter }) => (
    <button
        type="button"
        onClick={() => onEnter(mult, entryType)}
        className="flex flex-col items-center justify-center h-10 bg-[#EDF2F7] border border-[#CBD5E1] rounded shadow text-[10px] font-bold text-[#2D3748] hover:bg-[#E2E8F0] active:translate-y-px transition-all select-none"
    >
        <span>{top}</span>
        <span className="text-[7px] text-[#718096]">{bot}</span>
    </button>
);

// ── Unit Terminator Key for Analyzers (freq-only) ────────────────────────────
interface UAKeyProps {
    top: string;
    bot: string;
    mult: number;
    onEnterFreq: (mult: number, type: 'freq' | 'span') => void;
}
export const UAKey: React.FC<UAKeyProps> = ({ top, bot, mult, onEnterFreq }) => (
    <button
        type="button"
        onClick={() => onEnterFreq(mult, 'freq')}
        className="flex flex-col items-center justify-center h-10 bg-[#EDF2F7] border border-[#CBD5E1] rounded shadow text-[9px] font-bold text-[#2D3748] hover:bg-[#E2E8F0] active:translate-y-px transition-all select-none"
    >
        <span>{top}</span>
        <span className="text-[7px] text-[#718096]">{bot}</span>
    </button>
);

// ── Sign toggle (±) ───────────────────────────────────────────────────────────
interface SignKeyProps {
    onToggle: () => void;
}
export const SignKey: React.FC<SignKeyProps> = ({ onToggle }) => (
    <button
        type="button"
        onClick={onToggle}
        className="h-10 bg-white border border-[#CBD5E1] rounded shadow text-[12px] font-bold text-[#2D3748] hover:bg-[#EBF8FF] active:translate-y-px transition-all select-none"
    >
        ±
    </button>
);

// ── Cancel / CE key ───────────────────────────────────────────────────────────
interface CancelKeyProps {
    onCancel: () => void;
    label?: string;
    fullWidth?: boolean;
}
export const CancelKey: React.FC<CancelKeyProps> = ({ onCancel, label = 'Cancel / Esc', fullWidth }) => (
    <button
        type="button"
        onClick={onCancel}
        className={`${fullWidth ? 'w-full' : ''} h-9 bg-[#FC8181]/80 rounded shadow text-[9px] font-bold text-white uppercase tracking-widest active:translate-y-px transition-all`}
    >
        {label}
    </button>
);

// ── Unit Termination Strip (Context-aware floating unit menu) ─────────────────
interface UnitStripProps {
    units: { label: string; mult: number }[];
    onSelect: (mult: number) => void;
    onCancel: () => void;
    theme?: 'blue' | 'orange' | 'red';
}
export const UnitTerminationStrip: React.FC<UnitStripProps> = ({ units, onSelect, onCancel, theme = 'blue' }) => {
    const themeClass = theme === 'blue' ? 'bg-[#3182CE]' : theme === 'orange' ? 'bg-[#D69E2E]' : 'bg-[#E53E3E]';
    return (
        <div className="flex flex-col gap-1.5 p-2 bg-[#1A202C]/60 backdrop-blur-2xl rounded-lg border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-left-4 zoom-in-95 duration-300 z-[100] min-w-[80px]">
            <div className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] px-2 mb-1">Select Unit</div>
            {units.map((u) => (
                <button
                    key={u.label}
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log(`[UnitStrip] Selected ${u.label} (x${u.mult})`);
                        onSelect(u.mult);
                    }}
                    className={`px-4 py-2 ${themeClass} text-white text-[11px] font-black rounded-md shadow-lg border-t border-white/20 hover:brightness-125 hover:scale-[1.03] active:scale-95 transition-all uppercase tracking-tight flex items-center justify-between group`}
                >
                    <span>{u.label}</span>
                    <span className="opacity-0 group-hover:opacity-40 text-[9px]">↵</span>
                </button>
            ))}
            <div className="h-px bg-white/5 my-1" />
            <button
                onClick={(e) => { e.stopPropagation(); onCancel(); }}
                className="px-4 py-1.5 bg-white/5 text-white/40 text-[9px] font-bold rounded-md hover:bg-white/10 hover:text-white/60 transition-all uppercase tracking-widest"
            >
                Cancel [Esc]
            </button>
        </div>
    );
};

