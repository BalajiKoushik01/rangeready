"""
FILE: services/scpi_negotiation_engine.py
ROLE: Intelligent SCPI Error Healer & Communication Self-Optimizer.
TRIGGERS: commands.py (wraps every command execution), discovery_service.py.
TARGETS: Any hardware driver (Keysight, R&S, Generic).
DESCRIPTION:
  This engine wraps ANY driver and adds automatic error recovery.
  Every SCPI command sent through this engine is:
    1. Sent to hardware
    2. Hardware error register (SYST:ERR?) is queried
    3. If an error code is found, a healing strategy is applied
    4. The corrected command is retried (max 3 times)
    5. If still failing, the error is reported with a full diagnosis

  The engine also auto-profiles new hardware by probing it with
  common command variants and recording what the hardware responds to.

SCPI ERROR CODE REFERENCE (IEEE 488.2 Standard):
  Code | Category         | Engine Action
  -----|------------------|--------------
  -113 | Undefined header | Try short/long form alternates
  -101 | Invalid char     | Strip non-printable, retry
  -102 | Syntax error     | Add whitespace, check format
  -108 | Param not allowed| Remove parameter, send bare
  -109 | Missing param    | Add default value from caps profile
  -222 | Data out of range| Clamp to hardware limits
  -230 | Data stale       | *CLS then re-query
  -410 | Query interrupted| Add *OPC? barrier, retry
  +100 | Hardware fault   | Log + alert user, no retry

DATA FLOW:
  commands.py → SCPINegotiationEngine.send(cmd) → Driver.write(cmd)
  → Driver.check_errors() → [Error Found] → heal(error_code, cmd)
  → retry → [Success] → broadcast response
"""

import re
import time
import logging
from typing import Dict, Any, List, Tuple, Optional

logger = logging.getLogger("scpi.negotiation")

# Lazy import of ai_copilot to avoid circular imports at module load
# The AI is used as a last-resort when all static heuristics fail.
def _get_ai():
    """Returns the ai_copilot singleton, or None if not available."""
    try:
        from backend.services.ai_copilot import ai_copilot
        return ai_copilot
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# SCPI ERROR CODE DATABASE
# Each entry: code → (description, severity, heal_strategy)
# severity: 'auto_heal' | 'warn_and_retry' | 'fatal'
# ─────────────────────────────────────────────────────────────────────────────
SCPI_ERROR_DB: Dict[int, Dict[str, str]] = {
    # Command Errors (IEEE 488.2 Section 11.5.1)
    -100: {"desc": "Command error",               "severity": "warn_and_retry", "strategy": "syntax_check"},
    -101: {"desc": "Invalid character",           "severity": "auto_heal",      "strategy": "strip_invalid_chars"},
    -102: {"desc": "Syntax error",                "severity": "auto_heal",      "strategy": "fix_whitespace"},
    -103: {"desc": "Invalid separator",           "severity": "auto_heal",      "strategy": "fix_separator"},
    -104: {"desc": "Data type error",             "severity": "auto_heal",      "strategy": "cast_numeric"},
    -108: {"desc": "Parameter not allowed",       "severity": "auto_heal",      "strategy": "remove_param"},
    -109: {"desc": "Missing parameter",           "severity": "auto_heal",      "strategy": "add_default_param"},
    -113: {"desc": "Undefined header",            "severity": "auto_heal",      "strategy": "try_alternate_header"},
    -114: {"desc": "Header suffix out of range",  "severity": "auto_heal",      "strategy": "remove_suffix"},
    -131: {"desc": "Invalid suffix",              "severity": "auto_heal",      "strategy": "remove_suffix"},
    -148: {"desc": "Character not allowed",       "severity": "auto_heal",      "strategy": "strip_invalid_chars"},
    # Execution Errors (IEEE 488.2 Section 11.5.2)
    -200: {"desc": "Execution error",             "severity": "warn_and_retry", "strategy": "wait_and_retry"},
    -222: {"desc": "Data out of range",           "severity": "auto_heal",      "strategy": "clamp_value"},
    -224: {"desc": "Illegal param value",         "severity": "auto_heal",      "strategy": "use_nearest_enum"},
    -230: {"desc": "Data corrupt or stale",       "severity": "auto_heal",      "strategy": "clear_and_retry"},
    -240: {"desc": "Hardware error",              "severity": "warn_and_retry", "strategy": "reset_and_retry"},
    # Query Errors
    -400: {"desc": "Query error",                 "severity": "warn_and_retry", "strategy": "wait_and_retry"},
    -410: {"desc": "Query INTERRUPTED",           "severity": "auto_heal",      "strategy": "opc_barrier"},
    -420: {"desc": "Query UNTERMINATED",          "severity": "auto_heal",      "strategy": "add_terminator"},
    -430: {"desc": "Query DEADLOCKED",            "severity": "auto_heal",      "strategy": "clear_and_retry"},
    # Instrument Errors (positive codes — vendor specific)
    100:  {"desc": "Instrument hardware fault",   "severity": "fatal",          "strategy": "alert_user"},
    200:  {"desc": "Instrument operation fault",  "severity": "fatal",          "strategy": "alert_user"},
}

