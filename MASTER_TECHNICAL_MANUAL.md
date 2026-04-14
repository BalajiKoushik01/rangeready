# RangeReady RF V5.1 - Technical Specifications & User Manual

> [!IMPORTANT]
> **TECHNICAL DOCUMENTATION**  
> This manual provides technical specifications and operational procedures for the RangeReady RF V5.1 software. It covers system architecture, communication protocols, instrumentation drivers, and interface functionality.

---

## 1. System Overview & Operation Flow
RangeReady RF V5.1 is an RF test automation software designed for controlling lab instrumentation. The software is provided as a portable installation that can run in air-gapped environments directly from a USB drive while maintaining hardware connectivity over Ethernet.

### Core Architecture Principles
- **Verified Control Loop**: Instrument settings are confirmed via SCPI query (`?`) before and after execution to ensure synchronization.
- **Asynchronous Updates**: Signal trace data is updated using WebSockets to maintain responsiveness without page reloads.
- **Instrument Compatibility**: A standardized driver layer supports hardware from Keysight, Rohde & Schwarz, and Tektronix.

---

## 2. System Architecture
RangeReady use a three-tier architecture: **User Interface (React)**, **Backend Service (FastAPI)**, and **Instrumentation Bus (VISA/SCPI)**.

### 2.1 User Interface (Frontend)
- **Framework**: React 18+ with TypeScript for state management.
- **State Application**: The `SystemStateContext` manages global variables including hardware connection status and frequency band limits.
- **Rendering Engines**:
  - **uPlot**: Used for rendering high-density spectral traces (up to thousands of points).
  - **Framer Motion**: Manages UI state transitions and element animations.
- **Communication Protocol**: Uses REST/HTTP for configuration and WebSockets for real-time instrument data.

### 2.2 Backend Service (FastAPI)
- **Asynchronous Core**: Python-based FastAPI handles concurrent REST requests and WebSocket data streams.
- **Polling Service**:
  - `StatusPoller`: A background loop that queries instrument state at configurable intervals (default 1.5s).
  - **Socket Management**: maintains persistent TCP/IP connections to reduce communication latency compared to standard per-session handshakes.
- **Numerical Processing**: Uses **NumPy** for processing raw ASCII/binary trace data, frequency peak detection, and Q-Factor calculations.

### 2.3 Data Layer
- **Local Database**: SQLite stores test sequences, instrument profiles, and measurement logs.
- **ORM Layer**: SQLAlchemy manages database interactions and schema integrity.

---

## 3. Communication and Data Flow
The process of capturing and displaying a measurement follows these steps:

1. **Instrument Capture**: The spectrum analyzer samples the RF signal and stores the digitized trace in its internal buffer.
2. **Data Retrieval**: The `StatusPoller` service requests trace data using the `:TRAC:DATA?` SCPI command.
3. **Processing**: The backend receives the raw data, converts it into an array of floating-point values using NumPy, and adds a timestamp.
4. **Broadcast**: The processed JSON payload is sent to the frontend via WebSockets.
5. **Visualization**: The `UPlotChart` component updates the canvas with the new data points.

---

## 4. Instrumentation Driver Layer
The software uses a **Unified Driver Model** to support different hardware platforms.

| Component | Function |
| :--- | :--- |
| **Control Interface** | User-facing buttons and sliders. |
| **API Router** | Forwards requests to the appropriate instrument drivers. |
| **Driver Abstraction** | Common function definitions (e.g., `set_frequency`). |
| **Hardware Driver** | Manufacturer-specific SCPI generation (Keysight, R&S, etc.). |
| **I/O Management** | Physical byte transmission via LAN (Port 5025). |

### Connection Protocols
The system supports **VXI-11** and **Raw Socket** protocols over IPv4 Ethernet.

---

## 5. Interface Features
The interface is structured into several functional areas for instrument management and testing.

### 5.1 System Overview Dashboard
Displays the status of the connection between the software and the hardware.
- **Backend Link**: Status of the bridge between the UI and the Python service.
- **Activity Log**: Displays recent SCPI/UDP traffic for diagnostic purposes.

### 5.2 Instrument Control Panel
Allows for manual configuration of Signal Generators and Spectrum Analyzers.
- **Signal Generator**: Controls for CW frequency, power level (dBm), and modulation (AM, FM, Pulse).
- **Spectrum Analyzer**:
  - **Frequency Setup**: Controls for Center Frequency and Span.
  - **Marker Control**: Support for up to 6 markers with peak-tracking functionality.
  - **Acquisition Settings**: Selection of detectors (Pos Peak, Sample, RMS) and trace averaging count.

### 5.3 Measurement Execution Engine
Automates test sequences defined in the system database.
- **Reference Overlays**: Displays a stored "Golden Trace" as a reference for real-time comparison with live data.
- **Analytics**: Calculates peak frequency and Q-Factor based on bandwidth measurements.

### 5.4 SCPI Command Assistant
Utilizes a **local Large Language Model (LLM)** (Gemma 2-2B) for command assistance.
- **Command Translation**: Converts natural language requests into valid SCPI command strings.
- **Signal Monitoring**: Monitors spectral data for outliers or emissions meeting specific criteria.

---

## 6. Safety and Security
- **Configuration Interlock**: Prevents users from changing critical instrument settings while an automated measurement is in progress.
- **Offline Operation**: The software requires **no internet access**. All libraries, drivers, and models are contained within the local folder.
- **Data Sanity**: A "Purge" utility allows for the complete erasure of local database records and logs.

---

## 7. Troubleshooting
1. **Connection Failure**: Verify that no other software (such as NI-MAX) is holding an exclusive lock on the instrument's TCP port.
2. **Display Latency**: Check network congestion and ensure the PC is connected via Gigabit Ethernet.
3. **Driver Not Found**: Ensure the correct IP address is entered in the Configuration page and the instrument is powered on.

---
**Manual Revision 5.1 - Final**
