from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from drivers.plugin_manager import PluginManager

router = APIRouter(prefix="/api/commands", tags=["Hardware Control"])

class CommandRequest(BaseModel):
    driver_name: str
    command: str
    address: str = "TCPIP::127.0.0.1::INSTR"

@router.post("/send")
async def send_command(req: CommandRequest):
    """
    Sends a raw SCPI command to a specific instrument driver.
    Enables the 'Glass Console' manual override requested to match Keysight.
    """
    try:
        driver = PluginManager.get_driver(req.driver_name)
        driver.connect(req.address)
        
        if "?" in req.command:
            response = driver.query(req.command)
            return {"status": "success", "response": response}
        else:
            driver.send_command(req.command)
            return {"status": "success", "response": "Command executed."}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'driver' in locals():
            driver.disconnect()

@router.get("/drivers")
async def list_available_drivers():
    """Lists all hot-loaded instrument drivers from the plugin engine."""
    return {"drivers": PluginManager.list_drivers()}
