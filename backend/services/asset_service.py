"""
FILE: services/asset_service.py
ROLE: Hardware Asset & Role Orchestrator.
TRIGGERS: DiscoveryService, UI 'Activate' prompts.
TARGETS: backend/database, status_poller.py.
DESCRIPTION: Manages which discovered hardware is currently "Active" for a given role (SigGen/Analyzer).
"""
from typing import Optional, List
from backend.database import SessionLocal
from backend.models.instrument import Instrument
from backend.services.broadcast import manager
import datetime

class AssetService:
    def get_active_instrument(self, instrument_class: str) -> Optional[Instrument]:
        """Returns the currently active instrument for a specific class (e.g. signal_generator)."""
        db = SessionLocal()
        try:
            return db.query(Instrument).filter(
                Instrument.instrument_class == instrument_class.lower().replace(" ", "_"),
                Instrument.is_active == True
            ).first()
        finally:
            db.close()

    async def activate_instrument(self, instrument_id: int):
        """Official switch: Sets an instrument as active and deactivates others in its class."""
        db = SessionLocal()
        try:
            target = db.query(Instrument).filter(Instrument.id == instrument_id).first()
            if not target:
                return False
            
            # 1. Deactivate others in same class
            db.query(Instrument).filter(
                Instrument.instrument_class == target.instrument_class,
                Instrument.id != target.id
            ).update({"is_active": False})
            
            # 2. Activate target
            target.is_active = True
            target.last_seen = datetime.datetime.utcnow()
            db.commit()
            
            # 3. Broadcast system-wide state change
            await manager.broadcast({
                "type": "asset_switch",
                "data": {
                    "id": target.id,
                    "name": target.name,
                    "role": target.instrument_class,
                    "address": target.address,
                    "vendor": target.vendor
                }
            })
            print(f"[AssetService] ACTIVATED: {target.vendor} {target.model} at {target.address}")
            return True
        except Exception as e:
            print(f"[AssetService] Activation Error: {e}")
            return False
        finally:
            db.close()

    def get_all_active_instruments(self) -> List[Instrument]:
        db = SessionLocal()
        try:
            return db.query(Instrument).filter(Instrument.is_active == True).all()
        finally:
            db.close()

asset_service = AssetService()