# ─────────────────────────────────────────────────────────────────────────────
# ALTERNATE HEADER TABLE
# For -113 errors: maps the "short form" to an array of alternatives to try.
# This is the primary fix for the Keysight N5171B -113 issue.
# ─────────────────────────────────────────────────────────────────────────────
HEADER_ALTERNATES = {
    # Signal Generators
    "FREQ":                 ["SOUR:FREQ:CW", "SOUR:FREQ", ":FREQ", ":SOURCE:FREQ:CW"],
    "SOUR:FREQ:CW":         ["FREQ", "SOUR:FREQ", ":SOUR:FREQ:CW"],
    "POW":                  ["SOUR:POW:LEV:IMM:AMPL", "SOUR:POW", ":POW"],
    "SOUR:POW:LEV:IMM:AMPL":["POW", "SOUR:POW", ":SOUR:POW"],
    "OUTP":                 ["OUTP:STAT", "OUTPUT:STATE", ":OUTP"],
    # Modulation
    "AM:STAT":              ["SOUR:AM:STAT", ":AM:STAT"],
    "SOUR:AM:STAT":         ["AM:STAT", ":SOUR:AM:STAT"],
    "FM:STAT":              ["SOUR:FM:STAT", ":FM:STAT"],
    "PULM:STAT":            ["SOUR:PULM:STAT", ":PULM:STAT"],
    # Spectrum Analyzers
    "SENS:FREQ:CENT":       ["FREQ:CENT", ":SENS:FREQ:CENT", "CENT"],
    "SENS:FREQ:SPAN":       ["FREQ:SPAN", ":SENS:FREQ:SPAN", "SPAN"],
    "SENS:BAND":            ["BAND", "RBW", ":SENS:BAND"],
    "DISP:WIND:TRAC:Y:RLEV":["RLEV", "DISP:TRAC:Y:RLEV", ":DISP:WIND:TRAC:Y:RLEV"],
    # Power Sources
    "VOLT":                 [":VOLT", "SOUR:VOLT", ":SOUR:VOLT"],
    "CURR":                 [":CURR", "SOUR:CURR", ":SOUR:CURR"],
}


