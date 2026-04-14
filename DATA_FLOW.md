# RangeReady — Literal Data Flow Documentation

> This document maps the exact path of every action from a GUI button click through the backend system to the physical electron on the coaxial cable. Use this to trace any SCPI packet end-to-end.

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                              │
│  React/Vite (localhost:5173)                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Dashboard   │  │ SCPI Console │  │  Intelligence HUD      │ │
│  │ Controls    │  │  + Registry  │  │  (AI Chat + Agentic)   │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬─────────────┘ │
└─────────┼───────────────┼───────────────────────┼─────────────┘
          │  HTTP POST     │  HTTP POST            │  HTTP POST
          ▼               ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FASTAPI BACKEND                               │
│  Python (localhost:8787)                                        │
│  ┌──────────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ routers/         │  │ services/    │  │ routers/ai.py     │ │
│  │ commands.py      │  │ scpi_        │  │ POST /agentic-    │ │
│  │ POST /send       │  │ negotiation_ │  │ execute           │ │
│  └────────┬─────────┘  │ engine.py    │  └────────┬──────────┘ │
│           │             └──────┬───────┘           │            │
│           └────────────────────┼───────────────────┘            │
│                                │                                 │
│  ┌─────────────────────────────▼───────────────────────────┐   │
│  │              drivers/plugin_manager.py                  │   │
│  │  KeysightUniversalDriver | RSUniversalDriver |          │   │
│  │  GenericSCPIDriver                                      │   │
│  └─────────────────────────────┬───────────────────────────┘   │
└────────────────────────────────┼────────────────────────────────┘
                                 │  TCP/IP Socket (port 5025)
                                 ▼
              ┌──────────────────────────────────┐
              │        PHYSICAL HARDWARE          │
              │  Keysight N517xB / R&S SMW /     │
              │  Any SCPI-compliant instrument    │
              └──────────────────────────────────┘
```

---

## 2. Complete SCPI Command Data Flow

### 2A. GUI Button Press → Hardware Signal

**Example: User clicks "RF ON" on the Dashboard**

```
1. GUI: DashboardPage.tsx
   → Button onClick fires
   → fetch("POST http://localhost:8787/api/commands/send")
   → Body: {
       driver_name: "KeysightUniversalDriver",
       command: "OUTP ON",
       address: "TCPIP::192.168.1.100::5025::SOCKET",
       use_negotiation_engine: true
     }

2. FastAPI: routers/commands.py → send_command()
   → PluginManager.get_driver("KeysightUniversalDriver")
     → Looks up cls._drivers["KeysightUniversalDriver"]
     → Returns KeysightUniversalDriver(simulation=False)
   → driver.connect("TCPIP::192.168.1.100::5025::SOCKET")
     → Opens TCP socket to 192.168.1.100:5025

3. Telemetry broadcast BEFORE execution:
   → manager.broadcast({type: "telemetry_packet", packet: "OUTP ON"})
   → All WebSocket clients (GUI TelemetrySentry, DiscoveryPanel) receive it
   → TelemetrySentry shows: "→ OUTP ON [192.168.1.100]"

4. SCPINegotiationEngine.send("OUTP ON")
   → Check heal_cache: no hit, use original
   → driver.write("OUTP ON")
     → socket.sendall(b"OUTP ON\n")              ← Bytes on the wire
     ← Hardware ACKs (no response for write commands)
   → driver.check_errors()
     → socket.sendall(b"SYST:ERR?\n")
     ← Hardware responds: b"+0,\"No error\"\n"
   → No errors → return {status: "success", command_sent: "OUTP ON"}

5. FastAPI: Returns JSON to GUI
   → {status: "success", response: "Executed", command_sent: "OUTP ON"}

6. GUI: Updates button state → RF ON indicator turns green
```

---

### 2B. Error Auto-Healing Flow

**Example: Hardware returns `-113 "Undefined header"` for `FREQ 2.4E9`**

```
1. SCPINegotiationEngine.send("FREQ 2.4E9", retries=0)
   → driver.write("FREQ 2.4E9")
   → driver.check_errors() → ["-113, Undefined header"]

2. _parse_error("-113, Undefined header") → code=-113
   SCPI_ERROR_DB[-113] = {strategy: "try_alternate_header"}

3. _apply_heal(-113, ..., "FREQ 2.4E9", attempt=0)
   → HEADER_ALTERNATES["FREQ"] = ["SOUR:FREQ:CW", "SOUR:FREQ", ":FREQ", ...]
   → healed_cmd = "SOUR:FREQ:CW 2.4E9"

4. heal_actions.append("Error -113: 'FREQ 2.4E9' → 'SOUR:FREQ:CW 2.4E9'")
   → heal_cache["FREQ 2.4E9"] = "SOUR:FREQ:CW 2.4E9"  (cached for next time)

