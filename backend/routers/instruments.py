"""
FILE: routers/instruments.py
ROLE: Hardware Registry API (CRUD).
TRIGGERS: GUI [InstrumentRegistryPage].
TARGETS: backend/database.py and backend/models/instrument.py.
DESCRIPTION: Manages the registration, updating, and deletion of hardware assets in the persistent database.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
from ..database import get_db
from ..models.instrument import Instrument
from backend.drivers.plugin_manager import PluginManager
from backend.drivers.generic_scpi import GenericSCPIDriver, CAPABILITY_PROFILES
from backend.services.scpi_negotiation_engine import SCPINegotiationEngine
from typing import List, Annotated
from pydantic import BaseModel
import datetime
from ..drivers.manifest_loader import ManifestLoader

# ─────────────────────────── CONSTANTS ─────────────────────────────────────────

VENDOR_MAP = {
    "KEYSIGHT": "Keysight",  "AGILENT": "Keysight",  "HEWLETT": "Keysight",
    "ROHDE": "R&S",          "SCHWARZ": "R&S",
    "TEKTRONIX": "Tektronix", "SIGLENT": "Siglent",
    "RIGOL": "Rigol",        "ANRITSU": "Anritsu",
    "FLUKE": "Fluke",        "NI ": "National Instruments",
}

MODEL_FAMILIES = {
    "signal_generator": ["N517", "N518", "E826", "SMW", "SMB", "SMBV", "SMM"],
    "spectrum_analyzer": ["N902", "N903", "N904", "N900", "FSW", "FSV", "FPS"],
    "vector_network_analyzer": ["N522", "N524", "E506", "E508", "ZNB", "ZNA"],
    "oscilloscope": ["DSOX", "MSOS", "RTO", "RTB", "RTE"],
    "power_supply": ["N670", "N575", "N577", "E363", "NGL"]
}

# ─────────────────────────── ROUTER & SCHEMAS ────────────────────────────────
router = APIRouter(prefix="/api/instruments", tags=["Hardware Registry"])

class InstrumentBase(BaseModel):
    """Base schema for an RF instrument asset."""
    model_config = {'protected_namespaces': ()}
    
    name: str
    model: str
    serial_number: str
    connection_type: str
    address: str
    driver_id: str
    instrument_class: Optional[str] = "generic"
    vendor: Optional[str] = "Unknown"
    command_map: Optional[Dict[str, Any]] = {}
    capabilities: Optional[Dict[str, Any]] = {}

class InstrumentCreate(InstrumentBase):
    pass

class ProbeRequest(BaseModel):
    """Request schema for on-demand hardware probing."""
    address: str
    port: Optional[int] = 5025

class ProbeResponse(BaseModel):
    """Enriched response for hardware identification."""
    idn: str
    vendor: str
    instrument_class: str
    suggested_driver: str
    protocol: str
    discovered_command_map: Dict[str, Any]
    heal_cache: Dict[str, str]

class InstrumentSchema(InstrumentBase):
    id: int
    is_active: bool
    created_at: datetime.datetime
    last_seen: datetime.datetime
    model_config = {'from_attributes': True}

# ─────────────────────────── ENDPOINTS ───────────────────────────────────────

@router.get("/", response_model=List[InstrumentSchema])
def get_instruments(db: Annotated[Session, Depends(get_db)]):
    return db.query(Instrument).all()

@router.post("/", response_model=InstrumentSchema)
def create_instrument(instrument: InstrumentCreate, db: Annotated[Session, Depends(get_db)]):
    db_instrument = Instrument(**instrument.dict())
    db.add(db_instrument)
    db.commit()
    db.refresh(db_instrument)
    return db_instrument

@router.delete("/{instrument_id}", responses={404: {"description": "Instrument not found"}})
def delete_instrument(instrument_id: int, db: Annotated[Session, Depends(get_db)]):
    db_instrument = db.query(Instrument).filter(Instrument.id == instrument_id).first()
    if not db_instrument:
        raise HTTPException(status_code=404, detail="Instrument not found")
    db.delete(db_instrument)
    db.commit()
    return {"status": "success"}

@router.put("/{instrument_id}", response_model=InstrumentSchema, responses={404: {"description": "Instrument not found"}})
def update_instrument(instrument_id: int, instrument: InstrumentCreate, db: Annotated[Session, Depends(get_db)]):
    db_instrument = db.query(Instrument).filter(Instrument.id == instrument_id).first()
    if not db_instrument:
        raise HTTPException(status_code=404, detail="Instrument not found")
    
    for key, value in instrument.dict().items():
        setattr(db_instrument, key, value)
    
    db_instrument.last_seen = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(db_instrument)
    return db_instrument

@router.post("/activate/{instrument_id}")
async def activate_instrument(instrument_id: int):
    """Officially switch the active hardware for a role."""
    from backend.services.asset_service import asset_service
    success = await asset_service.activate_instrument(instrument_id)
    if not success:
        raise HTTPException(status_code=404, detail="Instrument not found")
    return {"status": "ok", "message": f"Instrument {instrument_id} is now active"}

@router.get("/{instrument_id}/commands", responses={404: {"description": "Instrument or Manifest not found"}})
def get_instrument_commands(instrument_id: int, db: Annotated[Session, Depends(get_db)]):
    db_instrument = db.query(Instrument).filter(Instrument.id == instrument_id).first()
    if not db_instrument:
        raise HTTPException(status_code=404, detail="Instrument not found")
    
    try:
        manifest = ManifestLoader.get_manifest(db_instrument.driver_id)
        return {"driver_id": manifest.id, "commands": manifest.commands}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/probe", response_model=ProbeResponse, responses={503: {"description": "Cannot connect to instrument"}})
def probe_instrument(req: ProbeRequest):
    """
    Intelligently probes a discovered IP across multiple ports and protocols.
    Returns identification metadata and a discovered command map.
    """
    from backend.services.discovery_service import discovery_service
    
    # Try multiple ports for discovery if 5025 fails
    ports_to_try = [req.port] + [p for p in discovery_service.PROBE_PORTS if p != req.port]
    
    driver = GenericSCPIDriver(simulation=False)
    connected_port = None
    
    for p in ports_to_try:
        if driver.connect(req.address, p):
            connected_port = p
            break
            
    if not connected_port:
        raise HTTPException(status_code=503, detail=f"Cannot connect to {req.address} on standard SCPI ports.")

    idn = driver.idn
    idn_upper = idn.upper()
    vendor = "Unknown"
    suggested_driver = "GenericSCPIDriver"
    instrument_class = "generic"

    for pattern, name in VENDOR_MAP.items():
        if pattern in idn_upper:
            vendor = name
            if name == "Keysight": suggested_driver = "KeysightUniversalDriver"
            elif name == "R&S": suggested_driver = "RSUniversalDriver"
            break

    for cls_name, models in MODEL_FAMILIES.items():
        if any(m in idn_upper for m in models):
            instrument_class = cls_name
            break

    engine = SCPINegotiationEngine(driver)
    driver.instrument_class = instrument_class
    discovered_commands = engine.probe_capabilities()
    driver.disconnect()

    return {
        "idn": idn,
        "vendor": vendor,
        "instrument_class": instrument_class,
        "suggested_driver": suggested_driver,
        "protocol": "LXI/Socket" if connected_port != 111 else "VXI-11",
        "discovered_command_map": discovered_commands,
        "heal_cache": engine.get_heal_cache(),
    }

@router.get("/wizard-questions/{instrument_class}")
def get_wizard_questions(instrument_class: str):
    profile = CAPABILITY_PROFILES.get(instrument_class, CAPABILITY_PROFILES["generic"])
    return {
        "instrument_class": instrument_class,
        "required_mappings": profile.get("required", []),
        "optional_mappings": profile.get("optional", []),
        "all_defaults": {k: v for k, v in __import__(
            'backend.drivers.generic_scpi', fromlist=['IEEE488_DEFAULTS']
        ).IEEE488_DEFAULTS.items()},
    }

@router.get("/available-drivers")
def list_available_drivers():
    """
    Returns all currently loaded driver names from the plugin registry.
    TRACE: GUI [Add Instrument Modal] -> GET /api/instruments/available-drivers
    """
    return {"drivers": PluginManager.list_drivers()}

