from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, engine
from models.test_session import TestSession, TestStep, TestTemplate, TemplateStep, LimitMask
from models.instrument import Instrument, InstrumentCalibration
from typing import Annotated
import os
import shutil
from pydantic import BaseModel
from services.config_service import config_service
from services.discovery_service import discovery_service
from services.visa_service import visa_service
import asyncio

class ConfigUpdate(BaseModel):
    role: str
    ip: str

router = APIRouter()

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

@router.post("/test_connection")
def test_connection(update: ConfigUpdate):
    """Tests the connection to an instrument by IP and role."""
    if visa_service.connect(update.ip):
        idn = visa_service.identify(update.ip)
        visa_service.disconnect(update.ip)
        if idn:
            return {"status": "success", "idn": idn}
    raise HTTPException(status_code=400, detail="Handshake failed or instrument unresponsive.")

@router.post("/discover")
async def trigger_discovery():
    """Triggers an asynchronous subnet scan and identification."""
    # Run scanning in the background to not block HTTP request immediately
    # The scan broadcasts its results via web sockets
    asyncio.create_task(discovery_service.scan_network())
    return {"status": "scanning", "message": "Discovery sequence initiated."}

