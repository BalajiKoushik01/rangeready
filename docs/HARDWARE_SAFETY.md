# Hardware execution safety and deployment boundary

RangeReady is an RF test **engineering prototype**. Its FastAPI backend can generate and send SCPI commands. Commands may affect physical outputs, frequency, power and equipment state.

## Changed safety defaults

- Browser CORS now uses an explicit origin list rather than a wildcard. Configure `RANGEREADY_ALLOWED_ORIGINS` as a comma-separated list of exact trusted frontend origins, e.g. `http://localhost:5173`.
- `POST /api/ai/agentic-execute` defaults to **simulation only**. Requests with `simulation: false` return HTTP 403 unless `RANGEREADY_ALLOW_AI_HARDWARE_EXECUTION=1` is explicitly set by the operator on the backend host.
- Unexpected AI execution errors are logged on the server without returning raw exception messages to the browser.
- Driver cleanup runs in a `finally` clause after execution attempts.

These gates are **not authentication**. Other direct instrument-control endpoints still exist. Do **not** expose the backend on a public network or use a Cloudflare tunnel before adding authenticated authorization and hardware-specific interlocks.

## Physical test approval

Before enabling AI-to-hardware mode, verify instrument identity and firmware, allowable frequencies and powers, RF termination, emergency disable procedures, calibration state, physical supervision, audit trail and command whitelisting. AI-generated commands must be confirmed by a trained operator before sending. The environment override should be used only on isolated and supervised test equipment.

## Verification

Run `python -m compileall -q backend` and the frontend build CI. These checks cannot validate interlocks, safe RF output or equipment protection. Use instrument simulators and approved isolated hardware tests to establish that evidence.
