# RangeReady — Software Description Document
### GVB Tech Platform | TR Module Remote Test Automation Suite
**Document Version:** 1.0  
**Project Lead:** Balaji Koushik // GVB Tech  
**Classification:** Internal Engineering Document — Dev Team Distribution  
**Date:** April 2026  
**Repository:** https://github.com/BalajiKoushik01/rangeready

---

## 1. What This Software Is

RangeReady is a remote-first, hardware-agnostic RF test automation platform built for the complete end-to-end qualification of Transmit/Receive (TR) modules. It eliminates all manual intervention at the equipment by allowing engineers and technicians to configure, execute, monitor, and report on every test entirely from a software interface over Ethernet — without ever physically interacting with the instruments during a test run.

The platform is designed to grow. It starts with a Signal Generator and Signal Analyzer connected over Ethernet, and is architected from day one to absorb additional instruments — VNA, Power Meter, Oscilloscope, Noise Figure Analyzer, Switch Matrix, DMM, Power Supply — as the lab scales. It starts with Keysight and is built to accommodate any SCPI-compliant vendor. It starts with S-band and dynamically adapts its entire configuration surface to whichever frequency band is selected. It is usable by a trained RF engineer doing R&D characterisation and equally by a floor technician running a production test sequence.

---

## 2. The Problem This Software Solves

### 2.1 How TR Module Testing Works Today (The Status Quo)

A TR module is the fundamental building block of an Active Electronically Scanned Array (AESA) radar. Each module contains a Power Amplifier (PA) on the transmit path, a Low Noise Amplifier (LNA) on the receive path, programmable phase shifters, variable gain attenuators, T/R switches, a circulator/limiter, and a digital control interface. A single module may have thousands of programmable gain and phase state combinations — every one of which needs to be characterised and verified.

The current industry workflow for testing a TR module looks like this:

1. An engineer physically connects the DUT (Device Under Test) to the bench instruments using RF cables and a DUT interface adapter.
2. They manually configure each instrument — set frequency ranges, power levels, trigger modes, sweep parameters — by walking up to the front panel or opening separate software tools (Keysight PathWave, R&S ELEKTRA, etc.).
3. They run each test (S-parameters, noise figure, output power, phase accuracy, etc.) one by one, switching the instrument configuration between each.
4. They manually record the results — usually into Excel spreadsheets or paper logs.
5. They move to the next DUT and repeat the entire process.
6. They compile reports at the end, often manually.

For a multi-channel TR module with hundreds of phase/attenuation states, this process can take an entire working day per module. In a production environment with dozens or hundreds of modules, this is the dominant bottleneck.

### 2.2 Identified Inefficiencies

| Inefficiency | Root Cause | Impact |
|---|---|---|
| Engineer physically present for every test | No remote control layer | Time waste, limits shift utilisation |
| Manual instrument reconfiguration between tests | No centralised sequence engine | Human error, inconsistency |
| Results recorded in scattered spreadsheets | No unified data pipeline | Traceability gaps, audit risk |
| Separate software per vendor instrument | No abstraction layer | Hard to scale, brittle to hardware changes |
| No live visibility during test execution | No real-time data streaming | Engineer cannot intervene or spot anomalies early |
| Test sequences rebuilt from scratch per project | No reusable test library | Duplicated effort across programs |
| Calibration state not tracked centrally | Ad-hoc calibration records | Measurement uncertainty, invalid results |
| No traceability from module serial number to result | Manual linking | Impossible to audit at scale |

### 2.3 What RangeReady Changes

RangeReady replaces the entire manual workflow with a single software interface. The engineer connects all instruments to a network switch over Ethernet once. From that point, every action — instrument configuration, DUT state programming, test sequence execution, data capture, report generation — happens inside the software. The engineer or technician does not need to touch the equipment again.

---

## 3. Core Design Principles

These principles are non-negotiable and must be respected in every engineering decision across the full stack.

**Remote First.** Every instrument interaction happens over the network. The software must never assume physical access to the equipment. All instrument commands go over Ethernet via VISA/SCPI.

**Hardware Agnostic.** The software abstracts instrument identity behind a driver layer. Adding a new instrument or swapping a Keysight unit for an R&S equivalent must require only a new driver manifest — zero changes to the test engine or UI.

