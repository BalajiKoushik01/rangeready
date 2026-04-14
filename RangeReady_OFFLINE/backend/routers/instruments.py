from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.instrument import Instrument
from typing import List, Annotated
from pydantic import BaseModel
import datetime
from drivers.manifest_loader import ManifestLoader

router = APIRouter()

class InstrumentBase(BaseModel):
    """Base schema for an RF instrument asset."""
    model_config = {'protected_namespaces': ()}
    
    name: str
    model: str
    serial_number: str
    connection_type: str
    address: str
    driver_id: str

class InstrumentCreate(InstrumentBase):
    """Schema for registering a new instrument."""
    pass

class InstrumentSchema(InstrumentBase):
    """Complete instrument schema including database-managed fields."""
    id: int
    is_active: bool
    created_at: datetime.datetime
    last_seen: datetime.datetime

    model_config = {'from_attributes': True}

@router.get("/", response_model=List[InstrumentSchema])
def get_instruments(db: Annotated[Session, Depends(get_db)]):
    """
    Retrieves all hardware assets currently registered in the system.
    
    Returns:
        List of registered Instrument objects.
    """
    return db.query(Instrument).all()

@router.post("/", response_model=InstrumentSchema)
def create_instrument(instrument: InstrumentCreate, db: Annotated[Session, Depends(get_db)]):
    """
    Registers a new hardware asset (VNA, SA, etc.) in the database.
    
    Args:
        instrument: Data containing connection parameters and identification.
    """
    db_instrument = Instrument(**instrument.dict())
    db.add(db_instrument)
    db.commit()
    db.refresh(db_instrument)
    return db_instrument

@router.delete("/{instrument_id}", responses={404: {"description": "Instrument not found"}})
def delete_instrument(instrument_id: int, db: Annotated[Session, Depends(get_db)]):
    """
    Purges a hardware asset from the registry.
    
    Args:
        instrument_id: Primary key of the instrument to remove.
    """
    db_instrument = db.query(Instrument).filter(Instrument.id == instrument_id).first()
    if not db_instrument:
        raise HTTPException(status_code=404, detail="Instrument not found")
    db.delete(db_instrument)
    db.commit()
    return {"status": "success", "message": f"Instrument {instrument_id} purged"}

@router.get("/{instrument_id}/commands", responses={404: {"description": "Instrument or Manifest not found"}})
def get_instrument_commands(instrument_id: int, db: Annotated[Session, Depends(get_db)]):
    """
    Fetches the operational manifest for a specific instrument.
    
    This manifests contains the SCPI command schemas used by the UI to 
    dynamically render remote control inputs.
    
    Args:
        instrument_id: Database ID of the target instrument.
    """
    db_instrument = db.query(Instrument).filter(Instrument.id == instrument_id).first()
    if not db_instrument:
        raise HTTPException(status_code=404, detail="Instrument not found")
    
    try:
        manifest = ManifestLoader.get_manifest(db_instrument.driver_id)
        return {"driver_id": manifest.id, "commands": manifest.commands}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
