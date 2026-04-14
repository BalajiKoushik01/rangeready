# RangeReady HIL V5.1 - Comprehensive GUI User Manual

> [!CAUTION]
> **RESTRICTED DOCUMENTATION**
> This manual contains detailed operational procedures for the RangeReady HIL (Hardware-in-the-Loop) V5.1 Industrial Platform. Unauthorized distribution is strictly prohibited.

---

## 1. Introduction to RangeReady Ecosystem
RangeReady HIL V5.1 is an advanced orchestration platform designed for characterization, calibration, and automated testing of RF components. It bridges high-level React-based Command Interfaces with low-level Python instrumentation drivers using the SCPI (Standard Commands for Programmable Instruments) protocol over VXI-11 and Raw Socket layers.

---

## 2. Dashboard: Command Intelligence Hub
The Dashboard is the entry point for all system operations, providing a high-level overview of the instrumentation bus and system health.

### 2.1 System Status Matrix
- **Active Test Sessions**: Tracks the number of measurement sequences stored in the local SQLite database.
- **HAL Engine Status**: Monitors the "Hardware Abstraction Layer" backend. If the status shifts to "Offline", verify that the Python backend service is running on port 8787 (default).
- **Instrumentation Bus**: Indicates the active communication protocol (currently VXI-11 / RAW Socket).
- **System Uptime**: Real-time monitor of the platform's stability and backend connectivity.

### 2.2 Hardware Communication Interface (Checklist)
Clicking **"Verify Hardware Communication Interface"** launches an automated diagnostic sequence:
1. **Controller Handshake**: Verifies the local React-to-Python bridge is healthy.
2. **VISA Layer Validation**: Checks for the presence of the NI-VISA or PyVISA-py backend on the host machine.
3. **Instrument Discovery**: Attempts to reach the Signal Generator and Spectrum Analyzer via their configured IP addresses.
4. **SCPI Echo Test**: Transmits `*IDN?` to ensure bidirectional data flow and correct manufacturer identification.

### 2.3 Trace Acquisition Log
A real-time telemetry feed that monitors every "Trace" captured from the spectrum analyzer. It visually indicates when the system is actively polling the instrumentation bus for spectral data.

---

## 3. Master Instrument Control (Full-Spectrum Interface)
This page provides granular, manual control over hardware, mimicking the physical front panel of high-end instruments like the Keysight UXA or R&S FSW.

### 3.1 Manufacturer Logic (Keysight vs. Rohde & Schwarz)
The interface dynamically updates its SCPI command set based on the selected manufacturer:
- **Keysight (EXG/MXG/PXA)**: Uses standard Keysight syntax (e.g., `:SENS:DET:FUNC NORM`).
- **Rohde & Schwarz (FSW/SMW)**: Switches to R&S specific command structures (e.g., `:DET RMS`).

### 3.2 Signal Generator (SigGen) Controls
- **RF Output Toggle**: The primary safety switch. When **"ON"**, the button glows emerald, indicating active RF power at the RF Output port.
- **Frequency Setup**: 
  - Supports **Hz, kHz, MHz, and GHz** units.
  - The LCD readout displays CW (Continuous Wave) frequency with up to 6 decimal places for high-precision tuning.
- **Output Level (Amplitude)**: Sets the power in **dBm**. Range depends on instrument capability (typically -130 dBm to +20 dBm).
- **Modulation Hub**:
    - **AM**: Toggle Amplitude Modulation and adjust depth in % (0-100%).
    - **FM**: Toggle Frequency Modulation and adjust deviation in Hz.
    - **Pulse**: Toggles internal pulse modulation for pulse-profile testing.
- **Pulse Generator**: Configure **Period** and **Width** (ns to s). Essential for radar, EW (Electronic Warfare), and pulsed-RF characterization.

### 3.3 Spectrum Analyzer Control & Visualization
- **Live Trace Display**: A high-speed SVG renderer capable of high-frame-rate telemetry updates.
    - **Grid**: 10x10 division system for visual magnitude and frequency estimation.
    - **Ref Level Line**: A dashed line indicating the current reference level for easier visual alignment.
- **Acquisition Parameters**:
    - **Reference Level**: Adjusts the top of the grid (typically 0 dBm).
    - **Attenuation**: Global hardware protection. Set to **AUTO** (Default) to let the instrument manage internal attenuation based on the power level.
    - **Detectors**: Choose between Normal, Average, Positive Peak, Sample, and Negative Peak to change how the analyzer samples the noise and peaks.
    - **Averaging**: Smooths the noise floor by averaging N-number of sweeps (Set Count from 1 to 999).