**Band Aware.** The entire configuration surface of the application — frequency ranges, power limits, sweep parameters, calibration standards, measurement templates — dynamically adapts when the user changes the frequency band. S-band presents S-band-appropriate options. X-band presents X-band-appropriate options. The software never shows an engineer an irrelevant setting.

**Zero Manual Intervention During Test.** Once a test sequence is started, the software handles everything autonomously: instrument state, DUT control signals, data acquisition, pass/fail evaluation, logging, and moving to the next step.

**Full Traceability.** Every action — instrument command sent, response received, measurement taken, limit evaluated, state changed — is timestamped and logged down to the millisecond. Every result is linked to a DUT serial number, test sequence version, instrument calibration date, and operator ID. Nothing is anonymous.

**Accessible to All Skill Levels.** A trained RF engineer and a production floor technician must both be able to use the software effectively. The UI must not require SCPI knowledge to operate. Expert-level controls are available but not forced on every user.

**Flexible and Customisable.** Test sequences, pass/fail limits, report templates, DUT profiles, instrument configurations, and band presets must all be configurable by the user without touching source code.

---

## 4. Who Uses This Software

| User | Role | What They Need |
|---|---|---|
| RF Test Engineer | Designs test sequences, defines limits, performs R&D characterisation | Full access to all parameters, raw data, SCPI shell, calibration wizard |
| Production Test Technician | Executes pre-built sequences, loads DUTs, reads pass/fail | Simple execution interface, clear status, minimal configuration required |
| Lab Manager | Monitors test throughput, equipment status, calibration due dates | Dashboard view, reports, asset registry |

---

## 5. Frequency Band Awareness

The software must implement a **Band Profile** system. When a user selects a frequency band, the entire application context switches to that band's configuration space. The following bands must be supported at minimum:

| Band | Frequency Range | Notes |
|---|---|---|
| L-Band | 1 – 2 GHz | Long-range radar, ATC |
| **S-Band** | **2 – 4 GHz** | **Pilot testing band — first priority** |
| C-Band | 4 – 8 GHz | Weather radar, satellite |
| X-Band | 8 – 12 GHz | Most common military radar band |
| Ku-Band | 12 – 18 GHz | Satellite comms |
| K-Band | 18 – 27 GHz | |
| Ka-Band | 27 – 40 GHz | 5G mmWave, high-res radar |
| V/W-Band | 40 – 110 GHz | Future/advanced systems |

For each band, the system must automatically adjust or suggest:
- Frequency start/stop/center/span defaults
- Power level safe limits (to avoid instrument or DUT damage)
- Calibration kit standards (band-specific connectors and standards)
- Sweep point recommendations
- IFBW recommendations
- Reference impedance
- Applicable measurement templates

Users can override any auto-populated value. Band profiles must be editable and saveable.

---

## 6. Instrument Architecture

### 6.1 Connection Model

All instruments connect to the software over **Ethernet (TCPIP)** using the **VISA** protocol with **SCPI** command language. The primary network topology is:

```
[ Instrument Rack ]
       |
[ Network Switch (Ethernet) ]
       |
[ RangeReady Host Machine ]
       |
[ RangeReady Software ]
```

For future expansion, the driver layer must also support USB-VISA and GPIB (via GPIB-to-Ethernet adapters) — but these are not required at launch. The architecture must make adding these interfaces a configuration matter, not a code rewrite.

### 6.2 Instrument Discovery & Registration

When the software starts, it must:
1. Scan the configured network range for VISA-compliant instruments
2. Send `*IDN?` to each discovered device to identify make, model, and serial number
3. Match the response against the driver manifest library to load the correct driver
4. Display all connected instruments in the Asset Registry with their status (Connected / Unreachable / Calibration Due)

An engineer must also be able to manually add an instrument by entering its IP address if auto-discovery does not find it.

### 6.3 Supported Instrument Types (Current and Future)

The driver architecture must accommodate all of the following instrument classes. Each class has a defined interface contract that any vendor-specific driver must implement.

