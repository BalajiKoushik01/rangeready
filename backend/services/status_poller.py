import asyncio
from typing import Dict, Any, Optional
from backend.services.config_service import config_service
from backend.services.broadcast import manager
from backend.services.asset_service import asset_service
from backend.services.driver_registry import driver_registry
from backend.drivers.generic_scpi import GenericSCPIDriver

class StatusPoller:
    """
    Industry-standard polling loop for live instrument status.
    Fully synchronized with the DriverRegistry Singleton.
    """

    def __init__(self, interval_s: float = 1.5, idle_interval_s: float = 10.0):
        self.interval_s = interval_s
        self.idle_interval_s = idle_interval_s
        self.running = False
        self._task = None
        self._consecutive_errors: Dict[str, int] = {}
        self._consecutive_empty = 0

    async def start(self):
        if self.running:
            return
        self.running = True
        self._task = asyncio.create_task(self._poll_loop())
        print("Hardware Status Poller: ACTIVE (1.5s active / 10s idle backoff)")

    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _poll_loop(self):
        while self.running:
            any_configured = False
            try:
                update: Dict[str, Any] = {"type": "instrument_status", "data": {}}
                sim = config_service.is_simulation_mode()
                active_assets = asset_service.get_all_active_instruments()
                
                for asset in active_assets:
                    any_configured = True
                    # Use role as key for UI grouping (e.g. signal_generator -> siggen)
                    key = "siggen" if "generator" in asset.instrument_class else "analyzer"
                    
                    # 1. Resolve Driver from Registry (Persistent Singleton)
                    if asset.driver_id == "KeysightUniversalDriver":
                        from backend.drivers.keysight_universal import KeysightUniversalDriver
                        drv_cls = KeysightUniversalDriver
                    elif asset.driver_id == "RSUniversalDriver":
                        from backend.drivers.rs_universal import RSUniversalDriver
                        drv_cls = RSUniversalDriver
                    else:
                        drv_cls = GenericSCPIDriver

                    drv = await driver_registry.get_driver(asset.id, drv_cls, sim=sim)
                    
                    if drv:
                        # 2. Acquire Lock to prevent UI collision
                        lock = driver_registry.get_lock(asset.id)
                        # Use a shorter timeout for polling (1s) to avoid blocking UI commands for too long
                        try:
                            async with asyncio.timeout(1.0):
                                async with lock:
                                    status = self._query_role_status(asset.instrument_class, drv)
                                    if status:
                                        update["data"][key] = status
                        except (asyncio.TimeoutError, Exception) as e:
                            # If we can't get the lock in 1s, the UI is likely busy. Skipping this poll cycle.
                            pass

                if update["data"]:
                    await manager.broadcast(update)
                    self._consecutive_empty = 0
                else:
                    self._consecutive_empty += 1

                sleep_time = self._calculate_sleep_time(any_configured)

            except Exception as e:
                print(f"Status Poller Error: {e}")
                sleep_time = self.idle_interval_s

            await asyncio.sleep(sleep_time)

    def _query_role_status(self, role: str, drv) -> Optional[Dict[str, Any]]:
        """Queries the instrument for its current status block."""
        try:
            if role == "Signal Generator":
                status = drv.sg_get_complete_status()
            else:
                status = drv.sa_get_complete_status()
            self._consecutive_errors[role] = 0
            return status
        except Exception as e:
            self._handle_polling_error(role, drv, e)
            return None

    def _handle_polling_error(self, role: str, drv, error: Exception):
        """Handles a failed poll by logging and notifying registry."""
        print(f"Polling error for {role}: {error}")
        self._consecutive_errors[role] = self._consecutive_errors.get(role, 0) + 1
        # Registry handles connection cleanup in next get_driver call if drv.is_connected is False

    def _calculate_sleep_time(self, any_configured: bool) -> float:
        """Calculates adaptive sleep interval with error backoff."""
        if not any_configured:
            return self.idle_interval_s
            
        max_errors = max(self._consecutive_errors.values()) if self._consecutive_errors else 0
        error_backoff = min(max_errors * 2.0, 10.0) 
        return self.interval_s + error_backoff

status_poller = StatusPoller()
