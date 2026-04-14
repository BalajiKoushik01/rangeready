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
from backend.routers import tests, reports, templates, calibration, commands, instruments, system, ai, control
from backend.services.broadcast import manager
from backend.services.status_poller import status_poller
from backend.drivers.plugin_manager import PluginManager

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
    all_config = config_service.get_all_instruments()
    
    if all_config.get("Discovery", True):
        print("GVB Tech Discovery: Starting autonomous background scan...")
        # Run periodically to handle Ethernet plug-and-play during runtime
        app.state.discovery_task = asyncio.create_task(
            discovery_service.background_discovery_task()
        )
    
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

@app.get("/health")
async def health():
    return {
        "status": "ok", 
        "version": "1.5.0", 
        "message": "GVB Tech Intelligence Engine (Hardened V5.0) is active",
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