| Instrument Class | Current Priority | Vendor Targets |
|---|---|---|
| **Signal Generator (SG)** | **Phase 1 — Active** | Keysight MXG/EXG/PSG, R&S SMW200A/SMB100B, Anritsu |
| **Signal Analyzer (SA)** | **Phase 1 — Active** | Keysight MXA/PXA, R&S FSW/FSV, Anritsu |
| Vector Network Analyzer (VNA) | Phase 2 | Keysight PNA-X/ENA, R&S ZNA/ZVA |
| Power Meter + Sensor | Phase 2 | Keysight N1911/N1912, R&S NRP series |
| Oscilloscope | Phase 2 | Keysight DSOX/MSOX, R&S RTO/RTE |
| Noise Figure Analyzer | Phase 2 | Keysight N8975B, R&S FS-K30 software option |
| RF Switch Matrix | Phase 2 | Keysight N4691/Z2091, custom |
| Digital Multimeter (DMM) | Phase 3 | Keysight 34465A, any SCPI DMM |
| Programmable Power Supply | Phase 3 | Keysight E36300, R&S HMP series |

### 6.4 Driver Manifest System (Infinite Plugin Architecture)

Each instrument driver is a self-contained manifest file (JSON or YAML) that describes:
- The instrument's identification string pattern (matched against `*IDN?` response)
- All SCPI command templates for every supported operation (configure, query, trigger, fetch)
- Safe operating limits (max power, frequency range)
- Calibration metadata fields
- Capability flags (e.g., `supports_pulsed_mode: true`)

The core test engine communicates with instruments exclusively through a driver interface. It never sends raw SCPI directly. This is what makes the system vendor-agnostic: swap the driver manifest, the engine continues to work identically.

---

## 7. TR Module Test Parameters

This is the complete set of measurements the software must support. All parameters must be available for inclusion or exclusion in any custom test sequence.

### 7.1 Transmit Path Parameters

| Parameter | Description | Instrument Required |
|---|---|---|
| Output Power Level | Peak and average output power in dBm across frequency | Power Meter or SA |
| Transmit Gain | Ratio of output to input power (dB) | VNA or SG+SA |
| 1dB Compression Point (P1dB) | Input/output power at 1dB gain compression | VNA (PNA-X) or SG+SA |
| AM-AM / AM-PM Characteristics | Amplitude and phase distortion vs. input power | VNA |
| Harmonic Content | 2nd, 3rd, and higher harmonics relative to fundamental | SA |
| Spurious Emissions | All spurious outputs outside fundamental | SA |
| Pulse Rise Time | Time from 10% to 90% of pulse amplitude | Oscilloscope |
| Pulse Fall Time | Time from 90% to 10% of pulse amplitude | Oscilloscope |
| Pulse Droop | Power sag across pulse duration | Oscilloscope |
| Pulse-to-Pulse Phase Stability | Phase consistency across consecutive pulses | VNA (pulsed mode) |
| Pulse-to-Pulse Amplitude Stability | Amplitude consistency across consecutive pulses | Power Meter / SA |
| TX/RX Switching Time | Time to transition between TX and RX state | Oscilloscope |
| Power Supply Current (TX mode) | DC current draw during transmit | DMM / Power Supply |

### 7.2 Receive Path Parameters

| Parameter | Description | Instrument Required |
|---|---|---|
| Receive Gain | Signal gain from antenna port to RF output (dB) | VNA or SG+SA |
| Noise Figure (NF) | Noise added by the receive chain (dB) | NF Analyser or VNA cold source method |
| 1dB Compression Point | LNA linearity limit | VNA or SG+SA |
| 3rd Order Intercept (IIP3) | Two-tone intermodulation linearity | VNA or dual SG + SA |
| Intermodulation Distortion (IMD) | Two-tone IM3/IM5 levels | SA |
| LNA Recovery Time | Time for LNA to recover after TX pulse | Oscilloscope |
| TX/RX Isolation | Isolation between TX and RX ports | VNA |
| Input VSWR / Return Loss | Impedance match at receive input port | VNA |
| Power Supply Current (RX mode) | DC current draw during receive | DMM / Power Supply |

### 7.3 Common Path Parameters (Phase & Attenuation States)

| Parameter | Description | Instrument Required |
|---|---|---|
| Phase Shifter Accuracy | Actual vs. commanded phase for all N states | VNA |
| Phase Shifter RMS Error | Statistical error across all phase states | VNA |
| Attenuator Accuracy | Actual vs. commanded attenuation for all N states | VNA or SG+SA |
| Amplitude RMS Error | Statistical error across all attenuation states | VNA or SG+SA |
| Gain Flatness | Gain variation across frequency band | VNA or SG+SA |
| Group Delay | Signal propagation delay across frequency | VNA |
| S11 — Input Return Loss | Reflection at RF input port | VNA |
| S22 — Output Return Loss | Reflection at RF output port | VNA |
| S21 — Forward Transmission | Gain and phase, input to output | VNA |
| S12 — Reverse Isolation | Reverse signal flow | VNA |

