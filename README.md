# RangeReady RF: Industrial HIL Release (V6.0 -- APEX)

> [!CAUTION]
> **CONFIDENTIAL AND PROPRIETARY SOFTWARE**  
> This software is the exclusive property of **GVB Tech**. Unauthorized access, reproduction, or distribution is strictly prohibited. For internal use in private repositories only.

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-blue.svg)](LICENSE)
[![Release](https://img.shields.io/badge/Release-V6.0--APEX-gold.svg)](https://github.com/BalajiKoushik01/rangeready)

**RangeReady RF** has reached its **APEX (V6.0)** milestone. This release transforms the platform into a **Supervised Autonomous Intelligence** system for high-stakes RF instrumentation. Designed for air-gapped laboratory environments, RangeReady now features an integrated **Explainable AI (XAI)** engine for real-time hardware repair and technical diagnostics.

---

## 🛰️ The APEX Intelligence Engine (V6.0)

V6.0 introduces the **Apex Core**, a locally-hosted LLM (Gemma-2) trained on industrial SCPI dialects and our internal codebase.

- **The SCPI Sentry (Resilience Architecture)**: A 3-Tier safety pipeline that guarantees hardware communication. Features automatic Transient Retry, Protocol Fallback (IEEE 488.2), and Supervisor-Led AI Healing for syntax anomalies.
- **Glass Console™ V6.0 (Liquid Glass)**: A premium, modernized UI overhaul with Backdrop-Blurred components and manufacturer-aware glow effects.
- **LCD-First Interaction**: Eliminated legacy numpads in favor of a responsive, typable "Click-to-Entry" workflow with automatic focus management and unit termination strips.
- **Explainable AI (XAI)**: Every "Auto-Heal" action includes a technical justification (e.g., *'Correcting R&S FSV sweep-time logic to mitigate trace-data misalignment'*), ensuring total transparency.

---

## ⚡ Industrial Feature Matrix

- **Deterministic Mutex Control**: Guaranteed serialized hardware access with a global `lock_and_broadcast` guard.
- **Universal Driver Registry**: Persistent, singleton-based driver management for sub-millisecond dispatch.
- **Intelligent Auto-Discovery**: Automated network bus interrogation (Port 5025) with recursive `*IDN?` identification, now supporting HiSLIP (Port 4880) and cross-subnet probing.
- **Liquid Glass Interface**: Backdrop-blurred, high-performance web-GL components with real-time **Hardware OPC Pulse** for synchronized instrument handshaking.
- **Manufacturer Intelligence**: Native support for high-speed Binary Block trace acquisition (`#` format) and `*OPC?` reliability guards derived from official R&S and Keysight reference logic.
- **Security Hardened**: 0-vulnerability dependency status with air-gapped security protocols.

---

## 📦 Large Asset & Dependency Guide

To maintain a lean repository, the following industrial assets must be provisioned manually:

### 1. AI Copilot (Ollama Engine)
RangeReady V6.0 utilizes the **Ollama** runtime for air-gapped LLM execution.
- **Download**: [ollama.com](https://ollama.com)
- **Required Model**: `gemma2:2b` or `phi3:mini`.
- **Note**: Ensure `OLLAMA_MODELS` environment variable points to your local model directory.

### 2. Keysight / R&S IO Libraries
For physical hardware communication:
- **Keysight**: Install `Keysight IO Libraries Suite` (provides VISA/LXI drivers).
- **R&S**: Install `RsInstrument` Python packages or the `R&S VISA` package for HiSLIP support.

---

## 💾 Offline Distribution (Portable Bundle)

While the `RangeReady_OFFLINE/` folder is excluded from this repository to minimize weight, a portable distribution can be generated with the following structure:

```text
RangeReady_OFFLINE/
├── bin/                 # Isolated Python 3.12 Interpreter
├── backend/             # Source files + Compiled SCPI Drivers
├── frontend/            # Optimized production artifacts (Vite)
├── models/              # Local Ollama model weights (e.g. Phi-3/Gemma-2)
├── RUN_RangeReady.bat   # Automated air-gapped bootloader
└── INITIALIZE_AI.bat    # Local AI environment provisioner
```
To generate this bundle, run `npm run build` from the root directory followed by the `tools/package_offline.py` script.

---

## 🏗 Documentation Architecture

| Document | Purpose |
| :--- | :--- |
| **[USER_MANUAL.md](./USER_MANUAL.md)** | **[UPDATED]** Step-by-step guide for setup and AI Supervision. |
| **[HARDWARE_WISDOM.md](./backend/models/HARDWARE_WISDOM.md)** | **[NEW]** Domain knowledge for SCPI dialects and radar engineering. |
| **[CODEBASE_SYNOPSIS.md](./backend/models/CODEBASE_SYNOPSIS.md)** | **[NEW]** AI-ingestible architectural map for self-healing loops. |

---

## 🚀 Quick Start (One-Click Ignite)

1. Navigate to the root folder.
2. Run `INIT_READY.bat` (Windows) or `./INIT_READY.sh` (Linux).
3. The platform will automatically provision the portable environment and launch the APEX engine.

---

## 🏛 Engineering & Legal
Developed for professional hardware qualification and automated RF testing.

**© 2026 GVB LABS CORE**  
**Project Lead: Balaji Koushik // GVB Tech**
