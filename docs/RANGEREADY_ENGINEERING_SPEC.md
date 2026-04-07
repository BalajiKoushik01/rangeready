# ◈ RANGEREADY
### RF Test Automation Platform — Complete Engineering Specification
##### `v1.0` · `GVB Tech Solutions` · `CONFIDENTIAL — Internal Use Only`

---

> **Mission**: Build the instrument that replaces 4 hours of manual RF testing with 35 minutes of precision automation — designed for India's space and defence supply chain, validated by ISRO Range Operations expertise.

---

## 📡 Table of Contents

| # | Section |
|---|---------|
| 1 | [Project DNA](#1-project-dna) |
| 2 | [What We Are Building](#2-what-we-are-building) |
| 3 | [Hardware: Spectrum Analyser](#3-hardware-spectrum-analyser) |
| 4 | [System Architecture](#4-system-architecture) |
| 5 | [Tech Stack](#5-tech-stack) |
| 6 | [Repository Structure](#6-repository-structure) |
| 7 | [Backend — Complete Specification](#7-backend--complete-specification) |
| 8 | [Frontend — Complete Specification](#8-frontend--complete-specification) |
| 9 | [Database Schema](#9-database-schema) |
| 10 | [SCPI Command Reference](#10-scpi-command-reference) |
| 11 | [UI / UX Design System](#11-ui--ux-design-system) |
| 12 | [Build Phases & Milestones](#12-build-phases--milestones) |
| 13 | [API Reference](#13-api-reference) |
| 14 | [Testing Strategy](#14-testing-strategy) |
| 15 | [Installer & Distribution](#15-installer--distribution) |
| 16 | [Engineering Team Rules](#16-engineering-team-rules) |

---

## 1. Project DNA

### The Problem We Solve

Every ISRO vendor lab in India runs RF tests the same broken way:

```
Connect instrument manually
↓
Type config on instrument keypad (error-prone)
↓
Run S11, S21, VSWR one by one
↓
Write down readings on paper
↓
Export .s2p file
↓
Open Excel, manually plot charts
↓
Copy charts into Word template
↓
Write report paragraph by hand
↓
Submit to ISRO
— Total time: 4 to 6 hours per DUT —
```

RangeReady compresses this into:

```
Connect instrument via USB/LAN
↓
Load test template (1 click)
↓
Run full S-param sequence (automated)
↓
Review live dashboard
↓
Click "Generate Report"
— Total time: 20 to 35 minutes per DUT —
```

### Why We Win

| Factor | Keysight / NI / R&S | RangeReady |
|--------|--------------------|-----------:|
| Annual cost | ₹5L – ₹25L | ₹60K – ₹1.5L |
| Install size | 8–15 GB | ~200 MB |
| ISRO report format | ✗ Generic only | ✓ Built-in |
| India MSME focus | ✗ Western enterprise | ✓ Built for this |
| Setup time | Days | 15 minutes |
| Domain validation | ✗ No ISRO insider | ✓ 20+ yr Range Ops |

### Personas

**Arjun — RF Test Engineer** `primary user`
Spends 4 hrs/day running tests manually. Knows instruments well. Hates paperwork. Will love RangeReady.

**Dr. Priya — Lab Manager** `secondary user`
Needs audit trail and summary dashboards. Currently asks Arjun to email her Excel sheets.

**Rajan — Quality Officer** `report consumer`
Submits to ISRO. Needs ISRO-format PDF, no excuses. Currently re-types test results into Word.

---

## 2. What We Are Building

### Application Type
**Electron desktop app** — not a pure web app, not a pure Python GUI. A hybrid:

- `Electron 28` shell wraps a `React 18` frontend
- A local `FastAPI` server handles all hardware communication and business logic
- Electron spawns the FastAPI process on startup
- React communicates with FastAPI via REST + WebSocket on `localhost:8787`
- Final deliverable: a single `.exe` installer for Windows (primary), with macOS/Linux secondary

### The Full System in One View

```
┌─────────────────────────────────────────────────────────────────┐
│  RANGEREADY DESKTOP APP                                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ELECTRON SHELL (main.js)                                │    │
│  │  • Spawns FastAPI process on launch                      │    │
│  │  • Manages app window lifecycle                          │    │
│  │  • Handles file dialogs (save PDF, export Excel)         │    │
│  │  • Kills FastAPI process on app close                    │    │
│  │                                                           │    │
│  │  ┌───────────────────────────────────────────────────┐  │    │
│  │  │  REACT 18 FRONTEND (renderer process)              │  │    │
│  │  │  • All UI screens                                   │  │    │
│  │  │  • Recharts live charts                             │  │    │
│  │  │  • Zustand global state                             │  │    │
│  │  │  • Tailwind CSS styling                             │  │    │
│  │  └───────────┬───────────────────────────────────────┘  │    │
│  │              │ REST + WebSocket (localhost:8787)          │    │
│  │  ┌───────────▼───────────────────────────────────────┐  │    │
│  │  │  FASTAPI BACKEND (Python 3.11)                     │  │    │
│  │  │  • Test sequencing engine                           │  │    │
│  │  │  • Calibration logic                                │  │    │
│  │  │  • Analysis & pass/fail                             │  │    │
│  │  │  • Report generation (PDF + Excel)                  │  │    │
│  │  │  • SQLite database via SQLAlchemy                   │  │    │
│  │  └───────────┬───────────────────────────────────────┘  │    │
│  │              │ PyVISA (USB-TMC / LAN / GPIB)             │    │
│  └──────────────┼──────────────────────────────────────────┘    │
└─────────────────┼───────────────────────────────────────────────┘
                  │
    ┌─────────────▼───────────────┐
    │  LAB INSTRUMENTS             │
    │  • Siglent SSA3032X Plus SA  │
    │  • VNA (future support)      │
    │  • Signal generator (future) │
    └─────────────────────────────┘
```

---

## 3. Hardware: Spectrum Analyser

### Primary Purchase Recommendation

**Siglent SSA3032X Plus**

| Spec | Value | Why It Matters |
|------|-------|----------------|
| Frequency range | 9 kHz – 3.2 GHz | Covers all ISRO TTC / S-band / UHF work |
| Tracking generator | Included | Required for S21 insertion loss measurements |
| SCPI interface | USB-TMC + LAN (TCP 5025) | PyVISA connects via both |
| PyVISA support | ✓ Confirmed | Core dependency for our instrument layer |
| Phase noise | –98 dBc/Hz @ 10 kHz offset | Adequate for TTC band characterization |
| NABL calibration | Available from Indian dealers | Required for ISRO vendor qualification |
| India price | ~₹2.8L – ₹3.5L | Affordable. Buy from Salicon Nano / Batter Fly |
| Display | 10.1" touchscreen | Engineers can also operate standalone |

### Alternative: Rigol DSA832E-TG
~₹3.3L. Full SCPI. Good PyVISA compatibility. Slightly higher noise floor but adequate for all target measurements.

### What to Ask the Vendor (Mandatory)
1. NABL-accredited calibration certificate
2. USB-TMC driver for Windows 10/11 (or download link)
3. SCPI command reference PDF for SSA3032X series
4. GST invoice under **GVB Tech Solutions**

### Hardware Setup Checklist (Before Any Code)

```bash
# Step 1: Verify PyVISA sees the instrument
pip install pyvisa pyvisa-py
python -c "
import pyvisa
rm = pyvisa.ResourceManager('@py')
print(rm.list_resources())
# Expected: ('USB0::0xF4ED::0xEE3A::SSA3XCAQ...::INSTR',)
"

# Step 2: Send first SCPI command
python -c "
import pyvisa
rm = pyvisa.ResourceManager('@py')
inst = rm.open_resource('USB0::0xF4ED::...')
print(inst.query('*IDN?'))
# Expected: SIGLENT,SSA3032X Plus,SSA3XCAQ6R0012,2.1.1.5
"
```

> ⚠️ **Do not start writing application code until this test passes.** The VISA handshake must work before building anything on top of it.

---

## 4. System Architecture

### Architecture Decision Rationale

The fundamental challenge: PyVISA must run on the same machine physically connected to the instrument. Pure web apps cannot do this. But a pure Python GUI (Tkinter, PyQt) cannot deliver the UI quality standard required.

**Solution: Electron as a shell around FastAPI + React**

```
Electron Main Process
├── Spawns: python backend/main.py (FastAPI on port 8787)
├── Serves: React build as static files via FastAPI
├── Bridges: File system dialogs to React via IPC
└── Kills: FastAPI process on app exit

React (Renderer Process)
├── Communicates with FastAPI via: http://localhost:8787/api/*
├── Live data via: ws://localhost:8787/ws
└── File operations via: Electron IPC (window.electronAPI.*)

FastAPI (Local Python Process)
├── Instrument layer: pyvisa → SCPI → instrument
├── Business logic: test sequencing, analysis, reporting
├── Data layer: SQLite via SQLAlchemy
└── WebSocket: streams live trace data to React
```

### Process Lifecycle

```
User double-clicks RangeReady.exe
↓
Electron main.js starts
↓
Electron spawns: python.exe backend/main.py --port 8787
↓
Electron polls http://localhost:8787/health until 200 OK (max 15s)
↓
Electron loads React app (served as static from FastAPI or from Electron directly)
↓
[App is running]
↓
User closes window
↓
Electron sends SIGTERM to FastAPI process
↓
FastAPI closes instrument connections, commits DB
↓
Electron process exits
```

### Port Map

| Service | Address | Notes |
|---------|---------|-------|
| FastAPI HTTP | `localhost:8787` | All REST API calls |
| FastAPI WebSocket | `ws://localhost:8787/ws` | Live trace streaming |
| React dev server | `localhost:3000` | Dev mode only — not in production build |
| Instrument (USB) | `USB0::0xF4ED::...::INSTR` | PyVISA VISA address |
| Instrument (LAN) | `TCPIP::192.168.x.x::5025::SOCKET` | Optional LAN connection |

### Data Flow: Running a Test

```
[1] Engineer clicks "Run Test" on React UI
         ↓
[2] React: POST /api/tests/run  { template_id, calibration_id, dut_name }
         ↓
[3] FastAPI TestRunner picks up the request
         ↓
[4] For each step in the template sequence:
         ↓
    [4a] FastAPI sends SCPI config to instrument via PyVISA
         :SENS:FREQ:STAR 100000000
         :SENS:FREQ:STOP 3200000000
         :SENS:BWID:RES 100000
         :INIT:IMM
         *OPC?  ← wait for sweep to complete
         ↓
    [4b] FastAPI fetches trace: :TRAC:DATA? TRACE1
         ↓
    [4c] FastAPI parses raw CSV → [float, float, ...] array
         ↓
    [4d] FastAPI runs pass/fail analysis vs spec limits
         ↓
    [4e] FastAPI stores result in SQLite
         ↓
    [4f] FastAPI sends result via WebSocket → React updates chart live
         ↓
[5] After all steps: FastAPI generates PDF report
         ↓
[6] React shows completion screen with PASS/FAIL badge and Download button
```

---

## 5. Tech Stack

### Complete Stack — No Ambiguity

#### Desktop Shell
| Package | Version | Install | Purpose |
|---------|---------|---------|---------|
| `electron` | `28.x` | `npm install electron` | Desktop shell, process management |
| `electron-builder` | `24.x` | `npm install electron-builder -D` | Build .exe installer |

#### Frontend
| Package | Version | Install | Purpose |
|---------|---------|---------|---------|
| `react` | `18.x` | `npm create vite@latest` | UI framework |
| `typescript` | `5.x` | included with Vite | Type safety — mandatory |
| `tailwindcss` | `3.4.x` | `npm install tailwindcss` | Styling — utility first |
| `recharts` | `2.x` | `npm install recharts` | Live frequency charts |
| `zustand` | `4.x` | `npm install zustand` | Global state management |
| `axios` | `1.x` | `npm install axios` | HTTP client for FastAPI |
| `react-router-dom` | `6.x` | `npm install react-router-dom` | Client-side routing |
| `lucide-react` | `latest` | `npm install lucide-react` | Icon library |
| `@radix-ui/react-*` | `latest` | `npm install @radix-ui/react-dialog` etc. | Accessible UI primitives |
| `framer-motion` | `11.x` | `npm install framer-motion` | Subtle UI animations |

#### Backend (Python)
| Package | Version | Install | Purpose |
|---------|---------|---------|---------|
| `fastapi` | `0.110.x` | `pip install fastapi` | Web framework |
| `uvicorn[standard]` | `0.29.x` | `pip install uvicorn[standard]` | ASGI server |
| `pyvisa` | `1.14.x` | `pip install pyvisa` | VISA abstraction layer |
| `pyvisa-py` | `0.7.x` | `pip install pyvisa-py` | Pure-Python VISA backend (no NI install) |
| `sqlalchemy` | `2.0.x` | `pip install sqlalchemy` | ORM for SQLite |
| `alembic` | `1.13.x` | `pip install alembic` | Database migrations |
| `numpy` | `1.26.x` | `pip install numpy` | Trace data math |
| `scipy` | `1.12.x` | `pip install scipy` | Signal processing (VSWR, bandwidth) |
| `reportlab` | `4.1.x` | `pip install reportlab` | PDF report generation |
| `openpyxl` | `3.1.x` | `pip install openpyxl` | Excel export |
| `pydantic` | `2.x` | `pip install pydantic` | Request/response validation |
| `python-multipart` | `0.0.9` | `pip install python-multipart` | File uploads |
| `python-jose` | `3.x` | `pip install python-jose[cryptography]` | JWT auth tokens |
| `websockets` | `12.x` | included with uvicorn[standard] | WebSocket support |

#### Build & Packaging
| Tool | Purpose |
|------|---------|
| `PyInstaller 6.x` | Bundle Python + all deps into a folder / single exe |
| `electron-builder` | Wrap Electron + Python bundle into final Windows .exe installer |
| `pyinstaller --onedir` | Use `--onedir` not `--onefile` — faster startup |

---

## 6. Repository Structure

```
rangeready/
│
├── 📁 electron/                        # Electron main process
│   ├── main.js                         # Entry: creates window, spawns FastAPI
│   ├── preload.js                      # IPC bridge (contextBridge API)
│   └── electron-builder.config.js      # Installer configuration
│
├── 📁 frontend/                        # React application
│   ├── src/
│   │   ├── 📁 components/              # Reusable UI components
│   │   │   ├── 📁 charts/
│   │   │   │   ├── FrequencyPlot.tsx   # Main S11/S21 frequency chart
│   │   │   │   ├── SmithChart.tsx      # SVG Smith Chart component
│   │   │   │   ├── VSWRPlot.tsx        # VSWR vs frequency chart
│   │   │   │   └── LiveTrace.tsx       # Real-time updating trace
│   │   │   ├── 📁 wizard/
│   │   │   │   ├── CalibrationWizard.tsx
│   │   │   │   └── TestSequenceRunner.tsx
│   │   │   ├── 📁 ui/                  # Design system primitives
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── StatusDot.tsx
│   │   │   │   └── Tooltip.tsx
│   │   │   └── Layout.tsx              # App shell, sidebar, topbar
│   │   │
│   │   ├── 📁 pages/                   # Route-level screens
│   │   │   ├── InstrumentManager.tsx
│   │   │   ├── CalibrationPage.tsx
│   │   │   ├── SequenceBuilder.tsx
│   │   │   ├── TestRunner.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── History.tsx
│   │   │   ├── ResultDetail.tsx
│   │   │   ├── ReportBuilder.tsx
│   │   │   ├── TemplateLibrary.tsx
│   │   │   └── Settings.tsx
│   │   │
│   │   ├── 📁 store/                   # Zustand state stores
│   │   │   ├── instrument.store.ts     # Connected instruments, status
│   │   │   ├── test.store.ts           # Active test session state
│   │   │   ├── results.store.ts        # Test results, live trace data
│   │   │   └── ui.store.ts             # Theme, sidebar open/closed, etc.
│   │   │
│   │   ├── 📁 api/                     # FastAPI client layer
│   │   │   ├── client.ts               # Axios instance, base URL, interceptors
│   │   │   ├── instruments.api.ts
│   │   │   ├── tests.api.ts
│   │   │   ├── calibration.api.ts
│   │   │   ├── reports.api.ts
│   │   │   └── websocket.ts            # WebSocket connection manager
│   │   │
│   │   ├── 📁 types/                   # TypeScript interfaces
│   │   │   ├── instrument.types.ts
│   │   │   ├── test.types.ts
│   │   │   └── report.types.ts
│   │   │
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css                   # Tailwind directives + CSS variables
│   │
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── 📁 backend/                         # Python FastAPI application
│   ├── main.py                         # FastAPI app + startup + shutdown
│   │
│   ├── 📁 routers/                     # HTTP route handlers
│   │   ├── instruments.py              # /api/instruments/*
│   │   ├── calibration.py              # /api/calibration/*
│   │   ├── tests.py                    # /api/tests/*
│   │   ├── templates.py                # /api/templates/*
│   │   ├── reports.py                  # /api/reports/*
│   │   └── websocket.py                # /ws WebSocket endpoint
│   │
│   ├── 📁 services/                    # Core business logic
│   │   ├── instrument_manager.py       # PyVISA: scan, connect, disconnect
│   │   ├── scpi_layer.py               # All SCPI commands (Siglent SA)
│   │   ├── test_runner.py              # Sequence execution engine
│   │   ├── calibration_service.py      # Cal wizard logic + validation
│   │   ├── analysis_engine.py          # Pass/fail, key metrics, VSWR calc
│   │   └── report_generator.py         # ReportLab PDF + openpyxl Excel
│   │
│   ├── 📁 models/                      # SQLAlchemy ORM models
│   │   ├── base.py                     # DeclarativeBase
│   │   ├── instrument.py
│   │   ├── calibration.py
│   │   ├── test_template.py
│   │   ├── test_session.py
│   │   ├── test_result.py
│   │   ├── engineer.py
│   │   └── report.py
│   │
│   ├── 📁 schemas/                     # Pydantic request/response schemas
│   │   ├── instrument.schema.py
│   │   ├── test.schema.py
│   │   └── report.schema.py
│   │
│   ├── database.py                     # SQLite engine, session factory
│   ├── config.py                       # App settings (port, DB path, etc.)
│   └── requirements.txt
│
├── 📁 shared/                          # Constants used by both backend and frontend
│   ├── constants.py                    # Frequency bands, default spec limits
│   └── constants.ts                    # TypeScript mirror of constants
│
├── 📁 tests/                           # Automated tests
│   ├── 📁 backend/
│   │   ├── test_scpi_mock.py           # SCPI commands (mock instrument)
│   │   ├── test_analysis.py            # Pass/fail logic unit tests
│   │   └── test_report.py              # PDF/Excel generation tests
│   └── 📁 frontend/
│       └── FrequencyPlot.test.tsx      # Chart rendering tests
│
├── 📁 docs/                            # Documentation
│   ├── RANGEREADY_ENGINEERING_SPEC.md  # ← This document
│   └── SCPI_REFERENCE.md               # Siglent SSA3032X SCPI commands
│
├── .env.example                        # Environment variables template
├── .gitignore
└── README.md
```

---

## 7. Backend — Complete Specification

### `backend/main.py` — FastAPI Entry Point

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db
from routers import instruments, calibration, tests, templates, reports, websocket

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    yield
    # Shutdown — close all open instrument connections
    from services.instrument_manager import InstrumentManager
    await InstrumentManager.close_all()

app = FastAPI(title="RangeReady API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "file://"],  # React dev + Electron
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(instruments.router, prefix="/api/instruments")
app.include_router(calibration.router, prefix="/api/calibration")
app.include_router(tests.router, prefix="/api/tests")
app.include_router(templates.router, prefix="/api/templates")
app.include_router(reports.router, prefix="/api/reports")
app.include_router(websocket.router)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
```

---

### `backend/services/instrument_manager.py` — PyVISA Layer

This is the most critical service. Handle every error. Never crash the app if an instrument disconnects.

```python
import pyvisa
import pyvisa.errors
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Use '@py' for PyVISA-py backend (no NI-VISA installation needed)
# Use '' for NI-VISA backend if installed on the client machine
VISA_BACKEND = '@py'

class InstrumentManager:
    _rm: Optional[pyvisa.ResourceManager] = None
    _connected: dict[str, pyvisa.resources.Resource] = {}

    @classmethod
    def get_resource_manager(cls) -> pyvisa.ResourceManager:
        if cls._rm is None:
            cls._rm = pyvisa.ResourceManager(VISA_BACKEND)
        return cls._rm

    @classmethod
    def scan(cls) -> list[dict]:
        """
        Scans for all connected VISA instruments.
        Returns list of dicts with visa_address and identity string.
        """
        rm = cls.get_resource_manager()
        found = []
        try:
            resources = rm.list_resources()
        except Exception as e:
            logger.error(f"Scan failed: {e}")
            return []

        for addr in resources:
            try:
                inst = rm.open_resource(addr)
                inst.timeout = 2000  # 2s timeout for IDN query
                idn = inst.query("*IDN?").strip()
                inst.close()
                parts = idn.split(",")
                found.append({
                    "visa_address": addr,
                    "manufacturer": parts[0] if len(parts) > 0 else "Unknown",
                    "model": parts[1] if len(parts) > 1 else "Unknown",
                    "serial": parts[2] if len(parts) > 2 else "Unknown",
                    "firmware": parts[3] if len(parts) > 3 else "Unknown",
                    "idn": idn,
                })
                logger.info(f"Found instrument: {idn} at {addr}")
            except Exception as e:
                logger.warning(f"Could not query {addr}: {e}")
                continue
        return found

    @classmethod
    def connect(cls, visa_address: str) -> dict:
        """Connects to an instrument and stores the resource object."""
        if visa_address in cls._connected:
            return {"status": "already_connected", "address": visa_address}
        rm = cls.get_resource_manager()
        try:
            inst = rm.open_resource(visa_address)
            inst.timeout = 10000  # 10s default timeout
            # Verify connection
            idn = inst.query("*IDN?").strip()
            cls._connected[visa_address] = inst
            logger.info(f"Connected to {idn}")
            return {"status": "connected", "idn": idn}
        except pyvisa.errors.VisaIOError as e:
            logger.error(f"Failed to connect to {visa_address}: {e}")
            raise

    @classmethod
    def get(cls, visa_address: str) -> pyvisa.resources.Resource:
        """Returns connected instrument resource. Raises if not connected."""
        if visa_address not in cls._connected:
            raise ValueError(f"Instrument {visa_address} is not connected")
        return cls._connected[visa_address]

    @classmethod
    async def close_all(cls):
        """Gracefully closes all open instrument connections."""
        for addr, inst in cls._connected.items():
            try:
                inst.close()
                logger.info(f"Closed connection to {addr}")
            except Exception:
                pass
        cls._connected.clear()
```

---

### `backend/services/scpi_layer.py` — All SCPI Commands

```python
"""
SCPI command layer for Siglent SSA3032X Plus Spectrum Analyser.
All instrument communication goes through this module.
Never put raw SCPI strings anywhere else in the codebase.
"""
import time
import numpy as np
import pyvisa
import logging
from instrument_manager import InstrumentManager

logger = logging.getLogger(__name__)


class SiglentSA:
    """
    High-level SCPI interface for Siglent SSA3032X Plus.
    All methods raise pyvisa.errors.VisaIOError on communication failure.
    """

    def __init__(self, visa_address: str):
        self.addr = visa_address

    @property
    def inst(self) -> pyvisa.resources.Resource:
        return InstrumentManager.get(self.addr)

    # ─── Instrument Control ────────────────────────────────────────────────

    def reset(self):
        """Reset instrument to known default state."""
        self.inst.write("*RST")
        self.inst.write("*CLS")
        self._wait_for_opc(timeout=10)

    def identify(self) -> str:
        return self.inst.query("*IDN?").strip()

    def _wait_for_opc(self, timeout: int = 60):
        """
        Poll *OPC? until instrument reports operation complete.
        CRITICAL: Always use this after triggering a sweep. Never use time.sleep().
        timeout: seconds to wait before raising TimeoutError
        """
        self.inst.timeout = timeout * 1000  # pyvisa uses milliseconds
        result = self.inst.query("*OPC?").strip()
        self.inst.timeout = 10000  # Reset to 10s default
        if result != "1":
            raise TimeoutError(f"OPC? returned '{result}' after {timeout}s")

    # ─── Frequency Configuration ──────────────────────────────────────────

    def set_frequency_range(self, start_hz: float, stop_hz: float):
        """Set sweep frequency range in Hz."""
        self.inst.write(f":SENS:FREQ:STAR {start_hz:.0f}")
        self.inst.write(f":SENS:FREQ:STOP {stop_hz:.0f}")
        logger.debug(f"Freq range: {start_hz/1e6:.1f} – {stop_hz/1e6:.1f} MHz")

    def set_center_span(self, center_hz: float, span_hz: float):
        """Alternative to set_frequency_range — set by center + span."""
        self.inst.write(f":SENS:FREQ:CENT {center_hz:.0f}")
        self.inst.write(f":SENS:FREQ:SPAN {span_hz:.0f}")

    def get_frequency_array(self) -> np.ndarray:
        """
        Returns numpy array of frequency values matching the trace data.
        Use this to build X-axis for charts.
        """
        start = float(self.inst.query(":SENS:FREQ:STAR?"))
        stop = float(self.inst.query(":SENS:FREQ:STOP?"))
        points = int(self.inst.query(":SENS:SWE:POIN?"))
        return np.linspace(start, stop, points)

    # ─── Sweep Configuration ──────────────────────────────────────────────

    def set_rbw(self, rbw_hz: float):
        """Set Resolution Bandwidth in Hz. Typical values: 1e3, 10e3, 100e3, 1e6"""
        self.inst.write(f":SENS:BWID:RES {rbw_hz:.0f}")

    def set_sweep_points(self, points: int):
        """Set number of sweep points. More points = finer detail but slower sweep."""
        self.inst.write(f":SENS:SWE:POIN {points}")

    def set_reference_level(self, level_dbm: float):
        """Set reference level (top of chart) in dBm."""
        self.inst.write(f":DISP:WIND:TRAC:Y:SCAL:RLEV {level_dbm}")

    def set_attenuation(self, atten_db: float):
        """Set input attenuation in dB."""
        self.inst.write(f":SENS:POW:RF:ATT {atten_db}")

    # ─── Sweep Execution ──────────────────────────────────────────────────

    def trigger_single_sweep(self):
        """
        Trigger one sweep and WAIT for it to complete before returning.
        This is the correct way to trigger a measurement — always use this.
        Never use write(':INIT:IMM') without waiting for OPC.
        """
        self.inst.write(":INIT:CONT OFF")       # Single sweep mode
        self.inst.write(":INIT:IMM")            # Trigger the sweep
        self._wait_for_opc(timeout=120)         # Wait up to 2 minutes

    def enable_continuous_sweep(self):
        """Re-enable continuous sweep (used for live preview mode)."""
        self.inst.write(":INIT:CONT ON")

    # ─── Trace Data ───────────────────────────────────────────────────────

    def fetch_trace(self, trace_num: int = 1) -> np.ndarray:
        """
        Fetch trace amplitude data in dBm.
        Returns numpy array of float64 values.
        One value per sweep point — matches the frequency array.
        """
        raw = self.inst.query(f":TRAC:DATA? TRACE{trace_num}")
        # Siglent returns: "#XYYY,val1,val2,..." or just "val1,val2,..."
        # Strip header if present
        if raw.startswith("#"):
            # Binary block header: skip to first comma after digits
            comma_idx = raw.index(",")
            raw = raw[comma_idx + 1:]
        values = [float(v.strip()) for v in raw.split(",") if v.strip()]
        return np.array(values, dtype=np.float64)

    def fetch_sweep_result(self) -> dict:
        """
        Single call: trigger sweep, wait, fetch frequencies and amplitudes.
        Returns dict ready to store in DB and send to frontend.
        """
        self.trigger_single_sweep()
        freq_array = self.get_frequency_array()
        amp_array = self.fetch_trace(1)
        return {
            "frequencies_hz": freq_array.tolist(),
            "amplitudes_dbm": amp_array.tolist(),
            "points": len(freq_array),
        }

    # ─── Tracking Generator (for S21 / Insertion Loss) ────────────────────

    def enable_tracking_generator(self, output_level_dbm: float = -20.0):
        """
        Enable tracking generator for insertion loss / S21 measurements.
        The tracking generator outputs a signal that sweeps with the SA.
        Connect: TG OUTPUT → DUT input → SA input
        """
        self.inst.write(":OUTP:STAT ON")
        self.inst.write(f":SOUR:POW:LEV:IMM:AMPL {output_level_dbm}")
        logger.info(f"Tracking generator ON at {output_level_dbm} dBm")

    def disable_tracking_generator(self):
        self.inst.write(":OUTP:STAT OFF")

    def normalize_tracking_generator(self):
        """
        Store thru measurement as reference for insertion loss normalization.
        PROCEDURE: Connect TG OUTPUT directly to SA INPUT (thru), call this, then insert DUT.
        """
        self.trigger_single_sweep()
        self.inst.write(":TRAC:MATH:FUNC NORM")
        self.inst.write(":TRAC:MATH:STAT ON")
        logger.info("TG normalization applied")

    # ─── Marker Functions ─────────────────────────────────────────────────

    def place_marker(self, marker_num: int, freq_hz: float):
        self.inst.write(f":CALC:MARK{marker_num}:STAT ON")
        self.inst.write(f":CALC:MARK{marker_num}:X {freq_hz:.0f}")

    def get_marker_amplitude(self, marker_num: int) -> float:
        return float(self.inst.query(f":CALC:MARK{marker_num}:Y?"))

    def marker_to_peak(self, marker_num: int = 1):
        """Move marker to peak of current trace."""
        self.inst.write(f":CALC:MARK{marker_num}:MAX")
```

---

### `backend/services/analysis_engine.py` — Pass/Fail & Metrics

```python
"""
Analysis engine: takes raw trace data, applies spec limits, extracts key metrics.
No instrument communication here — pure data analysis.
"""
import numpy as np
from scipy import signal as sp_signal
from dataclasses import dataclass
from typing import Optional


@dataclass
class SpecLimit:
    upper_dbm: Optional[float] = None   # Upper limit in dBm (for each freq point or flat)
    lower_dbm: Optional[float] = None   # Lower limit in dBm
    upper_array: Optional[list[float]] = None  # Per-freq-point upper limits
    lower_array: Optional[list[float]] = None  # Per-freq-point lower limits


@dataclass
class AnalysisResult:
    pass_fail: bool
    min_value_dbm: float
    max_value_dbm: float
    min_freq_hz: float
    max_freq_hz: float
    bandwidth_hz: Optional[float]       # -10 dB bandwidth
    center_freq_hz: Optional[float]
    vswr: Optional[list[float]]         # VSWR array if measurement is S11
    fail_frequencies_hz: list[float]    # Frequencies where limit exceeded
    key_metrics: dict


def analyze_trace(
    frequencies: list[float],
    amplitudes: list[float],
    spec: SpecLimit,
    measurement_type: str = "S11"
) -> AnalysisResult:

    freq = np.array(frequencies)
    amp = np.array(amplitudes)

    # ─── Pass/Fail Check ────────────────────────────────────────────────
    fail_mask = np.zeros(len(amp), dtype=bool)

    if spec.upper_dbm is not None:
        fail_mask |= (amp > spec.upper_dbm)
    if spec.lower_dbm is not None:
        fail_mask |= (amp < spec.lower_dbm)
    if spec.upper_array is not None:
        upper = np.array(spec.upper_array)
        fail_mask |= (amp > upper)
    if spec.lower_array is not None:
        lower = np.array(spec.lower_array)
        fail_mask |= (amp < lower)

    fail_freqs = freq[fail_mask].tolist()
    passed = len(fail_freqs) == 0

    # ─── Key Metrics ────────────────────────────────────────────────────
    min_val = float(np.min(amp))
    max_val = float(np.max(amp))
    min_idx = int(np.argmin(amp))
    max_idx = int(np.argmax(amp))
    min_freq = float(freq[min_idx])
    max_freq = float(freq[max_idx])

    # ─── Bandwidth (for S11: -10 dB bandwidth) ──────────────────────────
    bandwidth = None
    center_freq = None
    threshold = -10.0
    below = amp < threshold
    if np.any(below):
        indices = np.where(below)[0]
        bandwidth = float(freq[indices[-1]] - freq[indices[0]])
        center_freq = float((freq[indices[-1]] + freq[indices[0]]) / 2)

    # ─── VSWR (from S11 / Return Loss) ──────────────────────────────────
    vswr = None
    if measurement_type in ("S11", "S22"):
        # VSWR = (1 + |Γ|) / (1 - |Γ|)  where Γ = 10^(S11_dB / 20)
        gamma = 10.0 ** (amp / 20.0)
        gamma = np.clip(gamma, 0, 0.9999)  # avoid divide by zero
        vswr_array = (1 + gamma) / (1 - gamma)
        vswr = vswr_array.tolist()

    return AnalysisResult(
        pass_fail=passed,
        min_value_dbm=min_val,
        max_value_dbm=max_val,
        min_freq_hz=min_freq,
        max_freq_hz=max_freq,
        bandwidth_hz=bandwidth,
        center_freq_hz=center_freq,
        vswr=vswr,
        fail_frequencies_hz=fail_freqs,
        key_metrics={
            "min_dBm": round(min_val, 2),
            "min_freq_MHz": round(min_freq / 1e6, 3),
            "max_dBm": round(max_val, 2),
            "bandwidth_MHz": round(bandwidth / 1e6, 3) if bandwidth else None,
            "center_freq_MHz": round(center_freq / 1e6, 3) if center_freq else None,
            "vswr_at_center": round(float(10.0 ** (min_val / 20.0) * 2 + 1), 3)
                              if measurement_type in ("S11", "S22") else None,
        }
    )
```

---

### `backend/services/test_runner.py` — Sequence Engine

```python
"""
Test runner: executes a sequence of measurement steps in order.
Streams progress to connected WebSocket clients.
"""
import asyncio
import json
import logging
from datetime import datetime
from services.scpi_layer import SiglentSA
from services.analysis_engine import analyze_trace, SpecLimit
from database import get_session
from models.test_session import TestSession
from models.test_result import TestResult

logger = logging.getLogger(__name__)

# Global WebSocket connection set — populated by websocket router
ws_connections: set = set()


async def broadcast(message: dict):
    """Send message to all connected WebSocket clients."""
    if not ws_connections:
        return
    data = json.dumps(message)
    dead = set()
    for ws in ws_connections:
        try:
            await ws.send_text(data)
        except Exception:
            dead.add(ws)
    ws_connections -= dead


async def run_test_sequence(
    session_id: int,
    visa_address: str,
    template_steps: list[dict],
) -> dict:
    """
    Execute all steps in a test template.
    Each step broadcasts progress via WebSocket.
    Results stored in DB as they complete.
    """
    sa = SiglentSA(visa_address)
    sa.reset()

    results = []

    for i, step in enumerate(template_steps):
        step_name = step["name"]
        meas_type = step["measurement_type"]  # S11, S21, S22, S12, VSWR

        await broadcast({
            "type": "step_start",
            "session_id": session_id,
            "step_index": i,
            "step_name": step_name,
            "total_steps": len(template_steps),
        })

        try:
            # Configure instrument for this step
            sa.set_frequency_range(step["freq_start_hz"], step["freq_stop_hz"])
            sa.set_rbw(step.get("rbw_hz", 100_000))
            sa.set_sweep_points(step.get("points", 601))
            sa.set_reference_level(step.get("ref_level_dbm", 0))

            # Enable tracking generator for S21 measurements
            if meas_type == "S21":
                sa.enable_tracking_generator(step.get("tg_level_dbm", -20))

            # Execute sweep
            sweep_data = sa.fetch_sweep_result()

            # Disable TG if it was enabled
            if meas_type == "S21":
                sa.disable_tracking_generator()

            # Analysis
            spec = SpecLimit(
                upper_dbm=step.get("upper_limit_dbm"),
                lower_dbm=step.get("lower_limit_dbm"),
            )
            analysis = analyze_trace(
                sweep_data["frequencies_hz"],
                sweep_data["amplitudes_dbm"],
                spec,
                meas_type
            )

            # Store result
            with get_session() as db:
                result = TestResult(
                    session_id=session_id,
                    step_index=i,
                    measurement_type=meas_type,
                    step_name=step_name,
                    freq_start_hz=step["freq_start_hz"],
                    freq_stop_hz=step["freq_stop_hz"],
                    frequencies_json=json.dumps(sweep_data["frequencies_hz"]),
                    amplitudes_json=json.dumps(sweep_data["amplitudes_dbm"]),
                    vswr_json=json.dumps(analysis.vswr) if analysis.vswr else None,
                    pass_fail=analysis.pass_fail,
                    key_metrics_json=json.dumps(analysis.key_metrics),
                    completed_at=datetime.utcnow(),
                )
                db.add(result)
                db.commit()
                db.refresh(result)

            results.append({
                "step_index": i,
                "step_name": step_name,
                "pass_fail": analysis.pass_fail,
                "key_metrics": analysis.key_metrics,
            })

            # Broadcast result to frontend
            await broadcast({
                "type": "step_complete",
                "session_id": session_id,
                "step_index": i,
                "step_name": step_name,
                "pass_fail": analysis.pass_fail,
                "trace": {
                    "frequencies": sweep_data["frequencies_hz"][::5],  # Downsample for WS
                    "amplitudes": sweep_data["amplitudes_dbm"][::5],
                },
                "key_metrics": analysis.key_metrics,
            })

        except Exception as e:
            logger.error(f"Step {i} ({step_name}) failed: {e}")
            await broadcast({
                "type": "step_error",
                "session_id": session_id,
                "step_index": i,
                "error": str(e),
            })
            raise

    # All steps done
    overall_pass = all(r["pass_fail"] for r in results)
    with get_session() as db:
        session = db.get(TestSession, session_id)
        session.overall_result = "PASS" if overall_pass else "FAIL"
        session.completed_at = datetime.utcnow()
        db.commit()

    await broadcast({
        "type": "sequence_complete",
        "session_id": session_id,
        "overall_result": "PASS" if overall_pass else "FAIL",
    })

    return {"session_id": session_id, "overall_result": overall_pass, "steps": results}
```

---

## 8. Frontend — Complete Specification

### TypeScript Types

```typescript
// src/types/instrument.types.ts
export interface Instrument {
  id: number;
  visaAddress: string;
  manufacturer: string;
  model: string;
  serial: string;
  firmware: string;
  connectionType: 'USB' | 'LAN' | 'GPIB';
  status: 'connected' | 'disconnected' | 'busy' | 'error';
  lastSeen: string;
}

// src/types/test.types.ts
export interface TestStep {
  name: string;
  measurementType: 'S11' | 'S21' | 'S22' | 'S12' | 'VSWR' | 'GROUP_DELAY';
  freqStartHz: number;
  freqStopHz: number;
  rbwHz: number;
  points: number;
  refLevelDbm: number;
  upperLimitDbm?: number;
  lowerLimitDbm?: number;
}

export interface TestTemplate {
  id: number;
  name: string;
  description: string;
  steps: TestStep[];
  createdAt: string;
  version: number;
}

export interface TestSession {
  id: number;
  templateId: number;
  dutName: string;
  dutSerial: string;
  engineerName: string;
  startedAt: string;
  completedAt?: string;
  overallResult: 'PASS' | 'FAIL' | 'IN_PROGRESS';
}

export interface TraceData {
  frequencies: number[];  // Hz
  amplitudes: number[];   // dBm
}

export interface WebSocketMessage {
  type: 'step_start' | 'step_complete' | 'step_error' | 'sequence_complete';
  sessionId: number;
  stepIndex?: number;
  stepName?: string;
  passFail?: boolean;
  trace?: TraceData;
  keyMetrics?: Record<string, number | null>;
  overallResult?: 'PASS' | 'FAIL';
  error?: string;
}
```

---

### Zustand State Stores

```typescript
// src/store/test.store.ts
import { create } from 'zustand';
import type { TestSession, TraceData, WebSocketMessage } from '../types/test.types';

interface TestStore {
  activeSession: TestSession | null;
  currentStepIndex: number;
  currentTrace: TraceData | null;
  stepResults: Record<number, { passFail: boolean; keyMetrics: Record<string, number | null> }>;
  isRunning: boolean;

  // Actions
  setActiveSession: (session: TestSession | null) => void;
  handleWsMessage: (msg: WebSocketMessage) => void;
  reset: () => void;
}

export const useTestStore = create<TestStore>((set) => ({
  activeSession: null,
  currentStepIndex: 0,
  currentTrace: null,
  stepResults: {},
  isRunning: false,

  setActiveSession: (session) => set({ activeSession: session, isRunning: !!session }),

  handleWsMessage: (msg) => {
    if (msg.type === 'step_start') {
      set({ currentStepIndex: msg.stepIndex ?? 0 });
    }
    if (msg.type === 'step_complete') {
      set((state) => ({
        currentTrace: msg.trace ?? state.currentTrace,
        stepResults: {
          ...state.stepResults,
          [msg.stepIndex!]: {
            passFail: msg.passFail!,
            keyMetrics: msg.keyMetrics ?? {},
          },
        },
      }));
    }
    if (msg.type === 'sequence_complete') {
      set({ isRunning: false });
    }
  },

  reset: () => set({
    activeSession: null,
    currentStepIndex: 0,
    currentTrace: null,
    stepResults: {},
    isRunning: false,
  }),
}));
```

---

### WebSocket Manager

```typescript
// src/api/websocket.ts
import { useTestStore } from '../store/test.store';

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket('ws://localhost:8787/ws');

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        useTestStore.getState().handleWsMessage(msg);
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    this.ws.onclose = () => {
      // Reconnect after 2 seconds
      this.reconnectTimer = setTimeout(() => this.connect(), 2000);
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export const wsManager = new WebSocketManager();
```

---

### FrequencyPlot Component

```typescript
// src/components/charts/FrequencyPlot.tsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend
} from 'recharts';
import { useMemo } from 'react';

interface FrequencyPlotProps {
  frequencies: number[];   // Hz
  amplitudes: number[];    // dBm
  upperLimit?: number;     // dBm — flat limit line
  lowerLimit?: number;     // dBm — flat limit line
  passFail?: boolean;
  title?: string;
}

export function FrequencyPlot({
  frequencies, amplitudes, upperLimit, lowerLimit, passFail, title
}: FrequencyPlotProps) {

  // Downsample to max 601 points for performance
  const data = useMemo(() => {
    const step = Math.max(1, Math.floor(frequencies.length / 601));
    return frequencies
      .filter((_, i) => i % step === 0)
      .map((f, i) => ({
        freq: parseFloat((f / 1e6).toFixed(3)),  // Convert to MHz for display
        amp: parseFloat(amplitudes[i * step]?.toFixed(2) ?? '0'),
      }));
  }, [frequencies, amplitudes]);

  const traceColor = passFail === undefined ? '#38BDF8'  // sky blue — neutral
                   : passFail ? '#34D399'                 // emerald — pass
                   : '#F87171';                           // red — fail

  return (
    <div className="w-full h-80 bg-[#0a0f1e] rounded-lg p-4">
      {title && (
        <p className="text-xs text-slate-400 mb-2 font-mono tracking-wider uppercase">
          {title}
        </p>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="freq"
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickFormatter={(v) => `${v}M`}
            label={{ value: 'Frequency (MHz)', fill: '#475569', fontSize: 11, position: 'insideBottom', offset: -2 }}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickFormatter={(v) => `${v}`}
            label={{ value: 'Amplitude (dBm)', fill: '#475569', fontSize: 11, angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 6 }}
            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
            itemStyle={{ color: traceColor, fontSize: 11 }}
            formatter={(v: number) => [`${v} dBm`, 'Amplitude']}
            labelFormatter={(v) => `${v} MHz`}
          />
          {upperLimit !== undefined && (
            <ReferenceLine y={upperLimit} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: `UL: ${upperLimit}dB`, fill: '#ef4444', fontSize: 10 }} />
          )}
          {lowerLimit !== undefined && (
            <ReferenceLine y={lowerLimit} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: `LL: ${lowerLimit}dB`, fill: '#f59e0b', fontSize: 10 }} />
          )}
          <Line
            type="monotone"
            dataKey="amp"
            stroke={traceColor}
            dot={false}
            strokeWidth={1.5}
            animationDuration={0}   // IMPORTANT: disable animation for live updates
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## 9. Database Schema

### SQLite tables via SQLAlchemy 2.x

```python
# All models — backend/models/

# ─── instruments ────────────────────────────────────────────────────────────
class Instrument(Base):
    __tablename__ = "instruments"
    id: Mapped[int] = mapped_column(primary_key=True)
    visa_address: Mapped[str] = mapped_column(unique=True)
    manufacturer: Mapped[str]
    model: Mapped[str]
    serial_number: Mapped[str]
    firmware: Mapped[str]
    connection_type: Mapped[str]  # USB | LAN | GPIB
    last_seen: Mapped[datetime]

# ─── engineers ───────────────────────────────────────────────────────────────
class Engineer(Base):
    __tablename__ = "engineers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    email: Mapped[Optional[str]]
    role: Mapped[str] = mapped_column(default="engineer")
    created_at: Mapped[datetime]

# ─── calibrations ────────────────────────────────────────────────────────────
class Calibration(Base):
    __tablename__ = "calibrations"
    id: Mapped[int] = mapped_column(primary_key=True)
    instrument_id: Mapped[int] = mapped_column(ForeignKey("instruments.id"))
    engineer_id: Mapped[int] = mapped_column(ForeignKey("engineers.id"))
    cal_type: Mapped[str]       # OPEN_SHORT_LOAD | REFERENCE_LEVEL | THRU
    performed_at: Mapped[datetime]
    expires_at: Mapped[datetime]  # 4 hours after performed_at
    pass_fail: Mapped[bool]
    raw_data_json: Mapped[Optional[str]]  # Cal measurement data

# ─── test_templates ──────────────────────────────────────────────────────────
class TestTemplate(Base):
    __tablename__ = "test_templates"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]                 # e.g. "TTC Antenna L-band"
    description: Mapped[Optional[str]]
    steps_json: Mapped[str]           # JSON array of TestStep dicts
    created_by: Mapped[int] = mapped_column(ForeignKey("engineers.id"))
    version: Mapped[int] = mapped_column(default=1)
    created_at: Mapped[datetime]

# ─── test_sessions ───────────────────────────────────────────────────────────
class TestSession(Base):
    __tablename__ = "test_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("test_templates.id"))
    calibration_id: Mapped[int] = mapped_column(ForeignKey("calibrations.id"))
    instrument_id: Mapped[int] = mapped_column(ForeignKey("instruments.id"))
    engineer_id: Mapped[int] = mapped_column(ForeignKey("engineers.id"))
    dut_name: Mapped[str]
    dut_serial: Mapped[str]
    started_at: Mapped[datetime]
    completed_at: Mapped[Optional[datetime]]
    overall_result: Mapped[str] = mapped_column(default="IN_PROGRESS")

# ─── test_results ────────────────────────────────────────────────────────────
class TestResult(Base):
    __tablename__ = "test_results"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("test_sessions.id"))
    step_index: Mapped[int]
    step_name: Mapped[str]
    measurement_type: Mapped[str]      # S11 | S21 | S22 | S12 | VSWR
    freq_start_hz: Mapped[float]
    freq_stop_hz: Mapped[float]
    frequencies_json: Mapped[str]      # JSON array of floats — NOT comma-separated text
    amplitudes_json: Mapped[str]       # JSON array of floats
    vswr_json: Mapped[Optional[str]]   # JSON array of floats (if applicable)
    pass_fail: Mapped[bool]
    key_metrics_json: Mapped[str]      # JSON dict of extracted metrics
    completed_at: Mapped[datetime]

# ─── reports ─────────────────────────────────────────────────────────────────
class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("test_sessions.id"))
    generated_at: Mapped[datetime]
    file_path: Mapped[str]
    version: Mapped[int] = mapped_column(default=1)
    format: Mapped[str] = mapped_column(default="PDF")  # PDF | EXCEL
```

---

## 10. SCPI Command Reference

### Siglent SSA3032X Plus — Complete Command Map

```
IDENTIFICATION
  *IDN?                             → "SIGLENT,SSA3032X Plus,{serial},{fw}"
  *RST                              → Reset to factory defaults
  *CLS                              → Clear status registers
  *OPC?                             → "1" when operation complete ← ALWAYS WAIT FOR THIS

FREQUENCY SETUP
  :SENS:FREQ:STAR {hz}              → Set start frequency (Hz)
  :SENS:FREQ:STOP {hz}              → Set stop frequency (Hz)
  :SENS:FREQ:CENT {hz}              → Set centre frequency
  :SENS:FREQ:SPAN {hz}              → Set span
  :SENS:FREQ:STAR?                  → Query start frequency
  :SENS:FREQ:STOP?                  → Query stop frequency

SWEEP CONFIGURATION
  :SENS:BWID:RES {hz}               → Set RBW (1 Hz to 10 MHz)
  :SENS:BWID:VID {hz}               → Set VBW
  :SENS:SWE:POIN {n}                → Set number of sweep points (101–30001)
  :SENS:SWE:TIME {s}                → Set sweep time (AUTO by default)
  :SENS:SWE:POIN?                   → Query number of points

AMPLITUDE
  :DISP:WIND:TRAC:Y:SCAL:RLEV {dbm} → Set reference level
  :SENS:POW:RF:ATT {db}             → Set input attenuation (0–50 dB)
  :SENS:POW:RF:ATT:AUTO ON|OFF      → Auto/manual attenuation

SWEEP CONTROL
  :INIT:CONT ON|OFF                 → Continuous / single sweep mode
  :INIT:IMM                         → Trigger immediate sweep
  *OPC?                             → Wait for sweep completion ← MANDATORY AFTER :INIT:IMM

TRACE DATA
  :TRAC:DATA? TRACE1                → Fetch TRACE1 data (CSV of dBm values)
  :TRAC:TYPE TRACE1, WRIT|MAXH|MINH|MATH → Trace type (write/max hold/min hold)
  :TRAC:MODE TRACE1, BLAN           → Blank (hide) trace

TRACKING GENERATOR
  :OUTP:STAT ON|OFF                 → Enable/disable tracking generator
  :SOUR:POW:LEV:IMM:AMPL {dbm}     → Set TG output level (-40 to 0 dBm)
  :TRAC:MATH:FUNC NORM              → Apply normalization
  :TRAC:MATH:STAT ON|OFF            → Enable/disable math function

MARKERS
  :CALC:MARK{1-4}:STAT ON|OFF       → Enable/disable marker
  :CALC:MARK{1-4}:X {hz}            → Set marker frequency
  :CALC:MARK{1-4}:Y?                → Query marker amplitude
  :CALC:MARK{1-4}:MAX               → Move marker to peak
  :CALC:MARK{1-4}:FUNC BPOW         → Band power function

CALIBRATION (Reference Level)
  :CAL:AUTO ONCE                    → Perform auto-calibration
```

### S-Parameter Measurement Sequences

```
S11 MEASUREMENT (Input Return Loss)
────────────────────────────────────
Prerequisites: Connect DUT input to SA input. No TG needed.
*RST
:SENS:FREQ:STAR {start_hz}
:SENS:FREQ:STOP {stop_hz}
:SENS:BWID:RES {rbw_hz}
:SENS:SWE:POIN 601
:DISP:WIND:TRAC:Y:SCAL:RLEV 0
:INIT:CONT OFF
:INIT:IMM
*OPC?                               ← WAIT
:TRAC:DATA? TRACE1                  → CSV of return loss values in dBm

S21 MEASUREMENT (Forward Transmission / Insertion Loss)
──────────────────────────────────────────────────────────
Prerequisites: Connect TG OUTPUT → DUT input. Connect DUT output → SA input.
Step 1 (Normalization — THRU):
  Connect TG OUTPUT directly to SA INPUT (bypass DUT)
  :OUTP:STAT ON
  :SOUR:POW:LEV:IMM:AMPL -20
  :INIT:IMM
  *OPC?
  :TRAC:MATH:FUNC NORM
  :TRAC:MATH:STAT ON

Step 2 (Measurement — insert DUT):
  Connect TG OUTPUT → DUT → SA INPUT
  :INIT:IMM
  *OPC?
  :TRAC:DATA? TRACE1                → S21 values in dB (relative to THRU)

VSWR CALCULATION (from S11)
────────────────────────────
Computed in Python after S11 measurement:
  gamma = 10 ** (S11_dB / 20)      # reflection coefficient magnitude
  VSWR = (1 + gamma) / (1 - gamma)
  Target: VSWR < 2.0 across band (≡ S11 < -9.5 dB)
```

---

## 11. UI / UX Design System

### Theme — Space Command

The visual identity of RangeReady is **Space Command**: the aesthetic of a mission control room — dark, precise, data-rich, and calm under pressure. Every engineer who opens it should feel like they are operating something serious.

```css
/* src/index.css — CSS custom properties */
:root {
  /* Backgrounds */
  --bg-void:    #020510;   /* Deepest background — like space */
  --bg-base:    #070d1a;   /* App background */
  --bg-surface: #0d1628;   /* Cards, panels */
  --bg-raised:  #111e33;   /* Elevated elements, hover states */
  --bg-border:  #1a2a45;   /* Borders, dividers */

  /* Text */
  --text-primary:   #e2e8f0;   /* Main text */
  --text-secondary: #64748b;   /* Labels, meta */
  --text-muted:     #334155;   /* Placeholders, disabled */

  /* Accent — Signal Blue (instrument traces, primary actions) */
  --accent-signal:  #38bdf8;   /* Sky blue — primary interactive */
  --accent-glow:    #0ea5e9;   /* Slightly deeper — hover */

  /* Status */
  --status-pass:    #34d399;   /* Emerald green — PASS */
  --status-fail:    #f87171;   /* Red — FAIL */
  --status-warn:    #fbbf24;   /* Amber — warning / in-progress */
  --status-info:    #818cf8;   /* Indigo — informational */

  /* Typography */
  --font-ui:   'Inter', system-ui, sans-serif;   /* All UI text */
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;   /* Values, SCPI, code */
  --font-data: var(--font-mono);   /* Frequency values, dBm values */
}
```

### tailwind.config.js

```javascript
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void:    '#020510',
        base:    '#070d1a',
        surface: '#0d1628',
        raised:  '#111e33',
        border:  '#1a2a45',
        signal:  '#38bdf8',
        pass:    '#34d399',
        fail:    '#f87171',
        warn:    '#fbbf24',
      },
      fontFamily: {
        ui:   ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

### Screen Designs

#### App Shell — Sidebar Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ◈ RANGEREADY          [instrument status pill] [engineer]   │  ← topbar 48px
├────────────┬─────────────────────────────────────────────────┤
│            │                                                  │
│  ◉ Instruments         MAIN CONTENT AREA                    │
│  ─────────              • Fills remaining width              │
│  ⊕ Calibrate           • Scrollable vertically              │
│  ─────────              • Max content width: 1200px         │
│  ▶ Run Test             • Centered with auto margins         │
│  ─────────                                                   │
│  ≡ History                                                   │
│  ─────────                                                   │
│  ≡ Templates                                                 │
│  ─────────                                                   │
│  ⚙ Settings                                                  │
│            │                                                  │
│  240px     │                                                  │
│  sidebar   │                                                  │
└────────────┴─────────────────────────────────────────────────┘
```

**Sidebar:** `bg-surface border-r border-border`. Nav items: 40px height, `font-mono text-xs tracking-widest text-secondary`. Active: `text-signal bg-raised rounded`.

#### Instrument Manager Screen

- Large monospace VISA address display
- Status dot: animated pulse for `connected`, solid dim for `disconnected`
- "Scan" button triggers scan animation (rotate icon 360°)
- Instrument card shows: model, serial, firmware, connection type badge

#### Test Runner Screen (During Active Test)

```
┌───────────────────────────────────────────────────────────────┐
│  TEST RUNNING  ●●○○○  Step 2 of 5: S21 Insertion Loss        │
│  DUT: TTC-ANT-2024-0087                      ETA: ~2:30 min  │
├────────────────────────────────┬──────────────────────────────┤
│                                │                               │
│   LIVE TRACE                   │  STEP RESULTS                │
│   [FrequencyPlot — dark bg]    │  ✓ S11  -18.3 dBm  PASS     │
│   Trace: sky blue              │  ▶ S21  (running)            │
│   Upper limit: red dashed      │  ○ S22                       │
│                                │  ○ S12                       │
│                                │  ○ VSWR                      │
│                                │                               │
├────────────────────────────────┴──────────────────────────────┤
│  KEY METRICS (updating live)                                  │
│  Min: -23.1 dBm @ 2.45 GHz   BW: 420 MHz   Center: 2.47 GHz │
│                                                               │
│                              [ ABORT TEST ]                   │
└───────────────────────────────────────────────────────────────┘
```

#### PASS / FAIL State — Design Rules

```
PASS state:
  • Overall badge: bg-pass/10 text-pass border border-pass/30
  • Trace color: var(--status-pass) = #34d399
  • Key metric values: text-pass

FAIL state:
  • Overall badge: bg-fail/10 text-fail border border-fail/30
  • Trace color: var(--status-fail) = #f87171
  • Failed frequency range: vertical red band overlay on chart
  • Key metric values: text-fail for any failing metric
```

### Typography Rules

| Element | Style |
|---------|-------|
| Screen titles | `font-mono text-xs tracking-[0.2em] text-secondary uppercase` |
| Instrument model name | `font-mono text-sm text-primary` |
| Frequency values | `font-mono text-base tabular-nums text-signal` |
| dBm values | `font-mono text-sm tabular-nums` |
| PASS badge | `font-mono text-xs tracking-widest text-pass` |
| FAIL badge | `font-mono text-xs tracking-widest text-fail` |
| Body text / descriptions | `font-ui text-sm text-secondary` |
| Nav items | `font-mono text-xs tracking-widest text-secondary` |

> **Rule:** All data values (frequencies, dBm, VSWR) must use `font-mono` and `tabular-nums`. This prevents layout jumping as values update live.

---

## 12. Build Phases & Milestones

### Phase 1 — Core Engine (Weeks 1–4)

**Goal: A demo that runs a real test on a real instrument.**

| # | Week | Task | Done When |
|---|------|------|-----------|
| 1.1 | 1 | Dev machine: PyVISA sees Siglent via `*IDN?` | Terminal prints model string |
| 1.2 | 1 | FastAPI scaffold with `/health` endpoint | Electron opens window, React loads |
| 1.3 | 1 | Electron spawns/kills FastAPI process | App start/close works cleanly |
| 1.4 | 2 | SCPI layer: set freq, set RBW, trigger sweep, fetch trace | Python script returns 601 float values |
| 1.5 | 2 | SQLite schema + all ORM models created | Alembic migration runs without error |
| 1.6 | 3 | S11 measurement: full flow, stored in DB | Session row appears in SQLite after test |
| 1.7 | 3 | FrequencyPlot component renders real trace data | Chart shows in React |
| 1.8 | 4 | Pass/fail against flat spec limit | Red/green trace + PASS/FAIL badge |
| 1.9 | 4 | **Phase 1 demo to Balaji** | Full flow works on real instrument |

### Phase 2 — Full Product (Weeks 5–8)

**Goal: First paying client installed and using the software.**

| # | Week | Task | Done When |
|---|------|------|-----------|
| 2.1 | 5 | Full S11/S21/S22/S12/VSWR auto-sequence | All 5 steps run sequentially, results stored |
| 2.2 | 5 | Calibration wizard (step-by-step UI + validation) | Cal blocks test if expired |
| 2.3 | 5 | Tracking generator control (for S21) | TG on/off + normalization works |
| 2.4 | 6 | Test template builder (create, save, load) | Engineer can create and reuse templates |
| 2.5 | 6 | Smith Chart SVG component | S11 data renders on impedance chart |
| 2.6 | 7 | PDF report generator (ReportLab, ISRO format) | Report downloads in <10 sec |
| 2.7 | 7 | Test history screen with filter/sort | All sessions visible and searchable |
| 2.8 | 8 | PyInstaller + electron-builder → `.exe` installer | Runs on clean Windows PC, no installs needed |
| 2.9 | 8 | **Install at first client lab. Collect payment.** | First ₹ received |

### Phase 3 — Premium Layer (Weeks 9–14)

| Feature | Description |
|---------|-------------|
| Cloud sync | Completed test data syncs to hosted backend. Manager sees all results from browser. |
| Multi-user | Engineer profiles. Each session tagged. Audit trail. |
| Historical trends | Plot same measurement across N sessions. Drift detection. |
| DRDO DPR auto-fill | Populate government document templates from test data. High revenue driver. |
| Excel export | Full raw data + embedded charts exported to `.xlsx` |
| Multi-instrument | Support VNA (Siglent SVA1032X) + spectrum analyser in same session |
| AI anomaly flag | Rolling z-score: flag if result deviates from historical average |

---

## 13. API Reference

### Instruments

```
GET    /api/instruments/scan          Scan for connected VISA instruments
GET    /api/instruments               List all known instruments from DB
POST   /api/instruments/connect       { visa_address } → connect
DELETE /api/instruments/{id}/disconnect
GET    /api/instruments/{id}/status   → { status: connected|busy|disconnected }
```

### Calibration

```
POST   /api/calibration/start         { instrument_id, engineer_id, cal_type }
POST   /api/calibration/step-complete { calibration_id, step, measurements }
GET    /api/calibration/valid/{instrument_id}  → latest valid cal or null
GET    /api/calibration/history        Filter by instrument, date, engineer
```

### Tests

```
GET    /api/tests/templates            List all templates
POST   /api/tests/templates            Create template { name, steps[] }
GET    /api/tests/templates/{id}
PUT    /api/tests/templates/{id}
DELETE /api/tests/templates/{id}

POST   /api/tests/run                  { template_id, calibration_id, dut_name, dut_serial }
                                       → { session_id } — execution runs async, streams via WS
GET    /api/tests/sessions             List all sessions (paginated)
GET    /api/tests/sessions/{id}        Full session with all step results
POST   /api/tests/sessions/{id}/abort  Abort running test
```

### Reports

```
POST   /api/reports/generate           { session_id, format: pdf|excel }
                                       → { report_id, file_url }
GET    /api/reports/{id}/download      Returns file stream
GET    /api/reports/history            List all generated reports
```

### WebSocket

```
ws://localhost:8787/ws

Incoming messages (server → client):
  { type: "step_start",      session_id, step_index, step_name, total_steps }
  { type: "step_complete",   session_id, step_index, pass_fail, trace, key_metrics }
  { type: "step_error",      session_id, step_index, error }
  { type: "sequence_complete", session_id, overall_result }
```

---

## 14. Testing Strategy

### Backend Unit Tests

```bash
# Run all backend tests
cd backend
pytest tests/ -v

# Key test files:
# tests/test_scpi_mock.py    — Mock instrument, test all SCPI methods
# tests/test_analysis.py     — Pass/fail logic with known datasets
# tests/test_report.py       — PDF generation, verify output file exists
```

**Mock instrument for SCPI tests:**
```python
# tests/conftest.py
from unittest.mock import MagicMock
import pytest

@pytest.fixture
def mock_instrument():
    inst = MagicMock()
    inst.query.side_effect = lambda cmd: {
        "*IDN?": "SIGLENT,SSA3032X Plus,TEST001,2.1.1.5",
        "*OPC?": "1",
        ":SENS:FREQ:STAR?": "100000000.0",
        ":SENS:FREQ:STOP?": "3200000000.0",
        ":SENS:SWE:POIN?": "601",
        ":TRAC:DATA? TRACE1": ",".join([f"{-50 + i*0.01:.2f}" for i in range(601)])
    }.get(cmd, "0")
    return inst
```

### Frontend Tests

```bash
cd frontend
npm test

# Key tests:
# FrequencyPlot.test.tsx  — Renders with data, handles empty data gracefully
# websocket.test.ts       — WS manager connects, reconnects, parses messages
```

### Integration Test (Milestone Gate)

Before Phase 1 sign-off, the following must pass on real hardware:
1. App starts, FastAPI health check returns 200
2. Instrument scan finds connected Siglent SA
3. S11 measurement runs end-to-end
4. Result stored in SQLite
5. FrequencyPlot renders the captured trace
6. Pass/fail badge shows correctly against flat -10 dBm limit

---

## 15. Installer & Distribution

### Build Process

```bash
# Step 1: Bundle Python backend with PyInstaller
cd backend
pyinstaller main.py \
  --name rangeready-backend \
  --onedir \
  --hidden-import pyvisa \
  --hidden-import pyvisa_py \
  --hidden-import sqlalchemy \
  --hidden-import reportlab \
  --hidden-import openpyxl

# Step 2: Build React frontend
cd ../frontend
npm run build
# Output: dist/ folder

# Step 3: Copy dist/ into Electron resources
cp -r frontend/dist electron/renderer/

# Step 4: Build Electron installer
cd ../electron
npm run dist
# Output: dist/RangeReady-Setup-1.0.0.exe (Windows)
#         dist/RangeReady-1.0.0.dmg (macOS)
```

### electron-builder.config.js

```javascript
module.exports = {
  appId: "com.gvbtech.rangeready",
  productName: "RangeReady",
  copyright: "© 2025 GVB Tech Solutions",
  directories: { output: "dist" },
  files: [
    "main.js",
    "preload.js",
    "renderer/**",
    "!**/node_modules/**",
  ],
  extraResources: [
    { from: "../backend/dist/rangeready-backend", to: "backend", filter: ["**/*"] }
  ],
  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    icon: "assets/icon.ico",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: "assets/icon.ico",
    installerHeaderIcon: "assets/icon.ico",
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
  publish: null,  // Manual distribution only — no auto-update for now
};
```

### Installer Size Target
- Python bundle: ~80–120 MB
- Electron: ~80 MB
- React build: ~5 MB
- **Total installer: ~200–250 MB** — acceptable for a lab instrument software

---

## 16. Engineering Team Rules

### The Non-Negotiables

```
1.  Never use time.sleep() to wait for an instrument sweep.
    Always use *OPC? polling. Sweep time varies with span and RBW.

2.  Never store trace data as comma-separated text in the database.
    Always use JSON arrays: json.dumps([float, float, ...])

3.  Never call fetch() directly in React components.
    All HTTP calls go through /src/api/ layer only.

4.  Never hardcode VISA addresses anywhere.
    Addresses come from the database or are discovered at runtime.

5.  Never let a PyVISA exception crash FastAPI.
    Wrap every instrument call in try/except. Return error status to frontend.

6.  Never animate Recharts Line charts with live data.
    Set animationDuration={0} on all Line components receiving WebSocket updates.

7.  Never use font sizes below 10px in the UI.
    Everything must be legible at arm's length on a lab monitor.

8.  Always use tabular-nums on all numerical display elements.
    Values must not shift layout when they update.

9.  Always wait for *OPC? to return "1" before fetching trace data.
    Never assume the sweep is done based on timing.

10. When in doubt about what ISRO expects in a report — ask the domain expert.
    Do not guess. This is the product's core differentiator.

11. AI models must run 100% OFFLINE (Option A).
    Never send sensitive RF measurements to external cloud APIs.

12. Use the SOLT Calibration Engine for custom error correction.
    Native software-side vector correction is mandatory for proprietary cal-kits.
```

### Git Commit Convention

```
feat: add S21 tracking generator support
fix: resolve OPC timeout on narrow RBW sweeps
perf: downsample WebSocket trace to 120 points for render performance
ui: update FrequencyPlot pass/fail trace colors
docs: add VSWR calculation notes to analysis engine
test: add mock instrument fixtures for SCPI unit tests
```

### Code Review Checklist

Before any PR merges to `develop`:
- [ ] No raw SCPI strings outside `scpi_layer.py`
- [ ] All instrument calls wrapped in try/except
- [ ] No `time.sleep()` — all async waits use `*OPC?`
- [ ] Trace data stored as JSON arrays
- [ ] React components handle `null` / empty trace data without crashing
- [ ] TypeScript: no `any` types on instrument data (define proper interfaces)
- [ ] Tested in dark mode (light mode nice-to-have)
- [ ] No console.log left in production code

### Domain Questions — Who to Ask

| Question Type | Ask |
|--------------|-----|
| What SCPI commands does the Siglent SA support? | SCPI reference PDF + `scpi_layer.py` |
| What spec limits does ISRO use for a TTC antenna? | Domain Expert (Balaji's father) |
| What format does the ISRO qualification report need? | Domain Expert — mandatory before building report generator |
| Which measurements come first in the sequence? | Domain Expert |
| UI/UX decisions | Balaji |
| Architecture decisions | Engineering Lead + Balaji |

---

```
  ◈ RANGEREADY  ·  Engineering Specification  ·  v2.0           │
  GVB Tech Solutions  ·  Sriharikota / Bengaluru                │
  CONFIDENTIAL — Internal Use Only                               │
                                                                   │
  "Mission control quality. For every RF lab in India."          │
                                                                   │
└─────────────────────────────────────────────────────────────────┘

---

## 1. Project Overview & Version History

| Version | Date | Changes | Author |
|---|---|---|---|
| 1.0 | 2025-10-15 | Initial baseline for TRM bench testing | Balaji Koushik |
| 2.0 | 2026-04-07 | Enterprise ATE: AI Diagnostics, Switch Matrix, LXI Discovery | Balaji Koushik |
```