### 7.4 System / Supply Parameters

| Parameter | Description | Instrument Required |
|---|---|---|
| Supply Voltage Monitoring | Actual supply voltage at DUT | DMM / Power Supply |
| Supply Current Monitoring | Current draw across all operational modes | DMM / Power Supply |
| Thermal Monitoring | Temperature at defined points (if sensors present) | External sensor / DAQ |

---

## 8. End-to-End Test Sequence

This is the canonical test flow that the software must execute autonomously from DUT connection to final report. Every step is logged with a timestamp.

```
PHASE 0 — PRE-TEST SETUP
├── User selects frequency band (e.g., S-Band)
├── System loads band profile (frequency limits, power limits, sweep defaults)
├── User registers DUT (serial number, module type, channel count, batch ID)
├── System verifies all required instruments are connected and responding
├── System checks calibration validity dates for each instrument
├── User loads or creates a test sequence
└── User sets pass/fail limits (or loads a saved limits template)

PHASE 1 — CALIBRATION
├── OSLT (Open-Short-Load-Through) calibration wizard
│   ├── User prompted to connect calibration standards in sequence
│   ├── System acquires calibration data at each standard
│   └── Calibration coefficients stored, linked to this test session
└── Calibration validity timestamp recorded

PHASE 2 — TRANSMIT PATH TESTING
├── System programs DUT to TX mode via digital control interface
├── Signal Generator configured to stimulus parameters
├── Output power measurement across frequency range
├── Transmit gain measurement
├── P1dB compression point sweep
├── Harmonic and spurious emissions scan
├── Pulse parameter measurement (rise, fall, droop)
├── Pulse-to-pulse stability (phase and amplitude)
├── TX supply current and voltage recorded
└── TX/RX switching time measurement

PHASE 3 — RECEIVE PATH TESTING
├── System programs DUT to RX mode
├── Receive gain measurement across frequency range
├── Noise figure measurement
├── LNA compression point
├── Two-tone intermodulation
├── TX/RX isolation measurement
├── Input VSWR / return loss
├── LNA recovery time
└── RX supply current and voltage recorded

PHASE 4 — PHASE SHIFTER & ATTENUATOR STATE SWEEP
├── For every phase state (0 to 2^N - 1):
│   ├── System sends digital command to set phase state
│   ├── System measures actual phase at output
│   └── Error vs. commanded value logged
├── RMS phase error calculated across all states
├── For every attenuation state (0 to 2^M - 1):
│   ├── System sends digital command to set attenuation state
│   ├── System measures actual attenuation
│   └── Error logged
└── RMS amplitude error calculated across all states

PHASE 5 — S-PARAMETER CHARACTERISATION (when VNA connected)
├── S11, S21, S12, S22 measured across full band
├── Group delay measurement
├── Gain flatness analysis
└── All data exported as Touchstone (.s2p) file

PHASE 6 — PASS/FAIL EVALUATION
├── Every measured value compared against defined limits
├── PASS / FAIL / MARGINAL status assigned per parameter
├── Overall DUT verdict: PASS / FAIL / CONDITIONAL PASS
└── Failure details flagged with parameter name, measured value, limit

PHASE 7 — DATA EXPORT & REPORTING
├── Full timestamped log exported (CSV, XLSX, JSON)
├── Touchstone files saved (.s2p, .s3p as applicable)
├── Test report generated (PDF summary + raw data appendix)
├── Results linked to DUT serial number in database
└── Test session closed, system ready for next DUT
```

---

## 9. Remote Automation Engine

### 9.1 Architecture

The remote automation engine is the core of RangeReady. It translates a user-defined test sequence into a stream of SCPI commands sent to physical instruments over Ethernet and collects the responses.

```
[ User Interface — React Frontend ]
         │  Test Sequence + DUT Profile + Limits
         ▼
[ Sequence Execution Engine — FastAPI Backend ]
         │  Instrument operations (abstract)
         ▼
[ Instrument Abstraction Layer ]
         │  Driver-specific SCPI command generation
         ▼
[ VISA/SCPI Transport Layer — pyvisa ]
         │  TCP/IP sockets over Ethernet
         ▼
[ Physical Instruments on network ]
```

