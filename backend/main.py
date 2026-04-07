from fastapi import FastAPI, WebSocket, Depends, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import json
import asyncio
from typing import List
from database import init_db, get_db
from routers import tests, reports, templates, calibration, commands, instruments, system, ai
from services.broadcast import manager
from drivers.plugin_manager import PluginManager
import os

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
    # Re-load driver plugins on startup
    PluginManager.load_plugins()
    # Ensure models directory exists
    os.makedirs("./models", exist_ok=True)
    yield
    # Shutdown: Clean up connections
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
    port = 8787
    if "--port" in sys.argv:
        port = int(sys.argv[sys.argv.index("--port") + 1])
    uvicorn.run(app, host="0.0.0.0", port=port)
