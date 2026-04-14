"""
FILE: routers/commands.py
ROLE: Real-time SCPI Command Gateway.
TRIGGERS: GUI [SCPI Console], [Master Controls], [Automated Sequences].
TARGETS: backend/drivers/ (via PluginManager) and WebSocket Telemetry.
DESCRIPTION: Routes strings to hardware and broadcasts traffic for live monitoring.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from backend.drivers.plugin_manager import PluginManager
from backend.drivers.generic_scpi import GenericSCPIDriver
from backend.services.config_service import config_service
from backend.services.broadcast import manager
from backend.services.scpi_negotiation_engine import SCPINegotiationEngine

router = APIRouter(prefix="/api/commands", tags=["Hardware Control"])

class CommandRequest(BaseModel):
    driver_name: str
    command: str
    address: str = "TCPIP::127.0.0.1::INSTR"
    simulation_override: Optional[bool] = None
    command_map: Optional[Dict[str, Any]] = None   # For Generic driver instances
    instrument_class: Optional[str] = "generic"   # signal_generator, spectrum_analyzer, etc.
    use_negotiation_engine: bool = True            # Set to False to bypass auto-healing

# TRACE: GUI [Transmit Directive] -> API [POST /api/commands/send] -> Driver [write/query]
# This is the primary gateway for all manual and automated SCPI traffic.
@router.post("/send", responses={404: {"description": "Driver not found"}, 500: {"description": "Hardware communication error"}})
async def send_command(req: CommandRequest):
    """
    Directly routes a SCPI command to an instrument driver.
    
    FLOW:
    1. Resolve driver and simulation state.
    2. Establish connection to instrumentation address.
    3. Broadcast 'sent' packet to Telemetry bus for GUI display.
    4. Execute write() or query() on the hardware via the Driver logic.
    5. If query, broadcast the 'response' packet to the Telemetry bus.
    6. Check hardware SYST:ERR? buffer for post-execution sanity.
    """
    try:
        sim = req.simulation_override if req.simulation_override is not None else config_service.is_simulation_mode()

        # Step 1: Resolve the driver from the plugin registry
        driver = PluginManager.get_driver(req.driver_name, simulation=sim)

        # Step 2: If this is a Generic driver, load the instrument's custom command_map
        if isinstance(driver, GenericSCPIDriver) and req.command_map:
            driver.set_command_map(req.command_map, req.instrument_class or "generic")

        # Step 3: Establish hardware connection
        if not driver.connect(req.address):
            return {"status": "error", "response": f"Connection failed to {req.address}"}

        # Step 4: Broadcast 'SENT' packet to telemetry before execution
        await manager.broadcast({
            "type": "telemetry_packet",
            "packet": req.command,
            "address": req.address,
            "timestamp": True
        })

        # Step 5: Execute through Negotiation Engine (auto-heals errors)
        if req.use_negotiation_engine:
            engine = SCPINegotiationEngine(driver)
            engine_result = engine.send(req.command)

            # Broadcast any healing actions as telemetry events
            for action in engine_result.get("heal_actions", []):
                await manager.broadcast({
                    "type": "telemetry_heal",
                    "packet": action,
                    "address": req.address,
                    "timestamp": True
                })

            # Broadcast hardware response if any
            if engine_result.get("response"):
                await manager.broadcast({
                    "type": "telemetry_response",
                    "packet": engine_result["response"],
                    "address": req.address,
                    "timestamp": True
                })

            return {
                "status": engine_result["status"],
                "response": engine_result.get("response", "Executed"),
                "errors": engine_result.get("errors", []),
                "heal_actions": engine_result.get("heal_actions", []),
                "command_sent": engine_result.get("command_sent", req.command),
                "diagnosis": engine_result.get("diagnosis"),
                "idn": driver.idn,
            }
        else:
            # Bypass engine — raw execution
            if "?" in req.command:
                response = driver.query(req.command)
                await manager.broadcast({"type": "telemetry_response", "packet": response, "address": req.address, "timestamp": True})
                return {"status": "success", "response": response, "idn": driver.idn}
            else:
                driver.send_command(req.command)
                return {"status": "success", "response": "Executed", "idn": driver.idn}

    except ValueError as e:
        # Unknown driver name
        raise HTTPException(status_code=404, detail=str(e))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'driver' in locals():
            driver.disconnect()

@router.get("/drivers")
async def list_available_drivers():
    """Returns registry of hot-loaded drivers."""
    return {"drivers": PluginManager.list_drivers()}