### 9.2 VISA Connection Management

The backend uses `pyvisa` with the `pyvisa-py` pure-Python backend (no NI-VISA dependency required) to communicate with all instruments over TCPIP VISA resource strings:

```
TCPIP0::<instrument_ip>::inst0::INSTR
```

The connection manager must:
- Maintain persistent VISA sessions for all registered instruments during a test run
- Detect and handle connection drops with auto-reconnect and test suspension
- Enforce timeout handling per instrument class (a VNA sweep may take 10–30 seconds)
- Queue SCPI write/query operations to prevent command collision on shared resources

### 9.3 Instrument Auto-Discovery (LXI Precision)

The system performs high-speed instrument discovery via the `lxi_discovery.py` service:
1. **LXI/VXI-11 Broadcast**: Sends RPC Portmapper broadcasts to discover LXI-compliant instruments instantly.
2. **mDNS Listener**: Background zeroconf monitoring detects instruments the moment they are plugged into the Ethernet switch.
3. **Legacy IP Scan**: Fallback subnet iteration for older non-LXI hardware.
4. **Identity Verification**: Automatic `*IDN?` queries to match discovered hardware against driver manifests.

### 9.4 SCPI Command Console (Glass Console™)

Available to engineers, the SCPI console allows direct command injection to any connected instrument:
- Select target instrument from dropdown
- Type or paste SCPI command
- See raw response with timestamp
- Command history with replay capability
- This is a power-user tool for debugging and instrument verification, not part of normal test execution

### 9.5 Test Sequence Engine

A test sequence is a structured, ordered list of steps. Each step is one of the following types:

| Step Type | Description |
|---|---|
| `INSTRUMENT_CONFIG` | Configure an instrument parameter (set frequency, set power) |
| `DUT_COMMAND` | Send a digital command to the DUT (set phase state, TX/RX switch) |
| `MEASURE` | Acquire a measurement, store result with parameter label |
| `CALCULATE` | Derive a value from previous measurements (e.g., gain = output - input) |
| `EVALUATE` | Compare a result against a limit, record PASS/FAIL |
| `WAIT` | Dwell for a defined time (allow DUT to settle after state change) |
| `LOG` | Force a manual log entry with a message |
| `LOOP` | Repeat a sub-sequence N times (used for state sweeps) |
| `BRANCH` | Conditional branching (e.g., skip NF test if NF analyser not connected) |

Sequences are stored in the database as structured JSON and created through the UI sequence editor. Users must never need to write code or edit JSON directly.

### 9.6 Live Data Streaming

During test execution, every measurement result must be streamed in real time to the frontend via WebSocket. The frontend renders these as live updating plots and numeric readouts. Test execution must not be blocked by frontend rendering.

---

## 10. Live Monitoring & Visualisation

During any active test run, the interface must display:

**Live Trace Display**
- Real-time amplitude vs. frequency plot, updated as sweep data arrives
- Overlay of multiple traces for comparison (TX gain across phase states)
- Marker tools: peak search, minimum search, user-placed markers with readout
- -3dB bandwidth auto-calculation and display
- Limit lines overlaid on plot (upper and lower bounds shown visually)
- Dual-view mode: TX path and RX path plots side by side simultaneously

**Live Numeric Dashboard**
- Current value of every active parameter, updated in real time
- Pass/Fail status indicator (green/red) per parameter
- Overall DUT verdict indicator — prominent, always visible
- Active instrument status panel (connected, measuring, idle, error)

**Test Progress Panel**
- Step-by-step progress through the active sequence
- Current step highlighted, completed steps checked, upcoming steps visible
- Elapsed time and estimated remaining time
- Abort and Pause controls always accessible

**Live Log Feed**
- Scrolling real-time feed of every action: commands sent, responses received, measurements recorded, limits evaluated
- Millisecond-precision timestamp on every line
- Color-coded: command (blue), response (white), pass (green), fail (red), warning (amber), error (red bold)

**Intelligence HUD (Offline AI)**
- **Anomaly Diagnosis**: Real-time engineering hypothesis for failed traces (e.g. "Thermal Compression detected").
- **SCPI Copilot**: Natural language assistant for instrument programming.
- **Datasheet Parser**: Automatic limit extraction from component datasheets.

---

## 11. Data Logging & Traceability

### 11.1 What Gets Logged

