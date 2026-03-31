from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.instrument import Instrument
from typing import List, Annotated
import datetime

router = APIRouter()

class InstrumentBase(BaseModel):
    name: str
    model: str
    serial_number: str
    connection_type: str
    address: str
    driver_id: str

class InstrumentCreate(InstrumentBase):
    pass

class InstrumentSchema(InstrumentBase):
    id: int
    is_active: bool
    created_at: datetime.datetime
    last_seen: datetime.datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[InstrumentSchema])
def get_instruments(db: Annotated[Session, Depends(get_db)]):
    """Fetch all registered RF assets."""
    return db.query(Instrument).all()

@router.post("/", response_model=InstrumentSchema)
def create_instrument(instrument: InstrumentCreate, db: Annotated[Session, Depends(get_db)]):
    """Register a new hardware asset (V5.0)."""
    db_instrument = Instrument(**instrument.dict())
    db.add(db_instrument)
    db.commit()
    db.refresh(db_instrument)
    return db_instrument

@router.delete("/{instrument_id}", responses={404: {"description": "Instrument not found"}})
def delete_instrument(instrument_id: int, db: Annotated[Session, Depends(get_db)]):
    """Remove a hardware asset from the registry."""
    db_instrument = db.query(Instrument).filter(Instrument.id == instrument_id).first()
    if not db_instrument:
        raise HTTPException(status_code=404, detail="Instrument not found")
    db.delete(db_instrument)
    db.commit()
    return {"status": "success", "message": f"Instrument {instrument_id} purged"}
