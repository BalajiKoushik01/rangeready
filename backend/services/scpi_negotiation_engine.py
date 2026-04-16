"""
FILE: services/scpi_negotiation_engine.py
ROLE: Supervised AI Healer & Communication Self-Optimizer.
TRIGGERS: commands.py (hardware mutations), ai_copilot (XAI generation).
DESCRIPTION:
  The "Nerve System" of RangeReady. It now handles Human-in-the-Loop 
  approval for all AI-driven hardware repairs.
"""

import re
import time
import uuid
import asyncio
import logging
from typing import Dict, Any, List, Tuple, Optional

logger = logging.getLogger("scpi.negotiation")

# INTENT MAPPING: Unified GUI actions -> Manifest keys
INTENT_MAP = {
    "frequency": "set_freq",
    "power": "set_pow",
    "rf_on": "rf_on",
    "rf_off": "rf_off",
    "mod_on": "mod_on",
    "mod_off": "mod_off",
    "reset": "reset"
}

# Global registry for pending user approvals
# format: {proposal_id: asyncio.Future}
PENDING_APPROVALS: Dict[str, asyncio.Future] = {}

def _get_ai():
    """Returns the ai_copilot singleton."""
    try:
        from backend.services.ai_copilot import ai_copilot
        return ai_copilot
    except Exception:
        return None

# --- CONFIGURATION & PATHS ---
SCPI_ERROR_DB: Dict[int, Dict[str, str]] = {
    -101: {"desc": "Invalid character",           "severity": "auto_heal",      "strategy": "strip_invalid_chars"},
    -102: {"desc": "Syntax error",                "severity": "auto_heal",      "strategy": "fix_whitespace"},
    -109: {"desc": "Missing parameter",           "severity": "auto_heal",      "strategy": "add_default_param"},
    -113: {"desc": "Undefined header",            "severity": "auto_heal",      "strategy": "try_alternate_header"},
    -222: {"desc": "Data out of range",           "severity": "auto_heal",      "strategy": "clamp_value"},
    100:  {"desc": "Instrument hardware fault",   "severity": "fatal",          "strategy": "alert_user"},
}