Every event during a test session is captured. This includes:

- Session metadata: DUT serial number, module type, batch ID, operator name/ID, date and time, software version, sequence version, instrument serial numbers and calibration dates
- Every SCPI command sent: timestamp, target instrument, command string
- Every SCPI response received: timestamp, source instrument, response string, latency
- Every measurement result: timestamp, parameter name, raw value, unit, applied limit, pass/fail verdict
- Every DUT control command: timestamp, command type, state commanded
- Calibration events: when performed, coefficients applied, standards used
- All errors and connection events

### 11.2 Data Export Formats

All formats are always available. The user selects which to generate at end of session or on demand mid-session.

| Format | Content | Use Case |
|---|---|---|
| **CSV** | Raw timestamped log, one row per event | Engineering analysis, scripting |
| **XLSX** | Multi-sheet workbook: Summary, Raw Data, Per-Parameter tables, Pass/Fail matrix | Lab records, manager review |
| **JSON** | Full session data in structured format | Integration with other systems |
| **Touchstone (.s2p/.s3p)** | S-parameter data in industry standard format | EDA tools (ADS, HFSS, CST) |
| **PDF** | Formatted report: cover page, summary table, plots, raw data appendix | Customer deliverable, quality records |

### 11.3 Traceability Model

Every measurement result must be traceable through this chain:

```
DUT Serial Number
  └── Test Session ID
        ├── Sequence Name + Version
        ├── Operator ID
        ├── Date / Time (millisecond precision)
        ├── Instrument 1: Model, Serial, Calibration Date
        ├── Instrument 2: Model, Serial, Calibration Date
        └── Measurement Results
              ├── Parameter Name
              ├── Measured Value + Unit
              ├── Applied Limit (Upper / Lower)
              ├── Verdict (PASS / FAIL / MARGINAL)
              └── Timestamp (millisecond precision)
```

An engineer must be able to search any DUT serial number and see its complete test history across all sessions.

---

## 12. Customisation Framework

The following must be fully user-configurable through the UI — no code editing required:

**Band Profiles** — frequency range, power limits, sweep defaults, IFBW defaults, calibration standards per band. Users create, edit, clone, and delete profiles.

**DUT Profiles** — module type name, frequency band, channel count, digital interface type, phase shifter bits, attenuator bits, associated test sequence. Each DUT instance is registered with its own serial number against a profile.

**Test Sequences** — visual drag-and-drop sequence editor, inline step configuration. Sequences can be cloned, versioned, shared, and locked to prevent accidental modification in production use. Branching logic based on instrument availability.

**Pass/Fail Limits** — per-parameter limit tables, editable per DUT profile or per test session. Limits can be frequency-dependent with different tolerances across the band.

**Report Templates** — user defines which parameters appear, which plots are included, cover page fields, and company branding (logo, organisation name, document number format).

**Instrument Driver Manifests** — new instruments added through the UI or by uploading a JSON manifest. No backend code changes required.

---

## 13. Software Architecture (Building on Existing Repo)

### 13.1 Backend (FastAPI — Python)

**Keep and extend:**
- `backend/main.py` — FastAPI app entry point
- `backend/models/` — extend SQLAlchemy models for sessions, measurements, traceability
- `backend/routers/` — add routers for instrument discovery, sequence execution, live streaming

**Add:**
- `backend/drivers/` — instrument driver manifest loader + SCPI dispatch engine
- `backend/services/visa_service.py` — pyvisa connection pool manager
- `backend/services/sequence_engine.py` — test sequence interpreter and autonomous runner
- `backend/services/data_service.py` — measurement storage and export generation
- `backend/services/discovery_service.py` — network instrument auto-discovery
- `backend/ws/` — WebSocket handlers for live data streaming to frontend
- `backend/services/ai_copilot.py` — Local offline LLM (Gemma/Llama) integration
- `backend/services/calibration_engine.py` — Native SOLT vector error correction
- `backend/services/switch_matrix.py` — Automated multi-DUT RF routing
- `backend/services/lxi_discovery.py` — Advanced LXI/VXI-11 auto-discovery
- `backend/services/band_service.py` — RF band safety and defaults engine

**Key Python dependencies to add:**
- `pyvisa` — VISA instrument communication
- `pyvisa-py` — pure Python VISA backend, no NI-VISA installation required
- `openpyxl` — Excel report generation
- `weasyprint` or `reportlab` — PDF report generation
- `websockets` — WebSocket support for live streaming

