"""
FILE: services/driver_registry.py
ROLE: Global Hardware Connection Singleton.
TRIGGERS: All routers and background pollers.
TARGETS: backend/drivers/
DESCRIPTION: Ensures only ONE persistent connection exists per instrument.
This is CRITICAL for ultra-low latency and preventing "Socket Refused" errors.
"""
import asyncio
import time
from typing import Dict, Optional, Type, AsyncGenerator
from contextlib import asynccontextmanager
from backend.drivers.base_driver import BaseInstrumentDriver
from backend.services.asset_service import asset_service
from backend.services.broadcast import manager

class DriverRegistry:
    """
    Thread-safe Singleton Registry for persistent hardware connections.
    Includes per-instrument locking to prevent poller/command collisions.
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DriverRegistry, cls).__new__(cls)
            cls._instance._drivers: Dict[int, BaseInstrumentDriver] = {}
            cls._instance._locks: Dict[int, asyncio.Lock] = {}
        return cls._instance

    def get_lock(self, instrument_id: int) -> asyncio.Lock:
        if instrument_id not in self._locks:
            self._locks[instrument_id] = asyncio.Lock()
        return self._locks[instrument_id]

    async def get_driver(self, instrument_id: int, driver_cls: Type[BaseInstrumentDriver], sim: bool = False) -> Optional[BaseInstrumentDriver]:
        """Returns a persistent, connected driver instance for the given instrument ID."""
        drv = self._drivers.get(instrument_id)
        
        # 1. Fetch record to get latest IP
        from backend.database import SessionLocal
        from backend.models.instrument import Instrument
        db = SessionLocal()
        asset = db.query(Instrument).filter(Instrument.id == instrument_id).first()
        db.close()
        
        if not asset:
            return None

        # 2. Check if cached driver is still valid
        if drv:
            if drv.is_connected and drv.address == asset.address:
                return drv
            else:
                try: drv.disconnect()
                except: pass
                self._drivers.pop(instrument_id, None)

        # 3. Create and connect new persistent driver
        new_drv = driver_cls(simulation=sim)
        
        # Inject personality if generic
        if hasattr(new_drv, "load_personality_from_manifest") and asset.driver_id not in ["KeysightUniversalDriver", "RSUniversalDriver"]:
             new_drv.load_personality_from_manifest(asset.driver_id)

        if new_drv.connect(asset.address):
            self._drivers[instrument_id] = new_drv
            print(f"[DriverRegistry] New Singleton Persistent Connection: {asset.vendor} at {asset.address}")
            return new_drv
            
        return None

    @asynccontextmanager
    async def lock_and_broadcast(self, instrument_id: int) -> AsyncGenerator[None, None]:
        """
        Global Mutex Guard:
        1. Waits for hardware lock with 5s timeout.
        2. Broadcasts BUSY status to UI.
        3. Executes command.
        4. Broadcasts READY status to UI.
        """
        lock = self.get_lock(instrument_id)
        
        try:
            # 1. Wait for lock with Safety Timeout (Increased to 10s for heavy trace operations)
            await asyncio.wait_for(lock.acquire(), timeout=10.0)
            
            # 2. Notify UI
            await manager.broadcast({
                "type": "hardware_state",
                "instrument_id": instrument_id,
                "busy": True,
                "message": "Background command in process. Please wait..."
            })
            
            yield
            
        except asyncio.TimeoutError:
            print(f"[DriverRegistry] CRITICAL: Command timeout on Instrument {instrument_id}")
            raise Exception("Hardware timeout: Background command took too long. Auto-unlocking UI.")
        finally:
            # 3. Release and Notify UI
            if lock.locked():
                lock.release()
                
            await manager.broadcast({
                "type": "hardware_state",
                "instrument_id": instrument_id,
                "busy": False,
                "message": "Ready"
            })

    def release_all(self):
        """Shutdown cleanup."""
        for drv in self._drivers.values():
            try: drv.disconnect()
            except: pass
        self._drivers.clear()

driver_registry = DriverRegistry()