class SCPINegotiationEngine:
    """Supervised AI-Integrated SCPI communication layer (Human-in-the-Loop)."""

    MAX_RETRIES = 3

    def __init__(self, driver):
        self.driver = driver
        self._heal_cache: Dict[str, str] = {}
        self._error_log: List[Dict[str, Any]] = []
        self._manifest: Optional[Dict[str, Any]] = None
        self._load_manifest()

    def _load_manifest(self):
        """Loads hardware-specific SCPI dialect from manifests/ context."""
        try:
            from backend.drivers.manifest_loader import ManifestLoader
            idn = getattr(self.driver, 'idn', '')
            self._manifest = ManifestLoader.get_manifest_by_idn(idn)
            if self._manifest:
                logger.info(f"[Profiler] Manifest Loaded: {self._manifest.id}")
        except Exception as e:
            logger.warning(f"[Profiler] No manifest found for hardware. Using generic fallback. ({e})")

    async def _broadcast(self, msg_type: str, data: Dict[str, Any]):
        """Broadcasts AI reasoning and proposals to the frontend."""
        try:
            from backend.services.broadcast import manager
            await manager.broadcast({
                "type": msg_type, # 'telemetry_packet' | 'telemetry_heal' | 'telemetry_proposal'
                **data,
                "address": getattr(self.driver, 'address', 'Unknown'),
                "timestamp": True
            })
        except Exception:
            # Broadcast is non-critical for measurement integrity
            pass

    async def execute_intent(self, intent: str, params: Dict[str, Any] = {}) -> Dict[str, Any]:
        """
        UNIVERSAL DISPATCHER: Translates a GUI 'Intent' into a Hardware 'Packet'.
        
        TRACE: Used by control.py to achieve cross-vendor compatibility.
        """
        cmd_template = None
        
        # 1. Look up in Manifest
        if self._manifest and intent in self._manifest.commands:
            cmd_template = self._manifest.commands[intent].get("command")
        
        # 2. Fallback to AI Translation if manifest misses it
        if not cmd_template:
            ai = _get_ai()
            if ai and ai.is_available():
                logger.info(f"[Babelfish] Manifest miss for '{intent}'. Consulting AI...")
                cmd_template = ai.translate_to_scpi(f"Intent: {intent} with {params}", idn_context=getattr(self.driver, 'idn', ''))
        
        # 3. Final Fallback (Try common defaults)
        if not cmd_template:
            # Simple heuristic
            if intent == "set_freq": cmd_template = "FREQ {value}"
            elif intent == "set_pow": cmd_template = "POW {value}"
            elif intent == "rf_on": cmd_template = "OUTP ON"
            elif intent == "rf_off": cmd_template = "OUTP OFF"
            elif intent == "mod_on": cmd_template = "SOUR:AM:STAT ON" # Generic AM fallback
            elif intent == "mod_off": cmd_template = "SOUR:AM:STAT OFF"
            else: return {"status": "error", "message": f"Intent '{intent}' unknown to system."}

        # 4. Interpolate parameters
        final_cmd = cmd_template
        for key, val in params.items():
            final_cmd = final_cmd.replace(f"{{{key}}}", str(val))
            
        return await self.send(final_cmd)

    async def send(self, cmd: str, retries: int = 0) -> Dict[str, Any]:
        """
        Sends a SCPI command to the hardware and initiates a supervised fixed-loop 
        if interceptable errors are detected.
        
        Args:
            cmd: The raw SCPI string to transmit.
            retries: Current iteration count for the recursive healing loop.
            
        Returns:
            A results dictionary containing execution status, hardware response, 
            and any AI-driven healing justifications.
        """
        result = {"status": "success", "command_sent": cmd, "response": None, "heal_actions": [], "errors": []}
        
        # 1. Warm-up: Check local cache of approved heals (Self-Optimization)
        effective_cmd = self._heal_cache.get(cmd, cmd)
        if effective_cmd != cmd:
            result["command_sent"] = effective_cmd

        # 2. Hardware Dispatch
        try:
            if "?" in effective_cmd:
                result["response"] = self.driver.query(effective_cmd)
            else:
                self.driver.write(effective_cmd)
        except Exception as e:
            logger.error(f"[Hardware-Bus] Transmission failure: {e}")
            result["status"] = "fatal"
            return result

        # 3. Synchronous Post-Flight Error Check
        raw_errors = self.driver.check_errors()
        if not raw_errors or "No error" in str(raw_errors):
            return result

        # 4. Error Found -> Supervised Fix Loop (Supervised Autonomy)
        result["errors"] = raw_errors
        return await self._handle_error_flow(cmd, effective_cmd, raw_errors, retries, result)

    async def _handle_error_flow(self, original_cmd: str, effective_cmd: str, 
                                 raw_errors: List[str], retries: int, result: Dict) -> Dict[str, Any]:
        """
        Analyzes hardware error strings and attempts technical remediation 
        via the Apex Intelligence Engine.
        """
        
        error_str = raw_errors[0]
        match = re.search(r'([+-]?\d+)', error_str)
        code = int(match.group(1)) if match else 0
        
        # If we have retries left, seek AI proposal
        if retries < self.MAX_RETRIES:
            proposal = await self._seek_supervised_fix(effective_cmd, code, error_str)
            
            if proposal and proposal.get("corrected_command"):
                rectified_cmd = proposal["corrected_command"]
                result["heal_actions"].append(f"User Approved: '{effective_cmd}' -> '{rectified_cmd}'")
                self._heal_cache[original_cmd] = rectified_cmd
                # Recursive retry WITH explicit permission
                return await self.send(rectified_cmd, retries=retries + 1)
        
        result["status"] = "warning"
        return result

    async def _seek_supervised_fix(self, cmd: str, code: int, desc: str) -> Optional[Dict[str, str]]:
        """Pauses execution and asks the user for permission via a GUI popup."""
        ai = _get_ai()
        if not (ai and ai.is_available()):
            return None

        idn = getattr(self.driver, 'idn', 'Generic Instrument')
        logger.info(f"[XAI] Requesting supervised repair for error {code}...")
        
        # 1. Get AI reasoning and corrected command
        proposal_data = ai.ai_heal(cmd, code, desc, idn)
        if not proposal_data:
            return None

        # 2. Generate unique proposal ID for the GUI
        proposal_id = str(uuid.uuid4())[:8]
        
        # 3. Create a Future that will be resolved by the API when the user clicks 'Approve'
        approval_future = asyncio.get_event_loop().create_future()
        PENDING_APPROVALS[proposal_id] = approval_future

        # 4. Pop up in the GUI
        await self._broadcast("telemetry_proposal", {
            "proposal_id": proposal_id,
            "original_cmd": cmd,
            "error": f"{code}: {desc}",
            "suggestion": proposal_data["corrected_command"],
            "explanation": proposal_data["explanation"],
            "impact": proposal_data["impact"],
            "idn": idn
        })

        # 5. HALT execution until the user responds
        try:
            logger.info(f"[XAI] Suspending thread. Waiting for user approval on {proposal_id}...")
            # 60-second timeout for industrial safety
            user_response = await asyncio.wait_for(approval_future, timeout=60.0)
            
            if user_response["approved"]:
                logger.info(f"[XAI] User APPROVED heal for {proposal_id}")
                return proposal_data
            else:
                logger.warning(f"[XAI] User REJECTED heal for {proposal_id}")
                return None
        except asyncio.TimeoutError:
            logger.error(f"[XAI] Approval TIMEOUT for {proposal_id}. Proceeding without fix.")
            return None
        finally:
            if proposal_id in PENDING_APPROVALS:
                del PENDING_APPROVALS[proposal_id]

    def get_error_history(self) -> List[Dict[str, Any]]:
        return self._error_log
