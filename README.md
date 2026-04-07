# RangeReady RF: Industrial HIL Release (V5.1)

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-blue.svg)](LICENSE)
[![Release](https://img.shields.io/badge/Release-V5.1--INDUSTRIAL-green.svg)](https://github.com/BalajiKoushik01/rangeready)

**RangeReady RF** is a production-grade Hardware-in-the-Loop (HIL) automation platform designed for high-precision RF instrumentation. Reaching its **V5.1 industrial milestone**, the platform features autonomous hardware discovery and deterministic SCPI orchestration for **Keysight** and **Tektronix** laboratory environments.

---

## ⚡ Industrial Feature Matrix

- **Intelligent Auto-Discovery**: Automated network bus interrogation (Port 5025) with recursive `*IDN?` identification for zero-configuration setup.
- **Dynamic HIL Orchestration**: Direct LAN-based execution of industry-standard SCPI commands targets real Signal Generators and Spectrum Analyzers.
- **Actionable Error Matrix**: High-fidelity GUI feedback translates low-level bus timeouts into actionable physical troubleshooting steps.
- **Glass Console™ V2.0**: Enhanced real-time bus monitor broadcasting live SCPI traffic for total operational traceability.
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
