# RangeReady RF: Industrial HIL Release (V6.0)

> [!CAUTION]
> **CONFIDENTIAL AND PROPRIETARY SOFTWARE**  
> This software is the exclusive property of **GVB Tech**. Unauthorized access, reproduction, or distribution is strictly prohibited. For internal use in private repositories only.

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-blue.svg)](LICENSE)
[![Release](https://img.shields.io/badge/Release-V6.0--INDUSTRIAL-green.svg)](https://github.com/BalajiKoushik01/rangeready)

**RangeReady RF** is a production-grade Hardware-in-the-Loop (HIL) automation platform designed for high-precision RF instrumentation. Reaching its **V6.0 industrial milestone**, the platform features a deterministic command pipeline, autonomous hardware discovery, and sub-millisecond orchestration for **Keysight** and **Rohde & Schwarz** laboratory environments.

---

## ⚡ Industrial Feature Matrix (V6.0)

- **Deterministic Mutex Control**: Guaranteed serialized hardware access with a global `lock_and_broadcast` guard, eliminating command collisions during high-speed tests.
- **Universal Driver Registry**: Persistent, singleton-based driver management ensuring sub-millisecond dispatch to Keysight and R&S instruments.
- **Intelligent Auto-Discovery**: Automated network bus interrogation (Port 5025) with recursive `*IDN?` identification for zero-configuration setup.
- **Glass Console™ V3.0**: Enhanced real-time bus monitor with hardware interlock status and live SCPI traffic traceability.
- **Actionable Error Matrix**: High-fidelity GUI feedback translates low-level bus timeouts into actionable physical troubleshooting steps.
- **Offline Intelligence**: Built-in support for offline AI command assistance and pre-configured portable environments (Pendrive Mode).
- **Zero-Click Ignite**: One-step environment provisioning via cross-platform initialization scripts (`.bat` / `.sh`).

---

## 🏗 Documentation Architecture

For detailed engineering specifications, please refer to the specialized documentation:

| Document | Purpose |
| :--- | :--- |
| **[USER_MANUAL.md](./USER_MANUAL.md)** | Step-by-step guide for setup, hardware connection, and troubleshooting. |
| **[SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)** | Technical deep-dive into the software stack, logic flow, and HIL design. |
| **[SETUP.md](./SETUP.md)** | Legacy manual environment configuration details. |

---

## 🚀 Quick Start (One-Click Ignite)

Ensure your instrumentation (Keysight/Tektronix) is connected to the same LAN subnet.

### Windows
1. Navigate to the root directory.
2. Run `INIT_READY.bat`

### Fedora / Linux
1. Navigate to the root directory.
2. Run `chmod +x INIT_READY.sh && ./INIT_READY.sh`

---

## 🏛 Engineering & Legal
Developed for professional hardware qualification and automated RF testing.

**© 2026 GVB LABS CORE**  
**Project Lead: Balaji Koushik // GVB Tech**
