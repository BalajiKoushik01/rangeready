import os
import sys

# Industrial Bootstrap: Ensure the project root is in sys.path
# This allows 'import backend.xxx' to work regardless of where main.py is launched from.
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.append(root_dir)

from fastapi import FastAPI, WebSocket, Depends, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
"""
FILE: main.py
ROLE: System Entry Point & API Gateway.
TRIGGERS: User execution via 'uvicorn main:app'.
TARGETS: All routers, DiscoveryService, and StatusPoller.
DESCRIPTION: Initializes FastAPI, CORS, global services, and orchestrates the backend lifecycle.
"""
import uvicorn
import json
import asyncio
from typing import List
from backend.database import init_db, get_db
from backend.routers import tests, reports, templates, calibration, commands, instruments, system, ai, control, orchestrator
from backend.services.broadcast import manager
from backend.services.status_poller import status_poller
from backend.services.auto_debugger import auto_debugger
from backend.drivers.plugin_manager import PluginManager

# ─────────────────────────────────────────────────────────────────────────────
# INDUSTRIAL WS LOG BRIDGE
# ─────────────────────────────────────────────────────────────────────────────
import logging

class WSLogHandler(logging.Handler):
    """Pipes all internal backend logs into the WebSocket stream for GUI visibility."""
    def emit(self, record):
        try:
            msg = self.format(record)
            # Use call_soon_threadsafe because logging might happen outside the event loop
            loop = asyncio.get_event_loop_policy().get_event_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    manager.broadcast_log(record.levelname, msg, record.name), 
                    loop
                )
        except Exception:
            pass

ws_handler = WSLogHandler()
ws_handler.setFormatter(logging.Formatter('%(message)s'))
logging.getLogger("RangeReady").addHandler(ws_handler)
logging.getLogger("uvicorn.error").addHandler(ws_handler)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    State-aware lifecycle manager for the FastAPI application.
    
    Startup:
    1. Initializes the SQLite database engine and ensures all tables exist.
    2. Discovers and loads hardware driver plugins via the PluginManager.
    3. Ensures the 'models/' directory exists for offline AI GGUF files.
    
    Shutdown:
    1. Triggers cleanup for any active instrument connections or background tasks.
    """
    # Startup: Initialize the database
    print("GVB Tech Backend: Initializing V5.0 SQLite...")
    init_db()
    # 2. Discovers and loads hardware driver plugins via the PluginManager.
    PluginManager.load_plugins()
    # 3. Ensure models directory exists
    os.makedirs("./models", exist_ok=True)
    
    # 4. Starting Automated Hardware Discovery Handshake
    from backend.services.config_service import config_service
    from backend.services.discovery_service import discovery_service
    from backend.services.lxi_discovery import lxi_discovery
    all_config = config_service.get_all_instruments()
    
    # mDNS "Plug and Play" Discovery (High-Speed Industrial Sentry)
    lxi_discovery.start_mdns_listener(callback=discovery_service.handle_mdns_discovery)
    
    # INDUSTRIAL FIX: Ensure immediate discovery on boot
    discovery_enabled = all_config.get("discovery_active", True)
    if discovery_enabled:
        print("GVB Tech Discovery: Initiating immediate network handshake...")
        # Create task for continuous scanning
        app.state.discovery_task = asyncio.create_task(
            discovery_service.background_discovery_task()
        )
        # Perform initial scan synchronously (within the lifespan context) to secure IPs
        try:
            asyncio.create_task(discovery_service.scan_network())
        except Exception as e:
            print(f"Initial discovery error: {e}")
    
    # 5. Start Hardware Status Poller
    await status_poller.start()
    
    yield
    # Shutdown: Clean up connections
    await status_poller.stop()
    print("GVB Tech Backend Shutting Down...")

app = FastAPI(title="GVB Tech RF API", version="1.5.0", lifespan=lifespan)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(tests.router, prefix="/api/tests", tags=["Tests"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(templates.router, prefix="/api/templates", tags=["Templates"])
app.include_router(calibration.router, prefix="/api/calibration", tags=["Calibration"])
app.include_router(commands.router, prefix="/api/commands", tags=["Hardware Control"])
app.include_router(instruments.router, prefix="/api/instruments", tags=["Asset Registry"])
app.include_router(system.router, prefix="/api/system", tags=["System Control"])
app.include_router(ai.router, prefix="/api/ai", tags=["Offline Intelligence"])
app.include_router(control.router, prefix="/api/instrument-control", tags=["Instrument Master Control"])
app.include_router(orchestrator.router, prefix="/api/orchestrator", tags=["System Orchestrator"])

@app.get("/health")
async def health():
    diagnostics = auto_debugger.run_full_diagnostics()
    return {
        "status": "ok" if diagnostics["database"]["status"] == "healthy" else "degraded", 
        "version": "1.5.1", 
        "message": "GVB Tech Intelligence Engine (Hardened V5.1) is active",
        "diagnostics": diagnostics,
        "features": ["S-Parameters", "VSWR", "ISRO-PDF", "Live-Tracking", "AI-Anomalies", "Custom-Templates", "Asset-Registry", "Vector-Cal"]
    }

# WebSocket for real-time trace streaming
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import sys
    import os
    # Bootstrap: Ensure project root is in sys.path for absolute imports
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    port = 8787
    if "--port" in sys.argv:
        port = int(sys.argv[sys.argv.index("--port") + 1])
    uvicorn.run(app, host="127.0.0.1", port=port)
