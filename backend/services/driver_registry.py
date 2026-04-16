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
from typing import Dict, Optional, Type, AsyncGenerator, Any
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
        return cls._instance

    def __init__(self):
        self._drivers: Dict[int, BaseInstrumentDriver] = {}
        self._queues: Dict[int, asyncio.Queue] = {}
        self._workers: Dict[int, asyncio.Task] = {}
        self._results: Dict[str, asyncio.Future] = {}

    def get_queue(self, instrument_id: int) -> asyncio.Queue:
        if instrument_id not in self._queues:
            self._queues[instrument_id] = asyncio.Queue()
            # Start a dedicated worker for this instrument
            self._workers[instrument_id] = asyncio.create_task(self._instrument_worker(instrument_id))
        return self._queues[instrument_id]

    async def _instrument_worker(self, instrument_id: int):
        """Dedicated background worker to ensure strictly sequential 1-to-1 hardware I/O."""
        queue = self._queues[instrument_id]
        while True:
            future, func, args, kwargs = await queue.get()
            try:
                # Broadcast sync active to GUI
                await manager.broadcast({"type": "opc_sync", "active": True})
                
                # Execute the hardware command
                if asyncio.iscoroutinefunction(func):
                    res = await func(*args, **kwargs)
                else:
                    res = func(*args, **kwargs)
                future.set_result(res)
            except Exception as e:
                future.set_exception(e)
            finally:
                # Clear sync status
                await manager.broadcast({"type": "opc_sync", "active": False})
                queue.task_done()

    async def enqueue_command(self, instrument_id: int, func: Any, *args, **kwargs) -> Any:
        """Enqueues a command for the specific hardware channel and waits for completion."""
        queue = self.get_queue(instrument_id)
        future = asyncio.get_event_loop().create_future()
        await queue.put((future, func, args, kwargs))
        return await future

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
        Legacy shim for backward compatibility. 
        In the new architecture, the Queue handles sequential access.
        """
        # We still use a lock for high-level UI 'Busy' state sync if needed
        if not hasattr(self, '_locks'): self._locks = {}
        if instrument_id not in self._locks: self._locks[instrument_id] = asyncio.Lock()
        
        async with self._locks[instrument_id]:
            await manager.broadcast({
                "type": "hardware_state",
                "instrument_id": instrument_id,
                "busy": True,
                "message": "Processing..."
            })
            try:
                yield
            finally:
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
