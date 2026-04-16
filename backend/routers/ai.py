"""
FILE: routers/ai.py
ROLE: Offline AI API Gateway.
TRIGGERS: GUI [Intelligence HUD] — chat, SCPI translation, anomaly diagnosis, agentic execution.
TARGETS: backend/services/ai_copilot.py (all inference), backend/drivers/ (agentic execution).

ENDPOINT MAP:
  GET  /api/ai/status              → Model load status, download progress
  POST /api/ai/download            → Triggers Gemma-2 model download with progress
  POST /api/ai/translate           → Natural language → SCPI command (no hardware)
  POST /api/ai/diagnose            → Test failure → engineering hypothesis
  POST /api/ai/chat                → General conversational RF assistant
  POST /api/ai/agentic-execute     → Natural language → Generate SCPI → Execute on hardware
  GET  /api/ai/download-progress   → Server-Sent Events for real-time download progress

DATA FLOW (agentic-execute):
  GUI [Chat Input] → POST /api/ai/agentic-execute {query, driver_name, address}
    → ai_copilot.agentic_execute(query, idn)
    → SCPINegotiationEngine.send(scpi_cmd)
    → driver.write(scpi_cmd) → Hardware
    → broadcast(telemetry_packet) → GUI telemetry sentry
    → return {translated_command, command_sent, response, heal_actions}
"""

import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from ..services.ai_copilot import ai_copilot
from ..services.broadcast import manager
from ..services.config_service import config_service
from ..drivers.plugin_manager import PluginManager

router = APIRouter(tags=["AI Intelligence"])


# ─────────────────────────────────────────────────────────────────────────────
# REQUEST/RESPONSE SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class TranslateRequest(BaseModel):
    """
    Translate natural language to a SCPI command.
    TRACE: IntelligenceHUD.tsx [Send button] → POST /api/ai/translate
    """
    query: str

class DiagnoseRequest(BaseModel):
    """
    Diagnose a test measurement anomaly.
    TRACE: TestRunnerPage [Anomaly flag] → POST /api/ai/diagnose
    """
    test_name: str
    limits: Dict[str, float]
    actual_val: float
    band: str

class ChatRequest(BaseModel):
    """
    General conversational chat with conversation history context.
    TRACE: IntelligenceHUD.tsx → POST /api/ai/chat
    """
    message: str
    history: Optional[List[Dict[str, str]]] = []  # [{role, content}, ...]

class AgenticRequest(BaseModel):
    """
    Full agentic execution: translate natural language AND execute on hardware.
    TRACE: IntelligenceHUD.tsx [Agentic Mode ON] → POST /api/ai/agentic-execute
    """
    query: str
    driver_name: str          # e.g. "KeysightUniversalDriver", "GenericSCPIDriver"
    address: str              # e.g. "TCPIP::192.168.1.100::5025::SOCKET"
    simulation: bool = False
    command_map: Optional[Dict[str, Any]] = None  # For GenericSCPIDriver


# ─────────────────────────────────────────────────────────────────────────────
# STATUS & DOWNLOAD ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/status")
def get_ai_status():
    """
    Returns AI engine state: model loaded, download progress, capabilities.

    TRACE: IntelligenceHUD.tsx [useEffect poll] → GET /api/ai/status
    
    RESPONSE includes:
      model_loaded:    True if Gemma-2 is in memory and ready
      model_found_on_disk: True if the .gguf file exists on disk
      download:        {status, percent, downloaded_mb, total_mb, speed_mbps}
      capabilities:    list of available AI features
    """
    return ai_copilot.get_status()


@router.post("/download")
async def trigger_download():
    """
    Starts downloading the Gemma-2-2B model from Hugging Face in a background thread.
    Poll GET /api/ai/status for download progress.

    TRACE: IntelligenceHUD.tsx [Download Model button] → POST /api/ai/download
    
    The download process:
      1. Checks huggingface_hub / requests available (installs if not)
      2. Downloads gemma-2-2b-it-Q4_K_M.gguf (~1.6 GB) with chunked HTTP
      3. Saves to backend/models/ directory
      4. Auto-initializes the LLM engine when complete
    """
    status = ai_copilot.get_status()
    if status["model_loaded"]:
        return {"status": "already_loaded", "message": "Model is already loaded and ready."}
    if status["download"]["status"] == "downloading":
        return {"status": "already_downloading", "message": "Download already in progress."}

    return {
        "status": "deprecated",
        "message": f"Ollama engine requires pulling the model natively: run `ollama pull {status.get('model_name', 'gemma2:2b')}`.",
    }


@router.get("/download-progress", responses={
    200: {"description": "SSE stream started"},
    503: {"description": "AI Copilot service not available"}
})
async def download_progress_sse():
    """
    Server-Sent Events stream for real-time download progress.
    The frontend Intelligence HUD subscribes to this during download.

    TRACE: IntelligenceHUD.tsx [EventSource] → GET /api/ai/download-progress
    """
    async def event_generator():
        while True:
            progress = ai_copilot.download_progress
            yield f"data: {progress}\n\n"
            if progress["status"] in ("complete", "error", "idle"):
                break
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ─────────────────────────────────────────────────────────────────────────────
# AI INTELLIGENCE ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/translate", responses={500: {"description": "Internal AI inference error"}})
async def translate_to_scpi(req: TranslateRequest):
    """
    Translates a natural language instruction to a SCPI command.
    Does NOT execute anything — just returns the command string.

    TRACE: IntelligenceHUD.tsx [Standard Mode] → POST /api/ai/translate
    
    Example:
      Input:  "Set the signal generator to 2.4 GHz at -10 dBm"
      Output: {"command": "SOUR:FREQ:CW 2.4E9;SOUR:POW:LEV:IMM:AMPL -10"}
    """
    try:
        command = ai_copilot.translate_to_scpi(req.query)
        return {"command": command, "model_available": ai_copilot.is_available()}
    except Exception:
        raise HTTPException(status_code=500, detail="AI processing error")


