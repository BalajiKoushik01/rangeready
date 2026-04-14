# RangeReady System Traceability Guide

This document provides a manual "Tracer Map" for developers to follow any GUI action down to its literal hardware-level SCPI command.

## 1. The "Click-to-Hardware" Path
When you click a button in the RangeReady GUI, the following sequence occurs:

1.  **GUI Event**: A React component (e.g., `SCPIConsolePage.tsx`) triggers a handler function (e.g., `handleSend`).
2.  **API Call**: The handler sends a JSON request via `fetch()` to a backend endpoint (e.g., `POST /api/commands/send`).
3.  **Command Router**: The backend router (`backend/routers/commands.py`) receives the request and resolves the correct hardware driver using the `PluginManager`.
4.  **Telemetry Broadcast**: Before talking to the hardware, the router broadcasts the packet string to the WebSocket bus (`backend/services/broadcast.py`). This is why you see the "Packet Sent" toast in the bottom-left immediately.
5.  **Driver Execution**: The driver (e.g., `backend/drivers/keysight_universal.py`) formats the command and sends it over a raw TCP socket (Port 5025) to the instrument.
6.  **Response Capture**: If the command was a query (`?`), the driver waits for a response, which is then broadcast back to the Telemetry bus for display in the GUI.

---

## 2. Key Traceability Files

### [Frontend Assets]
- **`InstrumentRegistryPage.tsx`**: Manages hardware registration (DB) and discovery settings.
  - *Trace Handler*: `handleSave` -> `POST /api/instruments/`
- **`SCPIConsolePage.tsx`**: Manages manual command entry.
  - *Trace Handler*: `handleSend` -> `api/commands/send`

### [Backend Logic]
- **`backend/routers/commands.py`**: The "Traffic Controller" that routes all SCPI strings to drivers.
- **`backend/services/discovery_service.py`**: The "Network Sentry" that scans for hardware in the background.
- **`backend/services/status_poller.py`**: The "Heartbeat" that periodically queries instruments for their live state (freq, power, errors).

### [Hardware Drivers]
- **`backend/drivers/keysight_universal.py`**: The literal "Translator."
  - Contains the **SCPI COMMAND REFERENCE TABLE** at the top of the file mapping logic to raw strings.

---

## 3. How to Trace a New Feature
If you want to find where a specific hardware interaction is defined:
1.  Open the GUI source file for the page you are on.
2.  Search for the `TRACE` comment in the handlers.
3.  Follow the API endpoint identified in the comment to the corresponding `backend/routers` file.
4.  From the router, follow the call to the `driver` methods.
5.  In the driver file, look at the method's docstring to see the literal SCPI string (e.g., `SOUR:FREQ:CW`).