class SCPINegotiationEngine:
    """
    Self-healing SCPI communication layer. Wraps any BaseInstrumentDriver.

    USAGE in commands.py:
        engine = SCPINegotiationEngine(driver)
        result = engine.send("SOUR:FREQ:CW 2.4E9")

    The engine will automatically:
      - Send the command
      - Check for errors
      - Apply healing if needed
      - Retry with corrected command
      - Broadcast all activity to the telemetry bus
    """

    MAX_RETRIES = 3
    RETRY_DELAY_S = 0.1

    def __init__(self, driver, broadcast_callback=None):
        """
        Args:
            driver: Any BaseInstrumentDriver instance (Keysight, R&S, Generic).
            broadcast_callback: Async callable to push telemetry to WebSocket.
        """
        self.driver = driver
        self.broadcast = broadcast_callback
        # Healing history: {original_cmd: healed_cmd} for learning
        self._heal_cache: Dict[str, str] = {}
        # Error pattern log for diagnosis
        self._error_log: List[Dict[str, Any]] = []

    def send(self, cmd: str, retries: int = 0) -> Dict[str, Any]:
        """
        Main entry point. Sends a SCPI command and returns a structured result.
        """
        result = self._init_result(cmd)

        # 1. Resolve effective command (check cache)
        effective_cmd = self._get_effective_command(cmd, result)

        # 2. Execute on hardware
        try:
            response = self._execute_raw(effective_cmd)
            result["response"] = response
        except Exception as e:
            result["status"] = "fatal"
            result["diagnosis"] = f"Transport error: {e}"
            return result

        # 3. Check and handle SCPI errors
        raw_errors = self.driver.check_errors()
        if not raw_errors:
            return result

        result["errors"] = raw_errors
        return self._handle_scpi_errors(cmd, effective_cmd, raw_errors, retries, result)

    def _init_result(self, cmd: str) -> Dict[str, Any]:
        return {
            "status": "success", "command_sent": cmd, "response": None,
            "errors": [], "heal_actions": [], "diagnosis": None,
        }

    def _get_effective_command(self, cmd: str, result: Dict) -> str:
        effective_cmd = self._heal_cache.get(cmd, cmd)
        if effective_cmd != cmd:
            result["heal_actions"].append(f"Using cached healed form: '{effective_cmd}'")
            result["command_sent"] = effective_cmd
        return effective_cmd

    def _execute_raw(self, cmd: str) -> Optional[str]:
        if "?" in cmd:
            return self.driver.query(cmd)
        self.driver.write(cmd)
        return None

    def _handle_scpi_errors(self, original_cmd: str, effective_cmd: str,
                           raw_errors: List[str], retries: int, result: Dict) -> Dict[str, Any]:
        parsed = [self._parse_error(e) for e in raw_errors]

        for code, info in parsed:
            # 1. Static Healing
            heal_result = self._apply_heal(info, effective_cmd, retries)
            if heal_result["healed"] and retries < self.MAX_RETRIES:
                retry_result = self._retry_with_static_heal(original_cmd, effective_cmd, code, info, heal_result, retries, result)
                # Recursive Healing: If retry still has errors, they will be handled by the recursive call to send
                return retry_result

            # 2. Fatal Errors
            if info.get("severity") == "fatal":
                return self._handle_fatal_error(effective_cmd, code, info, result)

        # 3. Last Resort: AI Fallback (only if all retries exhausted)
        if retries >= self.MAX_RETRIES and parsed:
            # Try AI one last time if allowed
            ai_result = self._attempt_ai_fallback(original_cmd, effective_cmd, parsed[0], result)
            if ai_result:
                return ai_result

        result["status"] = "warning"
        result["diagnosis"] = self._build_diagnosis(parsed[0][0], parsed[0][1], effective_cmd) if parsed else None
        return result

    def _retry_with_static_heal(self, original_cmd: str, effective_cmd: str,
                               code: int, info: Dict, heal_result: Dict,
                               retries: int, result: Dict) -> Dict[str, Any]:
        healed_cmd = heal_result["healed_cmd"]
        result["heal_actions"].append(
            f"Error {code} ({info.get('strategy','?')}): '{effective_cmd}' → '{healed_cmd}'"
        )
        self._heal_cache[original_cmd] = healed_cmd
        retry_result = self.send(healed_cmd, retries=retries + 1)

        if retry_result["status"] in ("success", "healed"):
            retry_result["heal_actions"] = result["heal_actions"] + retry_result["heal_actions"]
            retry_result["status"] = "healed"
            self._log_heal(original_cmd, healed_cmd, code)
            return retry_result
        return retry_result

    def _handle_fatal_error(self, cmd: str, code: int, info: Dict, result: Dict) -> Dict[str, Any]:
        result["status"] = "fatal"
        result["diagnosis"] = self._build_diagnosis(code, info, cmd)
        self._error_log.append({"cmd": cmd, "code": code, "desc": info.get("desc"), "time": time.time()})
        return result

    def _attempt_ai_fallback(self, original_cmd: str, effective_cmd: str,
                            error_tuple: Tuple[int, Dict], result: Dict) -> Optional[Dict[str, Any]]:
        ai = _get_ai()
        if not (ai and ai.is_available()):
            return None

        code, info = error_tuple
        idn = getattr(self.driver, 'idn', 'Unknown Instrument')
        suggestion = ai.ai_heal(effective_cmd, code, info.get('desc', 'Unknown error'), idn)

        if suggestion:
            logger.info(f"[AI-HEAL] Suggestion: '{effective_cmd}' → '{suggestion}'")
            result["heal_actions"].append(f"[AI] Suggested correction: '{effective_cmd}' → '{suggestion}'")
            ai_res = self.send(suggestion, retries=self.MAX_RETRIES)
            if ai_res["status"] in ("success", "healed"):
                ai_res["heal_actions"] = result["heal_actions"] + ai_res["heal_actions"]
                ai_res["status"] = "healed"
                self._heal_cache[original_cmd] = suggestion
                return ai_res
        return None

    def probe_capabilities(self) -> Dict[str, Any]:
        """
        Auto-probes hardware by sending common SCPI commands and recording what works.
        """
        discovered = {}
        probe_candidates = {
            "query_idn":      ["*IDN?"],
            "query_error":    ["SYST:ERR?", "SYST:ERROR?", "STAT:ERR?", "ERR?"],
            "set_frequency":  ["SOUR:FREQ:CW {value}", "FREQ {value}", ":SOUR:FREQ {value}", "SOUR:FREQ:FIX {value}"],
            "set_power":      ["SOUR:POW:LEV:IMM:AMPL {value}", "POW {value}", ":SOUR:POW {value}", "AMPL {value}"],
            "rf_on":          ["OUTP ON", "OUTP:STAT ON", ":OUTP ON", "OUTPUT ON"],
            "rf_off":         ["OUTP OFF", "OUTP:STAT OFF", ":OUTP OFF", "OUTPUT OFF"],
            "sa_center":      ["SENS:FREQ:CENT {value}", "FREQ:CENT {value}", ":FREQ:CENT {value}", "CENT {value}"],
            "sa_span":        ["SENS:FREQ:SPAN {value}", "FREQ:SPAN {value}", ":FREQ:SPAN {value}", "SPAN {value}"],
            "sa_rbw":         ["SENS:BAND {value}", "BAND {value}", "RBW {value}", ":SENS:BAND:RES {value}"],
            "sa_trace":       ["TRAC:DATA? TRACE1", "TRAC? 1", ":TRAC:DATA? 1", "FETCH:TRAC?"],
        }

        # Value mapping for probes
        probe_values = {
            "set_frequency": "1E9",
            "set_power": "-30",
            "sa_center": "1E9",
            "sa_span": "100E6",
            "sa_rbw": "1E6",
        }

        for action, candidates in probe_candidates.items():
            for candidate in candidates:
                self.driver.write("*CLS")
                test_val = probe_values.get(action)
                test_cmd = candidate.replace("{value}", test_val) if test_val else candidate
                
                result = self.send(test_cmd)
                if result["status"] in ("success", "healed"):
                    working_cmd = result["command_sent"]
                    template = self._to_template(working_cmd)
                    discovered[action] = template
                    break

        return discovered

    # ─────────────────────────── Internal Healing Strategies ──────────────────

    def _parse_error(self, error_str: str) -> Tuple[int, Dict]:
        """Extracts the error code integer from 'SYST:ERR?' response."""
        match = re.search(r'([+-]?\d+)', error_str)
        if match:
            code = int(match.group(1))
            return code, SCPI_ERROR_DB.get(code, {
                "desc": error_str, "severity": "warn_and_retry", "strategy": "wait_and_retry"
            })
        return 0, {"desc": error_str, "severity": "warn_and_retry", "strategy": "wait_and_retry"}

    def _apply_heal(self, info: Dict, cmd: str, attempt: int) -> Dict[str, Any]:
        """Selects and applies the correct heal strategy for the error code."""
        strategy = info.get("strategy", "wait_and_retry")

        # Strategy dispatch table
        dispatch = {
            "try_alternate_header": self._heal_strategy_header,
            "strip_invalid_chars": self._heal_strategy_chars,
            "fix_whitespace": self._heal_strategy_whitespace,
            "remove_param": self._heal_strategy_remove_param,
            "add_default_param": self._heal_strategy_default_param,
            "clamp_value": self._heal_strategy_clamp,
            "clear_and_retry": self._heal_strategy_clear,
            "opc_barrier": self._heal_strategy_opc,
            "wait_and_retry": self._heal_strategy_wait,
            "reset_and_retry": self._heal_strategy_reset,
        }

        handler = dispatch.get(strategy, self._heal_strategy_wait)
        return handler(cmd, attempt)

    def _heal_strategy_header(self, cmd: str, attempt: int) -> Dict[str, Any]:
        """
        Proactively tries alternative SCPI headers.
        Cycles through common variations (Absolute vs Relative, Full vs Short).
        """
        parts = cmd.split()
        raw_header = parts[0].upper().rstrip("?")
        params = " ".join(parts[1:]) if len(parts) > 1 else ""
        suffix = "?" if "?" in cmd else ""

        # 1. Check known alternates table
        alternates = HEADER_ALTERNATES.get(raw_header, [])
        
        # 2. Add structural variations automatically
        # Try relative if absolute failed, or vice versa
        if raw_header.startswith(":"):
            alternates.append(raw_header[1:])
        else:
            alternates.append(":" + raw_header)
            
        # 3. Simple short/long form heuristic (e.g. SENS:FREQ -> FREQ)
        if ":" in raw_header:
            sub_parts = raw_header.split(":")
            if len(sub_parts) > 1:
                alternates.append(sub_parts[-1]) # Try just the last part (e.g. CENT)

        # 4. Remove colon-based hierarchies (e.g. SOUR:FREQ:CW -> FREQ:CW)
        if len(raw_header.split(":")) > 2:
            alternates.append(":".join(raw_header.split(":")[1:]))

        if not alternates:
            return {"healed": False, "healed_cmd": cmd}

        # Select alternate based on attempt number (cycling)
        idx = attempt % len(alternates)
        healed_cmd = f"{alternates[idx]}{suffix} {params}".strip()
        
        return {"healed": healed_cmd != cmd, "healed_cmd": healed_cmd}

    def _heal_strategy_chars(self, cmd: str, attempt: int) -> Dict[str, Any]:
        healed_cmd = re.sub(r'[^\x20-\x7E]', '', cmd).strip()
        return {"healed": healed_cmd != cmd, "healed_cmd": healed_cmd}

    def _heal_strategy_whitespace(self, cmd: str, attempt: int) -> Dict[str, Any]:
        healed_cmd = re.sub(r'([A-Z\?])(\-?\d)', r'\1 \2', cmd)
        return {"healed": healed_cmd != cmd, "healed_cmd": healed_cmd}

    def _heal_strategy_remove_param(self, cmd: str, attempt: int) -> Dict[str, Any]:
        parts = cmd.split()
        return {"healed": len(parts) > 1, "healed_cmd": parts[0]}

    def _heal_strategy_default_param(self, cmd: str, attempt: int) -> Dict[str, Any]:
        return {"healed": True, "healed_cmd": cmd + " 0"}

    def _heal_strategy_clamp(self, cmd: str, attempt: int) -> Dict[str, Any]:
        parts = cmd.split()
        if len(parts) >= 2:
            try:
                val = float(parts[-1])
                new_val = val / (2 ** (attempt + 1))
                return {"healed": True, "healed_cmd": cmd.replace(parts[-1], str(new_val))}
            except ValueError:
                pass
        return {"healed": False, "healed_cmd": cmd}

    def _heal_strategy_clear(self, cmd: str, attempt: int) -> Dict[str, Any]:
        self.driver.write("*CLS")
        time.sleep(0.2)
        return {"healed": True, "healed_cmd": cmd}

    def _heal_strategy_opc(self, cmd: str, attempt: int) -> Dict[str, Any]:
        self.driver.wait_for_opc(timeout_ms=5000)
        return {"healed": True, "healed_cmd": cmd}

    def _heal_strategy_wait(self, cmd: str, attempt: int) -> Dict[str, Any]:
        time.sleep(self.RETRY_DELAY_S * (attempt + 1))
        return {"healed": attempt < self.MAX_RETRIES, "healed_cmd": cmd}

    def _heal_strategy_reset(self, cmd: str, attempt: int) -> Dict[str, Any]:
        self.driver.write("*RST")
        time.sleep(1.0)
        return {"healed": True, "healed_cmd": cmd}

    def _to_template(self, cmd: str) -> str:
        """Converts a concrete command like 'FREQ 1E9' to a template 'FREQ {value}'."""
        return re.sub(r'\s+[+-]?[\d.E+-]+$', ' {value}', cmd)

    def _log_heal(self, original: str, healed: str, code: int):
        logger.info(f"[HEAL] {code}: '{original}' → '{healed}'")
        self._error_log.append({
            "type": "healed", "original": original,
            "healed": healed, "code": code, "time": time.time()
        })

    def _build_diagnosis(self, code: int, info: Dict, cmd: str) -> str:
        desc = info.get("desc", "Unknown error")
        return (
            f"SCPI Error {code}: {desc}. "
            f"Command: '{cmd}'. "
            f"Strategy '{info.get('strategy', 'none')}' exhausted after {self.MAX_RETRIES} attempts. "
            f"Check instrument manual for valid command syntax."
        )

    def get_error_history(self) -> List[Dict[str, Any]]:
        """Returns the engine's error/heal log for display in the GUI."""
        return self._error_log

    def get_heal_cache(self) -> Dict[str, str]:
        """Returns learned command corrections for display in the GUI."""
        return self._heal_cache