5. Recursive: SCPINegotiationEngine.send("SOUR:FREQ:CW 2.4E9", retries=1)
   → driver.write("SOUR:FREQ:CW 2.4E9")
   → driver.check_errors() → [] (no error)
   → return {status: "success"}

6. Outer call sets status="healed", returns full result

7. commands.py broadcasts:
   → {type: "telemetry_heal", packet: "Error -113: FREQ → SOUR:FREQ:CW"}
   → DiscoveryVisibilityPanel shows: "⚡ Auto-corrected SCPI command"
   → TelemetrySentry shows: "[AUTO-HEAL] Error -113..."

8. Next time "FREQ 2.4E9" is sent: heal_cache hit → "SOUR:FREQ:CW 2.4E9" used immediately
```

---

### 2C. AI Agentic Execution Flow

**Example: User types "Set frequency to 2.4 GHz" with Agentic Mode ON**

```
1. GUI: IntelligenceHUD.tsx [Agentic Tab]
   → User selects instrument: Keysight N5171B @ 192.168.1.100
   → User types: "Set frequency to 2.4 GHz"
   → fetch("POST http://localhost:8787/api/ai/agentic-execute")
   → Body: {
       query: "Set frequency to 2.4 GHz",
       driver_name: "KeysightUniversalDriver",
       address: "TCPIP::192.168.1.100::5025::SOCKET"
     }

2. FastAPI: routers/ai.py → agentic_execute()
   → PluginManager.get_driver("KeysightUniversalDriver")
   → driver.connect("TCPIP::192.168.1.100::5025::SOCKET")
   → idn = driver.idn → "Keysight,N5171B,MY12345,B.00.01"

3. Broadcast intent:
   → manager.broadcast({type: "system_info",
       message: "[AI Agent] 'Set frequency to 2.4 GHz' → translating for Keysight N5171B"})

4. ai_copilot.agentic_execute("Set frequency to 2.4 GHz", idn, driver)
   → _generate(AGENTIC_SYSTEM_PROMPT, "Instrument: Keysight,N5171B... Command: Set frequency to 2.4 GHz")
     → Gemma-2-2B model (local .gguf file)
     → Formatted prompt:
       "<start_of_turn>user\nYou are an agentic RF controller...\nInstrument: Keysight,N5171B\nCommand: Set frequency to 2.4 GHz<end_of_turn>\n<start_of_turn>model\n"
     → Model outputs: "SOUR:FREQ:CW 2.4E9"
   
   → SCPINegotiationEngine.send("SOUR:FREQ:CW 2.4E9")
     → driver.write("SOUR:FREQ:CW 2.4E9")
       → socket.sendall(b"SOUR:FREQ:CW 2.4E9\n")   ← Bytes on the wire
     → driver.check_errors() → no errors
     → return {status: "success", command_sent: "SOUR:FREQ:CW 2.4E9"}

5. Broadcasts:
   → {type: "telemetry_packet", packet: "[AI→HW] SOUR:FREQ:CW 2.4E9"}
   → TelemetrySentry shows: "→ [AI→HW] SOUR:FREQ:CW 2.4E9 [192.168.1.100]"

6. GUI: IntelligenceHUD shows:
   ┌─────────────────────────────────────────┐
   │ 🤖 RangeReady AI                        │
   │ Executed on Keysight N5171B.            │
   │ ┌───────────────────────────────────┐  │
   │ │ SCPI: SOUR:FREQ:CW 2.4E9         │  │
   │ └───────────────────────────────────┘  │
   │ ✅ EXECUTED                             │
   └─────────────────────────────────────────┘
```

---

### 2D. Unknown Hardware Profiler Wizard Flow

**Example: User connects an unregistered Tektronix RSA500**

```
1. GUI: InstrumentRegistryPage.tsx
   → User clicks "Profile Unknown Hardware" → wizard opens

2. Step 1 - Probe:
   → fetch("POST /api/instruments/probe", {address: "192.168.2.50", port: 5025})
   → GenericSCPIDriver.connect("192.168.2.50", 5025)
     → socket.connect(("192.168.2.50", 5025))
     → query("*IDN?") → "Tektronix,RSA513B,B010001,1.0.0"
   → IDN parsed: vendor="Tektronix", class="spectrum_analyzer"
   → SCPINegotiationEngine.probe_capabilities():
     → Tries SENS:FREQ:CENT 1E9 → success
     → Tries SENS:FREQ:SPAN 1E6 → success
     → Tries SOUR:FREQ:CW 1E9 → error (not a sig gen) → skip
   → Returns {idn, vendor: "Tektronix", instrument_class: "spectrum_analyzer",
               discovered_command_map: {sa_center: "SENS:FREQ:CENT {value}", ...}}

