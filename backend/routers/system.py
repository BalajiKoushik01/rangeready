from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, engine
from models.test_session import TestSession, TestStep, TestTemplate, TemplateStep, LimitMask
from models.instrument import Instrument, InstrumentCalibration
from typing import Annotated
import os
import shutil

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

@router.get("/status")
def get_system_status():
    """Diagnostic check for the core measurement matrix."""
    return {
        "engine": "active",
        "protocol": "ISRO-PHASE-3",
        "precision": "vector",
        "branding": "official-liquid-glass"
    }