### 13.2 Frontend (React + Vite + TypeScript + Tailwind v4)

**Keep:**
- Existing Glass UI component library and Liquid Glass design system
- Framer Motion for animations and transitions
- All existing brand assets

**Pages to build or replace:**

| Page | Purpose |
|---|---|
| `Dashboard` | Live test status, instrument status panel, active session overview |
| `Instrument Registry` | Discovered instruments, manual add, connection status, calibration dates |
| `DUT Registry` | Register DUTs, manage profiles, view test history per serial number |
| `Sequence Builder` | Visual drag-and-drop test sequence editor |
| `Calibration Wizard` | Guided OSLT calibration flow with step-by-step prompts |
| `Band & Limits Config` | Edit band profiles, pass/fail limits per DUT profile |
| `Test Runner` | Live execution view — traces, numeric dashboard, progress panel, log feed |
| `Data & Reports` | Browse sessions, export data, view historical results |
| `SCPI Console` | Direct SCPI command injection — engineer access only |
| `Settings` | Network config, user details, driver management, application preferences |

**Key frontend libraries to add:**
- `uplot` — high-performance live charting optimised for large streaming data volumes
- `@tanstack/react-query` — server state management
- Native WebSocket API — live data stream from backend

### 13.3 Electron Wrapper

The existing Electron wrapper is appropriate and must be retained. The desktop application wraps the full stack to run locally on the lab PC connected to the instrument network. No cloud dependency. All data stays local unless the user explicitly exports it.

### 13.4 Database Schema

Current SQLite is appropriate for single-user local operation. The schema must be extended to include:

| Table | Purpose |
|---|---|
| `instruments` | Registered instruments with metadata and calibration dates |
| `dut_profiles` | Module type definitions |
| `dut_instances` | Individual tested units with serial numbers |
| `test_sessions` | Each complete test run |
| `measurements` | Individual measurement results linked to session and DUT |
| `event_log` | Complete timestamped event log per session |
| `sequences` | Stored test sequence definitions (JSON) |
| `band_profiles` | Band configuration profiles |
| `limits` | Pass/fail limit tables per DUT profile |

---

## 14. What Is NOT in Scope — Current Phase

- Multi-user / networked collaborative access
- Cloud sync or cloud storage
- Anechoic chamber OTA measurement integration (Phase 3)
- Mobile interface

---

## 15. Summary of Key Constraints

| Constraint | Detail |
|---|---|
| Communication protocol | Ethernet (TCPIP VISA) — current phase only |
| Vendor priority | Keysight first; all SCPI-compliant vendors in architecture from day one |
| Active instruments | Signal Generator + Signal Analyzer — Phase 1 |
| Pilot test band | S-Band — all bands supported in software |
| DUT type | Multi-channel TR modules, tested sequentially one at a time |
| User access | Single user, local desktop application |
| Data storage | Local SQLite, all formats exportable |
| Manual intervention | Zero during test execution — fully autonomous once started |
| Traceability | Complete, millisecond-precision, serial-number-linked |

---

## 16. Open Items — Requires Input from Project Lead

The following items must be clarified before the dev team can finalise implementation of those specific modules:

1. **DUT Digital Control Interface** — How does the software send state commands (phase state, attenuation state, TX/RX mode) to the TR module? What is the physical and protocol interface? (SPI, LVDS, parallel GPIO, custom controller?) This determines whether an interface board or microcontroller bridge is required between the host PC and DUT.

2. **Calibration Kit** — Which specific calibration kit is being used? (e.g., Keysight 85052D, 85056D, or R&S equivalent) Needed to populate the OSLT calibration wizard with the correct standards and connector types.

3. **Lab Network Subnet** — What is the IP address range of the instrument network? Needed to configure the auto-discovery scan range.

4. **Report Document Numbering** — What is the document numbering convention for test reports? (e.g., GVB-TRM-YYYYMMDD-SERIAL) Needed to configure the PDF report template.

5. **Pass/Fail Limits Source** — Are limits derived from a customer specification, an internal GVB spec sheet, or a standard such as ISRO-PHASE-3? Initial limit templates need a source document to populate from.

---

*Document prepared by Balaji Koushik // GVB Tech*  
*GVB LABS CORE © 2026*  
*To be reviewed by the software development team before sprint planning begins.*
