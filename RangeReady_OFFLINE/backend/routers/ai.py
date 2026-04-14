from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional
from services.ai_copilot import ai_copilot

router = APIRouter()

class AnomalyRequest(BaseModel):
    test_name: str
    limits: Dict[str, float]
    actual_val: float
    band: str

class SCPIRequest(BaseModel):
    query: str

@router.post("/diagnose")
async def diagnose_anomaly(request: AnomalyRequest):
    """
    Diagnoses an RF measurement anomaly using the local offline AI engine.
    """
    diagnosis = ai_copilot.diagnose_trace_anomaly(
        request.test_name, 
        request.limits, 
        request.actual_val, 
        request.band
    )
    return {"diagnosis": diagnosis}

@router.post("/assistant")
async def scpi_assistant(request: SCPIRequest):
    """
    Translates natural language to SCPI commands using the local offline AI engine.
    """
    command = ai_copilot.scpi_assistant(request.query)
    return {"command": command}
