# RangeReady RF V6.0 - Technical Specifications & Master Manual

> [!IMPORTANT]
> **APEX RELEASE DOCUMENTATION (V6.0)**  
> This manual provides technical specifications and operational procedures for the RangeReady RF V6.0 "Apex" software. This release marks the transition from standard SCPI control to an **AI-Supervised, High-Performance** instrumentation framework.

---

## 1. System Overview & Operation Flow
RangeReady RF V6.0 is an industrial-grade RF test automation platform. It is engineered for ultra-low latency hardware control and air-gapped security, now featuring **Supervised Autonomous Intelligence** for real-time fault correction.

### Core Architecture Principles (V6.0 Milestone)
- **Synchronized Hardware Handshaking**: Implements mandatory `*OPC?` (Operation Complete) verification to prevent race conditions in high-stakes testing.
- **High-Speed Binary Bus**: Optimized trace data retrieval using the SCPI Binary Block format (`#`) for 80% lower telemetry latency.
- **Apex Intelligence (Ollama)**: Integrated local LLM supervision for real-time SCPI syntax repair and hardware state diagnostics.

---

## 2. System Architecture

### 2.1 User Interface: Liquid Glass Interface™
- **Visual Engine**: React 18+ with Backdrop-Blurred styling and Neon-Cyan telemetry accents.
- **Logic Sync**: `Hardware OPC Pulse` indicator in the header provides real-time feedback on instrument bus activity.
- **Interaction**: "Click-to-Entry" LCD-First workflow eliminates legacy input lag.

### 2.2 Backend Service: Apex Core (FastAPI)
- **Driver Registry**: Global singleton management ensures exactly one persistent TCP/IP connection per instrument to prevent "Socket Refused" errors.
- **Binary Trace Engine**: Uses **NumPy** for zero-copy parsing of REAL,32 binary blocks from Keysight and R&S hardware.
- **AI Copilot Implementation**: Utilizes the portable Ollama runtime to execute Gemma-2/Phi-3 model weights locally.

### 2.3 Protocols & Connectivity
- **Communication Standards**: VXI-11, Raw Socket, and **HiSLIP (High-Speed LAN Instrument Protocol)**.
- **Standard Port Universe**:
  - `5025`: Standard SCPI (Raw Socket)
  - `111`: VXI-11 Device Core
  - `4880`: HiSLIP (High-Performance)

---

## 3. High-Performance Driver Layer
The software uses a **Manufacturer Intelligence Integration** layer to achieve industry-leading reliability.

| Component | Function |
| :--- | :--- |
| **GenericSCPIDriver** | Universal bridge with mandatory `*OPC?` handshaking and binary block detection. |
| **Wait-for-OPC** | Guaranteed hardware readiness before the next command sequence. |
| **Binary Block Reader** | High-efficiency parsing of `#N<length><data>` packets. |
| **Self-Healing Loop** | Automatic `SYST:ERR?` polling linked to AI Copilot for automated troubleshooting. |

---

## 4. Safety and Security
- **Air-Gapped Integrity**: 100% offline functionality. No external telemetry or cloud dependencies.
- **Protocol Interlock**: Prevents illegal frequency/power overrides while the hardware bus is locked by an OPC operation.
- **Memory Hygiene**: Zero-allocation binary reading prevents Python garbage collection spikes during high-speed spectral sweeps.

---

## 5. Troubleshooting (V6.0)
1. **OPC Timeout**: If the `OPC Handshake Active` light persists for >10s, verify instrument hardware status (e.g., pending internal calibration).
2. **Binary Header Mismatch**: Ensure 'FORM REAL,32' is supported by the device; if not, the system automatically falls back to ASCII.
3. **AI Engine Offline**: Verify Ollama is running and the `OLLAMA_MODELS` environment variable is correctly configured.

---
**Manual Revision 6.0 - APEX Final**  
**Lead Engineer: Balaji Koushik // GVB Tech**