@router.post("/diagnose", responses={500: {"description": "Internal AI inference error"}})
async def diagnose_anomaly(req: DiagnoseRequest):
    """
    Generates an RF engineering hypothesis for a test measurement failure.

    TRACE: TestRunnerPage [on test fail] → POST /api/ai/diagnose
    
    Example response:
      "The gain reduction of 3 dB in L-band could be caused by thermal drift
       in the PA stage, as gain typically drops 0.5-1 dB/°C above 50°C..."
    """
    try:
        diagnosis = ai_copilot.diagnose_anomaly(
            req.test_name, req.limits, req.actual_val, req.band
        )
        return {"diagnosis": diagnosis, "model_available": ai_copilot.is_available()}
    except Exception:
        raise HTTPException(status_code=500, detail="AI processing error")


@router.post("/chat", responses={500: {"description": "Internal AI inference error"}})
async def chat(req: ChatRequest):
    """
    General-purpose RF domain chat.
    Maintains conversation context via the history list.

    TRACE: IntelligenceHUD.tsx [Chat Input] → POST /api/ai/chat
    
    Supports questions like:
      - "What is VSWR and how does it affect gain?"
      - "Explain the difference between RBW and VBW on a spectrum analyzer"
      - "How do I set up a 2-port SOLT calibration?"
    """
    try:
        response = ai_copilot.chat(req.message, req.history)
        return {
            "response": response,
            "model_available": ai_copilot.is_available(),
        }
    except Exception:
        raise HTTPException(status_code=500, detail="AI processing error")


@router.post("/agentic-execute", responses={500: {"description": "Agentic execution error"}})
async def agentic_execute(req: AgenticRequest):
    """
    AGENTIC MODE: Translates natural language to SCPI AND executes it on hardware.
    This is the core of the "AI Controls Your Hardware" feature.

    FULL DATA FLOW:
      1. Resolve driver from PluginManager
      2. Connect to hardware at req.address
      3. Query *IDN? for instrument context
      4. ai_copilot.agentic_execute(query, idn, driver)
           → translate_to_scpi(query + idn context)
           → SCPINegotiationEngine.send(command)
           → driver.write(command)
           → engine checks SYST:ERR? and auto-heals if needed
      5. Broadcast all SENT/HEALED/RECEIVED packets to WebSocket telemetry
      6. Return full execution report to GUI

    TRACE:
      IntelligenceHUD.tsx [Agentic Mode ON + Send]
      → POST /api/ai/agentic-execute
      → PluginManager → Driver → Hardware
      → broadcast() → TelemetrySentry + DiscoveryVisibilityPanel
    """
    try:
        sim = req.simulation
        driver = PluginManager.get_driver(req.driver_name, simulation=sim)

        # Load custom command map for Generic drivers
        from ..drivers.generic_scpi import GenericSCPIDriver
        if isinstance(driver, GenericSCPIDriver) and req.command_map:
            driver.set_command_map(req.command_map, "generic")

        if not driver.connect(req.address):
            raise HTTPException(
                status_code=503, 
                detail=f"Cannot connect to {req.address}",
                headers={"X-Error": "Hardware-Unavailable"}
            )

        idn = driver.idn 

        await manager.broadcast({
            "type": "system_info",
            "message": f"[AI Agent] '{req.query}' → translating for {idn}",
        })

        # Execute agentically (Now async-aware if needed, though most drivers are sync)
        # Note: ai_copilot.agentic_execute calls engine.send, which is now async
        result = await ai_copilot.agentic_execute(req.query, idn, driver)

        # Broadcast results
        if result.get("command_sent"):
            await manager.broadcast({
                "type": "telemetry_packet",
                "packet": f"[AI→HW] {result['command_sent']}",
                "address": req.address,
                "timestamp": True,
            })

        for action in result.get("heal_actions", []):
            await manager.broadcast({
                "type": "telemetry_heal",
                "packet": action,
                "address": req.address,
                "timestamp": True,
            })

        driver.disconnect()
        result["idn"] = idn
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# XAI APPROVAL ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

class HealResponse(BaseModel):
    approved: bool

@router.post("/confirm-heal/{proposal_id}")
async def confirm_heal(proposal_id: str, resp: HealResponse):
    """
    Accepts or rejects an AI-proposed hardware fix.
    Resolves the pending future in the SCPINegotiationEngine.
    """
    from ..services.scpi_negotiation_engine import PENDING_APPROVALS
    
    if proposal_id not in PENDING_APPROVALS:
        raise HTTPException(status_code=404, detail="Proposal not found or expired")
    
    future = PENDING_APPROVALS.pop(proposal_id)
    if not future.done():
        future.set_result({"approved": resp.approved})
        
    return {"status": "success", "approved": resp.approved}


# Legacy compatibility endpoints (keep these so old GUI code doesn't break)
@router.post("/assistant")
async def scpi_assistant_legacy(req: TranslateRequest):
    """Legacy endpoint — redirects to /translate. Kept for backward compatibility."""
    command = ai_copilot.translate_to_scpi(req.query)
    return {"command": command}


@router.post("/scpi")
async def scpi_via_get(query: str = ""):
    """Legacy GET-style endpoint compatibility."""
    command = ai_copilot.translate_to_scpi(query)
    return {"command": command}
