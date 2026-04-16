# RangeReady Hardware & Radar Wisdom Database (V1.0)

This document serves as the high-fidelity domain knowledge for the RangeReady AI "Intelligence Apex" model. It contains the cross-manufacturer SCPI dialects and radar engineering heuristics required for autonomous hardware orchestration.

## 📡 1. Manufacturer SCPI Dialects (The Big Five)

### Keysight Technologies (N90xx / N51xx Series)
- **Identity**: Often responds to `SOURce:FREQ:CW?` or `FREQ:CW?`. 
- **Quirk**: Requires `:POW:LEV:IMM:AMPL` for precise power control in some firmware but accepts `POW` in others. 
- **Short/Long Form**: Uses standard SCPI, but prefers full colon paths for absolute addressing.
- **Radar**: Supports `:SOURce:PULM:STATe ON` for high-performance pulse modulation.

### Rohde & Schwarz (FSV / SMW / FSW)
- **Identity**: Responds to `INST:SEL?` for mode switching (e.g., `SAN`, `VSA`).
- **Quirk**: Often uses `TRAC:DATA? TRACE1` for binary trace retrieval. 
- **Radar**: Specialized `:PULM:SOURce INTernal` logic with dedicated `PULM:PERiod` and `PULM:WIDTh` commands.
- **Error Behavior**: Robust `SYST:ERR?` reporting with detailed error descriptions.

### Anritsu (MS2720T / MG3710A)
- **Identity**: Uses compact SCPI headers.
- **Quirk**: Often requires `:FREQ:SPAN:FULL` before switching span modes.
- **Radar**: Frequently utilizes `PULM:TRIGger` for gated radar measurements.

### Tektronix (RSA Series)
- **Identity**: Uses unique "PI" (Programming Interface) headers.
- **Quirk**: Often prefers `:INIT:IMM` for starting acquisitions and `*TRG` for synchronization in radar pulses.

### National Instruments (PXI Hardware)
- **Identity**: Often controlled via NI-VISA wrappers but supports raw SCPI over TCP/IP bridges.
- **Quirk**: High emphasis on `*OPC?` (Operation Complete) due to high-speed modular backplanes.

---

## 🚀 2. Radar Engineering Heuristics

### Pulse Parameters
- **PRI (Pulse Repetition Interval)**: The inverse of PRF (Pulse Repetition Frequency). AI must understand `PRI = 1/PRF`.
- **Duty Cycle**: `PW / PRI`. AI must know that high duty cycles (>50%) can damage some PAs.
- **Chirps (LFM)**: Knowledge of linear frequency modulation (Start/Stop frequency and Chirp Slope).

### Radar Cross Section (RCS) Measurements
- **Gating**: Using time-domain gating to isolate the target reflection from the room clutter.
- **Calibration**: Knowledge of the "Golden Sphere" or "Metal Plate" calibration methods.
- **SCPI Pattern**: `CALC:FILT:GATE:STAT ON`.

---

## 🏎️ 3. 2026 Industry Performance Standards

### Speed Optimization (HIL Readiness)
- **Command Concatenation**: Use `;` to stack commands (e.g., `:FREQ 2.4GHz;:POW -10`).
- **Display Silencing**: Use `:DISP:UPD OFF` during high-throughput loops to save CPU cycles.
- **Binary Stream**: Always prefer `FORMat:DATA REAL,32` for binary trace retrieval over ASCII.

### Reliable Synchronization
- **Safe Barriers**: Use `*OPC?` or `*WAI` for hardware mutations (Mode switching, Calibration).
- **Timeout Management**: Self-healing loops must use a 1.5x buffer on reported vendor timeouts.

### Precision Error Handling
- **Register Polling**: Use `*STB?` for efficient status monitoring instead of constant `SYST:ERR?` polling in tight loops.
- **Heuristic**: "A -113 Header Error often suggests a firmware mismatch; check if the device prefers IEEE 488.2 short-form or SCPI-99 full-path."
