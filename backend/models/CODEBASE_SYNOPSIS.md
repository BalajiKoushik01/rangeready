# RangeReady Codebase Synopsis (For AI Self-Healing)

This document provides the internal logic and architecture of RangeReady for autonomous healing.

## 🔧 Core Services
### ai_copilot.py
- **Role**: ROLE: Industrial AI Intelligence Engine — Portable Ollama Apex.
- **Key Logic**: def __init__(self):, def is_running(self) -> bool:, def start(self):, def ensure_model(self):, def __init__(self):, def _bootstrap(self):, def _generate(self, prompt: str, system: Optional[str] = None, max_tokens: int = 128) -> str:, def translate_to_scpi(self, natural_language: str, idn_context: str = "") -> str:

### scpi_negotiation_engine.py
- **Role**: ROLE: Autonomous AI Healer & Communication Self-Optimizer.
- **Key Logic**: def _get_ai():, def __init__(self, driver):, async def _broadcast(self, msg_type: str, packet: str):, def send(self, cmd: str, retries: int = 0) -> Dict[str, Any]:, def _handle_error_flow(self, original_cmd: str, effective_cmd: str,, def _attempt_ai_fix(self, cmd: str, code: int, desc: str) -> Optional[str]:, def get_error_history(self) -> List[Dict[str, Any]]:

### broadcast.py
- **Role**: ROLE: WebSocket Connection Manager.
- **Key Logic**: def __init__(self):, async def connect(self, websocket: WebSocket):, def disconnect(self, websocket: WebSocket):, async def broadcast(self, message: dict):, async def broadcast_trace(self, trace_data: List[float], metadata: dict = None):, async def broadcast_status(self, status_msg: str):

### config_service.py
- **Role**: ROLE: Central State & Persistence Orchestrator.
- **Key Logic**: def __init__(self, config_path: str = CONFIG_FILE):, def load_config(self):, def save_config(self):, def get_instrument_ip(self, role: str) -> str:, def set_instrument_ip(self, role: str, ip: str):, def is_simulation_mode(self) -> bool:, def set_simulation_mode(self, enabled: bool):, def get_all_instruments(self) -> Dict[str, Any]:

## 📡 Hardware Manifests
- **rs_analyzer.json**: Ingesting command dictionary for rs_analyzer.
- **rs_fsv.json**: Ingesting command dictionary for rs_fsv.
- **keysight_exg.json**: Ingesting command dictionary for keysight_exg.
