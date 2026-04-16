import asyncio
import logging
from typing import Dict, Any, Optional, List
from backend.services.config_service import config_service
from backend.services.broadcast import manager
from backend.services.asset_service import asset_service
from backend.services.driver_registry import driver_registry
from backend.drivers.generic_scpi import GenericSCPIDriver

logger = logging.getLogger("service.poller")

class StatusPoller:
    """
    Industry-standard polling loop for live instrument status.
    Fully synchronized with the DriverRegistry Singleton.
    """

    def __init__(self, interval_s: float = 1.5, idle_interval_s: float = 10.0):
        self.interval_s = interval_s
        self.idle_interval_s = idle_interval_s
        self.running = False
        self._task: Optional[asyncio.Task] = None
        self._consecutive_errors: Dict[str, int] = {}
        self._consecutive_empty = 0

    async def start(self):
        if self.running:
            return
        self.running = True
        self._task = asyncio.create_task(self._poll_loop())
        logger.info("Hardware Status Poller: ACTIVE (Adaptive Interval)")

    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                # Expected when canceling a task
                pass

    async def _poll_loop(self):
        """Main polling orchestrator."""
        while self.running:
            any_configured = False
            try:
                update: Dict[str, Any] = {"type": "instrument_status", "data": {}}
                sim = config_service.is_simulation_mode()
                active_assets = asset_service.get_all_active_instruments()
                
                for asset in active_assets:
                    any_configured = True
                    # Delegate polling to sub-method to reduce complexity
                    status = await self._poll_single_asset(asset, sim)
                    if status:
                        key = "siggen" if "generator" in asset.instrument_class.lower() else "analyzer"
                        update["data"][key] = status

                if update["data"]:
                    await manager.broadcast(update)
                    self._consecutive_empty = 0
                else:
                    self._consecutive_empty += 1

                sleep_time = self._calculate_sleep_time(any_configured)

            except asyncio.CancelledError:
                # RE-RAISE so the event loop knows this task is dying
                raise
            except Exception as e:
                logger.error(f"Status Poller Global Error: {e}")
                sleep_time = self.idle_interval_s

            await asyncio.sleep(sleep_time)

    async def _poll_single_asset(self, asset: Any, sim: bool) -> Optional[Dict[str, Any]]:
        """Handles driver resolution, locking, and querying for a single asset."""
        try:
            drv_cls = self._resolve_driver_class(asset.driver_id)
            drv = await driver_registry.get_driver(asset.id, drv_cls, sim=sim)
            
            if not drv:
                return None

            lock = driver_registry.get_lock(asset.id)
            async with asyncio.timeout(1.0):
                async with lock:
                    return self._query_role_status(asset.instrument_class, drv)
        except asyncio.TimeoutError:
            return None
        except Exception as e:
            self._handle_polling_error(asset.instrument_class, e)
            return None

    def _resolve_driver_class(self, driver_id: str) -> Any:
        """Dynamic driver class mapping."""
        if driver_id == "KeysightUniversalDriver":
            from backend.drivers.keysight_universal import KeysightUniversalDriver
            return KeysightUniversalDriver
        elif driver_id == "RSUniversalDriver":
            from backend.drivers.rs_universal import RSUniversalDriver
            return RSUniversalDriver
        return GenericSCPIDriver

    def _query_role_status(self, role: str, drv: Any) -> Optional[Dict[str, Any]]:
        """Internal worker to execute the driver-specific status queries."""
        try:
            if "generator" in role.lower():
                status = drv.sg_get_complete_status()
            else:
                status = drv.sa_get_complete_status()
                # High-Performance Binary Trace Streaming
                try:
                    trace = drv.get_trace()
                    if trace:
                        # Broadcast via ultra-fast binary WebSocket channel
                        asyncio.run_coroutine_threadsafe(
                             manager.broadcast_binary_trace(trace, instrument_id=f"SA-{drv.address.split('.')[-1]}"),
                             asyncio.get_event_loop()
                        )
                        # Remove from status to save JSON bandwidth
                        if "trace" in status: del status["trace"]
                except Exception as b_err:
                    logger.debug(f"Binary trace broadcast skipped: {b_err}")
                
            self._consecutive_errors[role] = 0
            return status
        except Exception as e:
            self._handle_polling_error(role, e)
            return None

    def _handle_polling_error(self, role: str, error: Exception):
        """Centralized error accounting for the adaptive sleep backoff."""
        logger.warning(f"Polling error for {role}: {error}")
        self._consecutive_errors[role] = self._consecutive_errors.get(role, 0) + 1

    def _calculate_sleep_time(self, any_configured: bool) -> float:
        """Adaptive sleep: backs off when errors occur, idles when no assets are active."""
        if not any_configured:
            return self.idle_interval_s
            
        max_errors = max(self._consecutive_errors.values()) if self._consecutive_errors else 0
        error_backoff = min(max_errors * 2.0, 10.0) 
        return self.interval_s + error_backoff

status_poller = StatusPoller()