- **6-Marker Hub**:
    - **Peak Search**: Instantly snaps the active marker (M1-M6) to the highest signal peak in the current span.
    - **Next Peak**: Moves the marker to the next highest outlier (right side search) in the spectrum.
    - **Marker Readout**: Provides precise Frequency and Amplitude (dBm) data for the selected point with diamond-shaped SVG markers.

---

## 4. Test Runner: Measurement Orchestration
The automated engine of RangeReady, used for high-throughput testing and automated characterization.

### 4.1 Measurement Sequence Engine
- **Sequence Steps**: Automatically executes Frequency Sync, Linearity Testing, and Spurious Analysis.
- **Automated Logic**: The system sends a batch of SCPI commands and waits for "SUCCESS" responses before advancing the progress bar.

### 4.2 Instrumentation Split-View
Allows the operator to view the **Signal Generator Output** and **Spectrum Analyzer Capture** side-by-side. Critical for monitoring gain compression, insertion loss, or amplifier efficiency.

### 4.3 Advanced Trace Analytics
- **Golden Trace Template**: Overlays a "Perfect" signal profile over the live data. Deviances are visually obvious to the operator for rapid PASS/FAIL assessment.
- **Resonant Frequency Peak**: Automatically calculates the peak frequency and **Q-Factor** (Quality Factor) based on the 3dB bandwidth of the captured signal.

### 4.4 Hardware Bus Monitor
A transparency tool that shows the raw traffic between the PC and the instruments.
- **SCPI Commands**: Outgoing directives with timestamps.
- **Responses**: Raw data returning from the hardware (ASCII or Hex/Binary).

---

## 5. Asset Registry: Inventory Management
The system keeps a persistent record of all hardware assets in the `rangeready.db` database.

### 5.1 Registering Assets
Users can add new hardware by providing:
- **Mission Tag**: A unique identifier for the hardware (e.g., "TX-BOOSTER-01").
- **Driver Architecture**: Select the appropriate driver (Siglent SSA, Keysight E4404, Rohde ZVA, etc.).
- **VISA Link String**: The physical address (e.g., `TCPIP0::192.168.1.142::inst0::INSTR`).

### 5.2 Neural Control HUD
A specialized modal for low-level debugging. It allows the operator to send **Directives** (raw SCPI) and receive **Telemetry** (instrument response) directly, bypassing the GUI abstractions.

---

## 6. Calibration Matrix: OSLT Vector Precision
The platform supports full OSLT calibration for vector measurement accuracy.

### 6.1 OSLT Methodology
The system guides the user through a four-part calibration sequence:
1. **Open**: Measure infinite impedance at the reference plane.
2. **Short**: Measure zero impedance at the reference plane.
3. **Load**: Measure matched 50Ω termination.
4. **Thru**: Measure direct cable-to-cable transmission for S21 correction.

### 6.2 DSP Integration
Once "Acquire Matrix" is clicked for all steps, RangeReady calculates correction coefficients and uploads them to the instrument's DSP layer. This removes cable loss, phase drift, and connector mismatch from the final data.

---

## 7. Intelligence HUD: Neural Matrix
RangeReady V5.1 features a local, air-gapped AI engine for advanced automation and natural language control.

### 7.1 Natural Language SCPI translation
Operators can describe their requirements in plain English:
> *"Configure the analyzer to sweep from 1GHz to 2GHz with a 100kHz RBW."*

The AI translates this into a valid SCPI sequence and executes it across the instrument bus.

### 7.2 Anomaly Detection
In **Signal Analysis Mode**, the AI monitors the noise floor. It raises "SIGNAL_SPURIOUS_EMISSION" alerts if spectral phase noise variance exceeds programmed thresholds.

---

## 8. System Configuration (Settings)
- **Operator Interface**: Customize individual UI parameters:
    - **Contrast Mode**: High Contrast or Standard Matrix.
    - **Refresh Rate**: Adjust telemetry updates from 100ms to 2000ms.
- **System Guardrails**: 
    - **Hardware Interlock**: Prevents context shifts or setting changes during a live sweep.
    - **Purge Logs**: Securely erases all local database records and calibration data.
- **Bus Config**: Set the static IPs for the Primary Signal Generator (Keysight) and Spectrum Analyzer (Tektronix/R&S).

---

## 9. Troubleshooting & FAQ
- **"Bus Status: Connecting..."**: Verify that the `backend/start.py` script is running and its logs show "Server started on port 8787".
- **"Action: Verify LAN cable"**: This usually means the instrument is not responding to `*IDN?`. Check physical connections and ensure the instrument is in Remote mode.
- **"Neural Matrix Error"**: Ensure the GGUF model file is present in the `models/` directory for offline inference.

---
**Manual End - RangeReady HIL V5.1**
