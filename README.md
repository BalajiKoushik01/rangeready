# RangeReady — RF test workflow prototype

RangeReady combines a desktop interface, an instrument-facing Python backend and optional local AI tooling. The repository is structured around instrument discovery, SCPI commands, test sessions, monitoring and reports.

**Status:** engineering prototype. Hardware capabilities and reliability must be verified with the actual instrument, interface and firmware. This README does not guarantee timing, hardware safety, universal instrument support or an error-free release.

## What is in the repository

- `frontend/` — React/Vite interface and charts.
- `backend/` — FastAPI application, instrument drivers and workflow services.
- `backend/drivers/` — generic and vendor-specific adapters, plugin loading and manifests.
- `electron/` — desktop application wrapper.
- `backend/models/` — supporting material for optional local AI assistance.
- `USER_MANUAL.md`, `SETUP.md`, `SYSTEM_ARCHITECTURE.md` and `DATA_FLOW.md` — operational and technical documentation.

The root `package.json` defines development and Electron packaging commands, including Windows-oriented virtual-environment paths.

## Starting with the source

Requirements depend on whether you need the frontend, the backend or instrument communication. Use Node.js and Python in supported versions for the dependency files you are installing.

```bash
git clone https://github.com/BalajiKoushik01/rangeready.git
cd rangeready
npm install
cd frontend
npm install
npm run dev
```

This starts only the frontend. To run the backend, create a virtual environment and install `backend/requirements.txt`, then follow `SETUP.md` and `USER_MANUAL.md`. The repository also includes `RUN_RangeReady.bat` for its Windows-oriented launch workflow.

Optional local model features require model weights and a suitable Ollama installation. Physical instruments may require separately installed VISA/IO libraries and permission to access the instrument network.

## Packaging

`npm run build` invokes **electron-builder**. It is not a substitute for a full integration test. Packaging relies on the configured frontend distribution and an external portable Python resource under `tools/portable_python`. Check your local packaging prerequisites before running the command.

## Hardware and safety notes

- Begin with simulation or a disconnected test setup whenever possible.
- Confirm SCPI commands, parameter limits and output settings for each instrument.
- Do not let a generated AI suggestion directly control hardware without an operator's review.
- Record driver version, firmware, connection details, logs and expected vs actual results.
- Treat any benchmark in prior documentation as unverified until reproduced on the intended equipment.

## Documentation

Start with [SETUP.md](SETUP.md), [USER_MANUAL.md](USER_MANUAL.md), [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) and [DATA_FLOW.md](DATA_FLOW.md). Local drivers, bundled runtimes and operational assets require a separate licensing and security review before redistribution.