3. Step 2 - Classify: User confirms "Spectrum Analyzer"

4. Step 3 - Map Required Commands:
   → fetch("GET /api/instruments/wizard-questions/spectrum_analyzer")
   → Returns required: [sa_center, sa_span, sa_rbw, sa_ref_level, ...]
   → GUI fields pre-filled with auto-discovered values
   → User can edit/confirm each field

5. Step 4 - Optional Commands: User fills in advanced controls

6. Step 5 - Save:
   → fetch("POST /api/instruments/", {
       name: "Tektronix RSA513B",
       driver_id: "GenericSCPIDriver",
       instrument_class: "spectrum_analyzer",
       command_map: {sa_center: "SENS:FREQ:CENT {value}", ...},
       ...
     })
   → DB INSERT → instrument saved with full command_map
   → Registry page refreshes — new device visible

7. Future use: When sending a command to this instrument:
   → GenericSCPIDriver.set_command_map(instrument.command_map, "spectrum_analyzer")
   → set_center_frequency(1E9) → looks up "sa_center" → "SENS:FREQ:CENT 1E9"
   → driver.write("SENS:FREQ:CENT 1E9")
```

---

## 3. WebSocket Telemetry Bus

All real-time data flows through the WebSocket at `ws://localhost:8787/ws`.

| Message Type         | Sender                | Receiver                       | Purpose                           |
|---------------------|-----------------------|--------------------------------|-----------------------------------|
| `telemetry_packet`  | commands.py           | TelemetrySentry, DiscoveryPanel | Shows SCPI command sent to HW    |
| `telemetry_response`| commands.py           | TelemetrySentry                | Shows hardware's reply           |
| `telemetry_heal`    | commands.py           | TelemetrySentry, DiscoveryPanel | Shows auto-corrected command     |
| `discovery_probe`   | discovery_service.py  | DiscoveryPanel                 | IP being probed                  |
| `discovery_found`   | discovery_service.py  | DiscoveryPanel                 | New instrument detected          |
| `discovery_lost`    | discovery_service.py  | DiscoveryPanel                 | Instrument went offline          |
| `status_update`     | status_poller.py      | Dashboard, SystemControlBar   | Instrument health check result   |
| `system_info`       | ai.py                 | DiscoveryPanel                 | AI agent activity log            |

---

## 4. File Responsibility Matrix

| File                                | Role                                           | Called By                          |
|-------------------------------------|------------------------------------------------|------------------------------------|
| `main.py`                           | FastAPI init, router mount, startup            | OS (startup script)                |
| `routers/commands.py`               | SCPI gateway — resolves driver, sends cmd     | GUI via HTTP POST /api/commands/   |
| `routers/instruments.py`            | Hardware registry CRUD + probe + wizard        | GUI via HTTP                       |
| `routers/ai.py`                     | AI chat, translate, agentic execute            | Intelligence HUD                   |
| `drivers/plugin_manager.py`         | Driver factory — loads & serves any driver     | commands.py, ai.py                 |
| `drivers/keysight_universal.py`     | All Keysight instruments                       | PluginManager                      |
| `drivers/rs_universal.py`           | All R&S instruments                            | PluginManager                      |
| `drivers/generic_scpi.py`           | Any unknown/custom SCPI instrument             | PluginManager, instruments.py      |
| `services/scpi_negotiation_engine.py`| Error detection + auto-healing                | commands.py, ai.py (agentic)       |
| `services/ai_copilot.py`            | Gemma-2 LLM wrapper                           | routers/ai.py, negotiation_engine  |
| `services/discovery_service.py`     | Background IP scan for new instruments        | main.py (startup thread)           |
| `services/broadcast.py`             | WebSocket message router                       | All services + routers             |
| `services/status_poller.py`         | Periodic hardware ping (is it still there?)   | main.py (startup thread)           |
| `database.py`                       | SQLite session management                      | All routers via Depends(get_db)    |
| `models/instrument.py`              | Instrument + Calibration DB schema             | database.py, routers/instruments   |
| `App.tsx`                           | React root — WS listener, router mount        | main.tsx                           |
| `IntelligenceHUD.tsx`               | AI chat + agentic + model manager UI           | App Router (/intelligence)         |
| `InstrumentRegistryPage.tsx`        | Hardware list + profiler wizard launcher       | App Router (/registry)             |
| `InstrumentProfilerWizard.tsx`      | 5-step onboarding for unknown hardware        | InstrumentRegistryPage (modal)     |
| `DiscoveryVisibilityPanel.tsx`      | Background activity monitor                    | App.tsx (global, always visible)   |
| `TelemetrySentry.tsx`               | SCPI packet log (bottom-left toast)            | App.tsx (global, always visible)   |
| `SCPIConsolePage.tsx`               | Manual SCPI terminal                           | App Router (/scpi)                 |
