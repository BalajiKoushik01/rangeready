"""
FILE: routers/system.py
ROLE: Global System Configuration API.
TRIGGERS: GUI [SettingsPage], [InstrumentRegistryPage] Discovery Toggle.
TARGETS: backend/services/config_service.py and backend/services/discovery_service.py.
DESCRIPTION: Manages application-wide states like auto-discovery, blacklists, and simulation mode.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db, engine
from ..models.test_session import TestSession, TestStep, TestTemplate, TemplateStep, LimitMask
from ..models.instrument import Instrument, InstrumentCalibration
from typing import Annotated
import os
import shutil
from pydantic import BaseModel
from ..services.config_service import config_service
from ..drivers.plugin_manager import PluginManager
from ..services.discovery_service import discovery_service
import asyncio

class ConfigUpdate(BaseModel):
    role: str
    ip: str

class DiscoverySettings(BaseModel):
    active: bool = None
    stop_after_one: bool = None

class BlacklistUpdate(BaseModel):
    ip: str

router = APIRouter(prefix="/api/system", tags=["System Configuration"])

@router.post("/reset", responses={500: {"description": "System reset failed"}})
def reset_system(db: Annotated[Session, Depends(get_db)]):
    """
    Absolute System Purge (V5.0).
    Requested by user to 'delete anything and everything'.
    Wipes DB and purges report artifacts.
    """
    try:
        # 1. Purge all measurement tables
        db.query(LimitMask).delete()
        db.query(TemplateStep).delete()
        db.query(TestTemplate).delete()
        db.query(TestStep).delete()
        db.query(TestSession).delete()
        db.query(InstrumentCalibration).delete()
        db.query(Instrument).delete()
        
        db.commit()
        
        # 2. Cleanup report directory
        reports_dir = "reports"
        if os.path.exists(reports_dir):
            shutil.rmtree(reports_dir)
            os.makedirs(reports_dir)
            
        return {"status": "success", "message": "GVB Tech Absolute Reset Complete. System Cleaned."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
def get_config():
    """Returns the current instrument configurations."""
    return config_service.get_all_instruments()

@router.post("/config")
def update_config(update: ConfigUpdate):
    """Updates the IP address for a specific instrument role."""
    config_service.set_instrument_ip(update.role, update.ip)
    return {"status": "success", "config": config_service.get_all_instruments()}

@router.post("/test_connection", responses={400: {"description": "Instrument unreachable"}})
def test_connection(update: ConfigUpdate):
    # Select a generic driver for connection ping
    driver = PluginManager.get_driver("KeysightUniversalDriver", simulation=config_service.is_simulation_mode())
    if driver.connect(update.ip):
        idn = driver.query("*IDN?")
        driver.disconnect()
        return {"status": "success", "idn": idn}
    else:
        raise HTTPException(status_code=400, detail="Could not reach instrument at this IP.")

@router.post("/discover")
async def trigger_discovery():
    """Triggers an asynchronous subnet scan and identification."""
    asyncio.create_task(discovery_service.scan_network())
    return {"status": "scanning", "message": "Discovery sequence initiated."}

@router.get("/status")
def get_status():
    """Returns general system status for legacy dashboard components."""
    return {
        "status": "online",
        "branding": "GVB Tech",
        "engine": "V5.1 Industrial",
        "simulation": config_service.is_simulation_mode(),
        "discovery_active": config_service._config.get("discovery_active", True)
    }

@router.post("/discovery/settings")
def update_discovery_settings(settings: DiscoverySettings):
    """Updates global discovery behavioral settings."""
    if settings.active is not None:
        config_service.set_discovery_status(settings.active)
    if settings.stop_after_one is not None:
        config_service.set_discovery_mode(settings.stop_after_one)
    return {"status": "success", "config": config_service.get_all_instruments()}

@router.get("/blacklist")
def get_blacklist():
    """Returns the current list of ignored/blacklisted IPs."""
    return {"blacklist": config_service.get_blacklist()}

@router.post("/blacklist")
def add_to_blacklist(update: BlacklistUpdate):
    """Adds an IP to the ignore list to prevent future scanning."""
    config_service.add_to_blacklist(update.ip)
    return {"status": "success", "blacklist": config_service.get_blacklist()}
