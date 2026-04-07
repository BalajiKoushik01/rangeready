# RangeReady HIL V5.0 - User Manual & Integration Guide

> [!CAUTION]
> **CONFIDENTIAL AND PROPRIETARY SOFTWARE**  
> This documentation and the associated software are the exclusive intellectual property of **GVB Tech**.

## 1. Environment Setup (One-Click Initialization)
The global Control Hub can be ignited with a single command, automatically loading Python backends, Node/React frontends, and setting up the database.

**Windows:**
1. Open Command Prompt or PowerShell in the `range ready` folder.
2. Run: `INIT_READY.bat`

**Fedora / Linux:**
1. Open Terminal in the `range ready` directory.
2. Run: `chmod +x INIT_READY.sh && ./INIT_READY.sh`

*These scripts automatically provision the virtual environment, install dependencies, validate hardware config, and boot the intelligence server.*

## 2. Hardware Orchestration (Actionable Troubleshooting)
The `HardwareChecklist` guarantees SCPI VXI-11 connections before sweep sequences. The system auto-discovers instruments on standard subnets (port 5025).

**Intelligent Auto-Discovery:**
- Ensure the Keysight Signal Generator and Tektronix Spectrum Analyzer are connected via LAN.
- Navigate to the **System Configuration** page in the dashboard.
- The system will dynamically interrogate the network, identify models via `*IDN?`, and auto-assign IP addresses.

**Actionable GUI Debugging:**
- The GUI explicitly warns you if a `BUS_FAULT` occurs.
- If testing the link in the "Instrumentation Bus Config" fails, verify the physical LAN cable and ensure both Keysight and Tektronix devices are powered on.

## 3. Industrial Testing
The system defaults to the `KEYSIGHT_TEK_SUITE` fallback for industrial Signal Generators and Spectrum Analyzers. Click "Engage Target" to execute real-world initialization SCPI commands (e.g. `:FREQ:CW` and `:TRAC:DATA?`).
