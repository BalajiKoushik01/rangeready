from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.test_session import CalibrationRecord
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Dict, Any, Optional, Annotated

router = APIRouter(prefix="/api/calibration", tags=["Calibration"])

class CalibrationCreate(BaseModel):
    cal_type: str = "OSL"
    coefficients: Dict[str, Any]
    temperature_c: Optional[float] = None

@router.post("/")
async def save_calibration(cal: CalibrationCreate, db: Annotated[Session, Depends(get_db)]):
    """
    Stores a new calibration record. In a real system, this would be 
    interfaced with the Agilent/Keysight calibration engine.
    """
    db_cal = CalibrationRecord(
        cal_type=cal.cal_type,
        coefficients=cal.coefficients,
        temperature_c=cal.temperature_c,
        is_valid=True
    )
    db.add(db_cal)
    db.commit()
    db.refresh(db_cal)
    return db_cal

@router.get("/status")
async def get_current_calibration(db: Annotated[Session, Depends(get_db)]):
    """
    Retrieves the most recent valid calibration.
    """
    cal = db.query(CalibrationRecord).filter(CalibrationRecord.is_valid == True).order_by(CalibrationRecord.timestamp.desc()).first()
    if not cal:
        return {"status": "uncalibrated", "message": "Calibration required for ISRO-Standard measurements."}
    
    # Check if calibration is older than 24 hours (Standard RF rule of thumb)
    age = datetime.now(timezone.utc) - cal.timestamp.replace(tzinfo=timezone.utc)
    if age.total_seconds() > 86400:
        return {"status": "expired", "last_cal": cal.timestamp, "message": "Calibration expired. Recalibration recommended."}
        
    return {"status": "valid", "last_cal": cal.timestamp, "cal_id": cal.id}

@router.post("/invalidate/{cal_id}", responses={404: {"description": "Calibration record not found"}})
async def invalidate_calibration(cal_id: int, db: Annotated[Session, Depends(get_db)]):
    cal = db.query(CalibrationRecord).filter(CalibrationRecord.id == cal_id).first()
    if not cal:
        raise HTTPException(status_code=404, detail="Calibration record not found")
    cal.is_valid = False
    db.commit()
    return {"status": "invalidated"}
