# GVB Tech: Hardened Matrix (V5.0)

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Release-V5.0.4--STABLE-accent.svg)](https://github.com/BalajiKoushik01/rangeready)

The **GVB Tech Platform** is a professional-grade RF measurement and automation suite designed for high-throughput component qualification. Reaching its **V5.0 milestone**, the platform integrates an "Infinite Plugin" driver engine with a cinematic "Liquid Glass" user experience, achieving feature parity with industry leaders like **Keysight**, **Rohde & Schwarz**, and **Anritsu**.

---

## 🚀 Key Feature Matrix

- **Universal Driver Engine**: Hardware-agnostic measurement layer supporting TCPIP, USB, and GPIB.
- **Glass Console™ (SCPI Shell)**: Interactive, high-fidelity terminal for real-time instrument command injection.
- **Marker Intelligence**: Automated peak search, -3dB bandwidth detection, and vertical Q-factor derivation.
- **Multi-Matrix HUD**: High-throughput "Dual-View" synchronization for parallel S11/S21 trace monitoring.
- **Vector Calibration (OSLT)**: Professional Wizard for **Open, Short, Load, and Through** correction—matched to ISRO-PHASE-3 standards.
- **Absolute System Control**: One-click "Terminal Danger Zone" for total system purge and organization-wide branding control.

---

## 🏗 Architecture & Layout

The platform is structured as a modernized measurement monorepo:

```text
├── backend/            # FastAPI + NumPy DSP Intelligence Engine
│   ├── drivers/        # Infinite Plugin Hardware Manifests
│   ├── models/         # SQLAlchemy V5.0 Asset Registry
│   ├── routers/        # SCPI Dispatcher & System Control
│   └── services/       # Analysis Engine & OSLT Normalization
├── frontend/           # React + Vite + Tailwind v4 + Framer Motion
│   ├── src/assets/     # Liquid Glass brand assets
│   ├── src/pages/      # Registry, Calibration, Intelligence Runner
│   └── src/components/ # High-fidelity Glass UI library
└── docs/               # Engineering Specifications & Software Manifests
```

---

## 🛠 Quick Start (V5.0 Stable)

### 1. Backend (Intelligence Engine)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 2. Frontend (App Matrix)
```bash
cd frontend
npm install
npm run dev
```

---

## 🏛 Legal & Engineering Credit
Developed as an **Advanced RF Suite** for professional hardware qualification.
**© 2026 GVB LABS CORE**  
**Project Lead: Balaji Koushik // GVB Tech**
