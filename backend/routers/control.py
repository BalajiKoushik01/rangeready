"""
Comprehensive Instrument Control Router
Supports: Keysight (all families) + Rohde & Schwarz (all families)
Communication: Raw Socket (Port 5025) with VXI-11 fallback
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Tuple, Literal, Dict, Any
from ..drivers.keysight_universal import KeysightUniversalDriver
from ..drivers.rs_universal import RSUniversalDriver
from ..drivers.generic_scpi import GenericSCPIDriver
from backend.services.config_service import config_service
from backend.services.asset_service import asset_service
from backend.services.driver_registry import driver_registry

router = APIRouter(tags=["Master Instrument Control"])

SIGGEN = "Signal Generator"
ANALYZER = "Spectrum Analyzer"
VNA = "VNA"

@router.post("/siggen/control")
async def siggen_control(req: Dict[str, Any], manufacturer: Optional[str] = None):
    driver = resolve_driver("Signal Generator", manufacturer)
    if not driver:
        return {"status": "error", "message": "Signal Generator not found or offline."}
    
    intent = req.get("intent")
    value = req.get("value")
    
    try:
        if intent == "set_frequency":
            await driver_registry.enqueue_command(req.get("inst_id", -1), driver.execute, "set_frequency", value=float(value))
        elif intent == "set_power":
            await driver_registry.enqueue_command(req.get("inst_id", -1), driver.execute, "set_power", value=float(value))
        elif intent == "rf_toggle":
            cmd_intent = "rf_on" if value else "rf_off"
            await driver_registry.enqueue_command(req.get("inst_id", -1), driver.execute, cmd_intent)
        elif intent == "mod_toggle":
            type = req.get("mod_type", "am")
            if value: driver.execute(f"{type}_on")
            else: driver.execute(f"{type}_off")
        elif intent == "arb_toggle":
            if value: driver.execute("arb_on")
            else: driver.execute("arb_off")
            
        return {"status": "success", "echo": req}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/analyzer/control")
async def analyzer_control(req: Dict[str, Any], manufacturer: Optional[str] = None):
    driver = resolve_driver("Spectrum Analyzer", manufacturer)
    if not driver:
        return {"status": "error", "message": "Spectrum Analyzer not found."}
        
    intent = req.get("intent")
    value = req.get("value")
    
    try:
        if intent == "set_center":
            driver.execute("sa_center", value=float(value))
        elif intent == "set_span":
            driver.execute("sa_span", value=float(value))
        elif intent == "set_ref_level":
            driver.execute("sa_ref_level", value=float(value))
        elif intent == "set_rbw":
            driver.execute("sa_rbw", value=float(value))
        elif intent == "run_sweep":
            driver.execute("sa_init_single")
            
        return {"status": "success", "echo": req}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/analyzer/trace")
async def get_analyzer_trace(manufacturer: Optional[str] = None):
    driver = resolve_driver("Spectrum Analyzer", manufacturer)
    if not driver: return {"status": "error"}
    
    try:
        trace_data = driver.execute("sa_trace")
        return {"status": "success", "trace": trace_data}
    except:
        return {"status": "error"}

# ─────────────────────────── Helpers ─────────────────────────────────────────
def get_keysight(addr: str) -> KeysightUniversalDriver:
    drv = KeysightUniversalDriver(simulation=config_service.is_simulation_mode())
    if not drv.connect(addr):
        raise HTTPException(status_code=503, detail=f"Keysight not reachable at {addr}")
    return drv

def get_rs(addr: str) -> RSUniversalDriver:
    drv = RSUniversalDriver(simulation=config_service.is_simulation_mode())
    if not drv.connect(addr):
        raise HTTPException(status_code=503, detail=f"R&S not reachable at {addr}")
    return drv

async def resolve_driver(manufacturer: str, role: str):
    """
    Ultra-Low Latency Driver Resolution.
    Uses the DriverRegistry Singleton to reuse open sockets.
    """
    sim = config_service.is_simulation_mode()
    active_asset = asset_service.get_active_instrument(role)
    
    # Standardize driver classes
    from ..drivers.keysight_universal import KeysightUniversalDriver
    from ..drivers.rs_universal import RSUniversalDriver
    
    if active_asset:
        # 1. Determine Driver Class
        drv_cls = KeysightUniversalDriver if active_asset.driver_id == "KeysightUniversalDriver" else RSUniversalDriver
            
        # 2. Get/Create Persistent Driver from Registry
        drv = await driver_registry.get_driver(active_asset.id, drv_cls, sim=sim)
        if drv:
            return drv, active_asset.id

    # Fallback to direct connection if no asset registry entry exists
    addr = config_service.get_instrument_ip(role)
    if not addr:
        # For testing/demo, if no IP is set, we still return a simulation driver
        if sim:
            return (KeysightUniversalDriver(True) if manufacturer == "keysight" else RSUniversalDriver(True)), -1
        raise HTTPException(status_code=404, detail=f"No active instrument for {role}. Set IP in Config.")
        
    drv = KeysightUniversalDriver(sim) if manufacturer == "keysight" else RSUniversalDriver(sim)
    if not drv.connect(addr):
        raise HTTPException(status_code=503, detail="Instrument not reachable")
    return drv, -1

# ─────────────────────────── Request Models ──────────────────────────────────
class FrequencyRequest(BaseModel):
    freq_hz: Optional[float] = None
    value: Optional[float] = None # Fallback for GUI
    manufacturer: Literal["keysight", "rs"] = "keysight"

class PowerRequest(BaseModel):
    power_dbm: Optional[float] = None
    value: Optional[float] = None # Fallback for GUI
    manufacturer: Literal["keysight", "rs"] = "keysight"

class RFOutputRequest(BaseModel):
    state: bool
    manufacturer: Literal["keysight", "rs"] = "keysight"
    port: int = 1

class ModulationRequest(BaseModel):
    state: bool
    type: str # Literals can be brittle during rapid industrialization
    manufacturer: Literal["keysight", "rs"] = "keysight"
    depth: float = 30.0
    deviation: float = 10000.0
    source: str = "INT"

class PulseRequest(BaseModel):
    period: float
    width: float
    delay: float = 0.0
    double_pulse: bool = False
    manufacturer: Literal["keysight", "rs"] = "keysight"

class ALCRequest(BaseModel):
    state: bool
    manufacturer: Literal["keysight", "rs"] = "keysight"

class RefClockRequest(BaseModel):
    source: Literal["INT", "EXT"] = "INT"
    freq_hz: float = 10e6
    manufacturer: Literal["keysight", "rs"] = "keysight"

class SweepRequest(BaseModel):
    start_hz: float
    stop_hz: float
    step_hz: float = 1e6
    dwell_s: float = 0.01
    manufacturer: Literal["keysight", "rs"] = "keysight"

class AnalyzerFreqRequest(BaseModel):
    center_hz: Optional[float] = None
    span_hz: Optional[float] = None
    center: Optional[float] = None # Fallback
    span: Optional[float] = None # Fallback
    manufacturer: Literal["keysight", "rs"] = "keysight"

class AnalyzerSettingsRequest(BaseModel):
    manufacturer: Literal["keysight", "rs"] = "keysight"
    ref_level: Optional[float] = None
    attenuation: Optional[float] = None
    attenuation_auto: bool = True
    detector: Optional[str] = None
    rbw: Optional[float] = None
    vbw: Optional[float] = None
    avg_state: Optional[bool] = None
    avg_count: int = 10
    sweep_time: Optional[float] = None
    points: Optional[int] = None
    preamp: Optional[bool] = None
    trace_mode: Optional[str] = None
    trigger_source: Optional[str] = None

class MarkerRequest(BaseModel):
    manufacturer: Literal["keysight", "rs"] = "keysight"
    index: int = Field(ge=1, le=12)
    freq_hz: Optional[float] = None
    state: bool = True
    search_peak: bool = False
    clear_all: bool = False
    direction: Optional[Literal["RIGHT", "LEFT"]] = None
    marker_type: Optional[str] = None

class ARBRequest(BaseModel):
    name: str
    i_data: List[float]
    q_data: List[float]
    sample_rate_hz: float = 100e6
    force: bool = False
    manufacturer: Literal["keysight", "rs"] = "keysight"

class VNARequest(BaseModel):
    manufacturer: Literal["keysight", "rs"] = "keysight"
    start_hz: float
    stop_hz: float
    points: int = 201
    power_dbm: float = -10.0
    parameter: str = "S11"

# ──────────────────────── Signal Generator Endpoints ─────────────────────────
@router.post("/siggen/frequency", responses={503: {"description": "Signal Generator not reachable"}})
async def set_sg_frequency(req: FrequencyRequest):
    drv, inst_id = await resolve_driver(req.manufacturer, SIGGEN)
    from ..services.scpi_negotiation_engine import SCPINegotiationEngine
    engine = SCPINegotiationEngine(drv)
    
    val = req.freq_hz if req.freq_hz is not None else req.value
    if val is None:
        raise HTTPException(status_code=400, detail="Frequency value required")

    async with driver_registry.lock_and_broadcast(inst_id):
        result = await driver_registry.enqueue_command(inst_id, engine.execute_intent, "set_freq", {"value": val})
        if result["status"] == "success":
            return {"status": "ok", "freq_hz": val}
        raise HTTPException(status_code=500, detail=str(result.get("errors", "Instrumentation Error")))

@router.post("/siggen/power")
async def set_sg_power(req: PowerRequest):
    drv, inst_id = await resolve_driver(req.manufacturer, SIGGEN)
    from ..services.scpi_negotiation_engine import SCPINegotiationEngine
    engine = SCPINegotiationEngine(drv)
    
    val = req.power_dbm if req.power_dbm is not None else req.value
    if val is None:
        raise HTTPException(status_code=400, detail="Power value required")

    async with driver_registry.lock_and_broadcast(inst_id):
        result = await engine.execute_intent("set_pow", {"value": val})
        if result["status"] == "success":
            return {"status": "ok", "power_dbm": val}
        raise HTTPException(status_code=500, detail=str(result.get("errors", "Instrumentation Error")))

@router.post("/siggen/rf")
async def set_sg_rf(req: RFOutputRequest):
    drv, inst_id = await resolve_driver(req.manufacturer, SIGGEN)
    from ..services.scpi_negotiation_engine import SCPINegotiationEngine
    engine = SCPINegotiationEngine(drv)
    
    intent = "rf_on" if req.state else "rf_off"
    async with driver_registry.lock_and_broadcast(inst_id):
        result = await driver_registry.enqueue_command(inst_id, engine.execute_intent, intent)
        if result["status"] == "success":
            return {"status": "ok", "rf_state": req.state}
        raise HTTPException(status_code=500, detail=str(result.get("errors", "Instrumentation Error")))

@router.post("/siggen/modulation")
async def set_sg_modulation(req: ModulationRequest):
    drv, inst_id = await resolve_driver(req.manufacturer, SIGGEN)
    async with driver_registry.lock_and_broadcast(inst_id):
        if req.type == "AM":
            drv.sg_set_am(req.state, req.depth, req.source)
        elif req.type == "FM":
            drv.sg_set_fm(req.state, req.deviation, req.source)
        elif req.type == "PM":
            drv.sg_set_pm(req.state, req.deviation, req.source)
        elif req.type == "PULSE":
            drv.sg_set_pulse_modulation(req.state)
        return {"status": "ok", "type": req.type, "state": req.state}

@router.post("/siggen/pulse-params")
async def set_sg_pulse(req: PulseRequest):
    drv, inst_id = await resolve_driver(req.manufacturer, SIGGEN)
    async with driver_registry.lock_and_broadcast(inst_id):
        drv.sg_set_pulse_params(req.period, req.width, req.delay, req.double_pulse)
        return {"status": "ok"}

@router.post("/siggen/alc")
async def set_sg_alc(req: ALCRequest):
    drv, inst_id = await resolve_driver(req.manufacturer, SIGGEN)
    async with driver_registry.lock_and_broadcast(inst_id):
        drv.sg_set_alc(req.state)
        return {"status": "ok", "alc_state": req.state}

@router.post("/siggen/ref-clock")
def set_sg_ref_clock(req: RefClockRequest):
    drv = resolve_driver(req.manufacturer, SIGGEN)
    try:
        drv.sg_set_ref_clock(req.source, req.freq_hz)
        return {"status": "ok"}
    finally:
        drv.disconnect()

@router.post("/siggen/sweep")
def set_sg_sweep(req: SweepRequest):
    drv = resolve_driver(req.manufacturer, SIGGEN)
    try:
        drv.sg_set_sweep(req.start_hz, req.stop_hz, req.step_hz, req.dwell_s)
        return {"status": "ok"}
    finally:
        drv.disconnect()

@router.post("/siggen/arb")
def upload_sg_arb(req: ARBRequest):
    drv = resolve_driver(req.manufacturer, SIGGEN)
    try:
        success = drv.sg_upload_arb_iq(req.name, req.i_data, req.q_data, req.sample_rate_hz, req.force)
        return {"status": "ok" if success else "error"}
    finally:
        drv.disconnect()

@router.post("/siggen/reset")
async def sg_reset(manufacturer: str = "keysight"):
    drv, inst_id = await resolve_driver(manufacturer, SIGGEN)
    async with driver_registry.lock_and_broadcast(inst_id):
        drv.reset()
        return {"status": "ok"}

@router.get("/siggen/status")
async def get_sg_status(manufacturer: str = "keysight"):
    drv, inst_id = await resolve_driver(manufacturer, SIGGEN)
    async with driver_registry.lock_and_broadcast(inst_id):
        return drv.sg_get_complete_status()

# ──────────────────────── Spectrum Analyzer Endpoints ────────────────────────
@router.post("/analyzer/frequency", responses={503: {"description": "Spectrum Analyzer not reachable"}})
async def set_sa_frequency(req: AnalyzerFreqRequest):
    drv, inst_id = await resolve_driver(req.manufacturer, ANALYZER)
    async with driver_registry.lock_and_broadcast(inst_id):
        drv.sa_set_center_span(req.center_hz, req.span_hz)
        return {"status": "ok"}

@router.post("/analyzer/settings")
def set_sa_settings(req: AnalyzerSettingsRequest):
    drv = resolve_driver(req.manufacturer, ANALYZER)
    try:
        if req.ref_level is not None:
            drv.sa_set_reference_level(req.ref_level)
        if req.attenuation is not None or req.attenuation_auto:
            drv.sa_set_attenuation(req.attenuation or 10.0, req.attenuation_auto)
        if req.detector:
            drv.sa_set_detector(req.detector)
        if req.rbw:
            drv.sa_set_rbw(req.rbw)
        if req.vbw:
            drv.sa_set_vbw(req.vbw)
        if req.avg_state is not None:
            drv.sa_set_average(req.avg_count, req.avg_state)
        if req.sweep_time:
            drv.sa_set_sweep_time(req.sweep_time)
        if req.points:
            drv.sa_set_sweep_points(req.points)
        if req.preamp is not None:
            drv.sa_set_preamp(req.preamp)
        if req.trace_mode:
            drv.sa_set_trace_mode(1, req.trace_mode)
        if req.trigger_source:
            drv.sa_set_trigger_source(req.trigger_source)
        return {"status": "ok"}
    finally:
        drv.disconnect()

@router.post("/analyzer/marker")
def set_sa_marker(req: MarkerRequest):
    drv = resolve_driver(req.manufacturer, ANALYZER)
    try:
        if req.clear_all:
            drv.sa_clear_all_markers()
            return {"status": "ok", "action": "cleared_all"}

        if req.search_peak:
            drv.sa_marker_peak_search(req.index)
        elif req.direction == "RIGHT":
            drv.sa_marker_next_right(req.index)
        elif req.direction == "LEFT":
            drv.sa_marker_next_left(req.index)
        elif req.freq_hz is not None:
            drv.sa_set_marker(req.index, req.freq_hz, req.state)
        else:
            drv.sa_set_marker(req.index, 1e9, req.state)

        marker_data = drv.sa_query_marker(req.index)
        return {"status": "ok", "marker": req.index, **marker_data}
    finally:
        drv.disconnect()

@router.post("/analyzer/trace-mode")
def set_trace_mode(mode: str = "WRIT", trace: int = 1, manufacturer: str = "keysight"):
    drv = resolve_driver(manufacturer, "Spectrum Analyzer")
    try:
        drv.sa_set_trace_mode(trace, mode)
        return {"status": "ok"}
    finally:
        drv.disconnect()

@router.get("/analyzer/trace")
async def get_sa_trace(manufacturer: str = "keysight", trace: int = 1):
    drv, inst_id = await resolve_driver(manufacturer, ANALYZER)
    async with driver_registry.lock_and_broadcast(inst_id):
        # High-Speed Binary Streaming
        return {"trace": drv.get_trace()}

@router.get("/analyzer/status", responses={503: {"description": "Spectrum Analyzer not reachable"}})
def get_sa_status(manufacturer: str = "keysight"):
    drv = resolve_driver(manufacturer, ANALYZER)
    try:
        return drv.sa_get_complete_status()
    finally:
        drv.disconnect()

@router.post("/analyzer/single-sweep", responses={503: {"description": "Spectrum Analyzer not reachable"}})
def sa_single_sweep(manufacturer: str = "keysight"):
    drv = resolve_driver(manufacturer, ANALYZER)
    try:
        drv.sa_initiate_single()
        return {"status": "ok", "trace": drv.sa_get_trace_points(1)}
    finally:
        drv.disconnect()

# ──────────────────────────── VNA Endpoints ───────────────────────────────────
@router.post("/vna/setup", responses={503: {"description": "VNA not reachable"}})
def setup_vna(req: VNARequest):
    drv = resolve_driver(req.manufacturer, VNA)
    try:
        if req.manufacturer == "keysight":
            drv.vna_set_start_stop(req.start_hz, req.stop_hz)
            drv.vna_set_points(req.points)
            drv.vna_set_power(req.power_dbm)
            drv.vna_set_parameter(1, req.parameter)
        else:
            drv.vna_set_start_stop(req.start_hz, req.stop_hz)
            drv.vna_set_points(req.points)
            drv.vna_set_power(req.power_dbm)
            drv.vna_set_s_parameter(1, req.parameter)
        return {"status": "ok"}
    finally:
        drv.disconnect()

# ──────────────────────────── Universal SCPI ──────────────────────────────────
@router.post("/send-scpi")
def send_raw_scpi(
    manufacturer: str,
    address: str,
    command: str,
    is_query: bool = False
):
    """Direct SCPI access for advanced users and debugging."""

    try:
        if manufacturer == "keysight":
            drv = KeysightUniversalDriver(simulation=config_service.is_simulation_mode())
        else:
            drv = RSUniversalDriver(simulation=config_service.is_simulation_mode())
        
        if not drv.connect(address):
            raise HTTPException(status_code=503, detail="Instrument not reachable")
        
        try:
            if is_query:
                result = drv.query(command)
                return {"status": "ok", "response": result}
            else:
                drv.write(command)
                return {"status": "ok"}
        finally:
            drv.disconnect()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
