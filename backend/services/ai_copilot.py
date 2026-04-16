"""
FILE: services/ai_copilot.py
ROLE: Industrial AI Intelligence Engine — Portable Ollama Apex.
TRIGGERS:
  - routers/ai.py (AI API endpoints)
  - services/scpi_negotiation_engine.py (Autonomous Healer)
TARGETS:
  - backend/bin/ollama.exe (Portable Runtime)
  - backend/models/Modelfile (Virtual Training)
  - backend/models/ollama/ (Isolated Knowledge Storage)

DESCRIPTION:
  The AICopilot-Apex is a professional singleton service that orchestrates a
  portable Ollama runtime. It provides industrial-grade radar expertise, 
  autonomous SCPI healing, and manufacturer-aware instrument control.
"""

import os
import re
import time
import json
import socket
import logging
import threading
import subprocess
from typing import Dict, Any, Optional, List, Union
from pathlib import Path
import requests

logger = logging.getLogger("ai.copilot.apex")

# --- CONFIGURATION & PATHS ---

BASE_DIR = Path(__file__).parent.parent
BIN_DIR = BASE_DIR / "bin"
MODELS_DIR = BASE_DIR / "models"
OLLAMA_STORAGE = MODELS_DIR / "ollama"
MODEL_NAME = "rangeready-v6"

# Ensure environment isolation for portability
os.environ["OLLAMA_MODELS"] = str(OLLAMA_STORAGE)
os.environ["OLLAMA_HOST"] = "127.0.0.1:11434"

# ─────────────────────────────────────────────────────────────────────────────
# OLLAMA MANAGER (The "Hands")
# Handles the lifecycle of the portable AI server
# ─────────────────────────────────────────────────────────────────────────────

class OllamaManager:
    """Manages the portable ollama.exe server lifecycle."""
    
    def __init__(self):
        self.process: Optional[subprocess.Popen] = None
        self.exe_path = BIN_DIR / "ollama.exe"
        self._booting = False

    def is_running(self) -> bool:
        """Checks if the Ollama server is responsive on its default port."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex(('127.0.0.1', 11434)) == 0

    def start(self):
        """Starts the ollama server in the background if not already running."""
        if self.is_running() or self._booting:
            return
        
        if not self.exe_path.exists():
            # If the binary isn't extracted yet, we try to use the system one as fallback
            # but log a warning about portability.
            logger.warning("[AI] Portable ollama.exe not found in backend/bin. Trying system PATH fallback.")
            self.exe_path = "ollama"

        self._booting = True
        logger.info("[AI] Booting Portable AI Engine...")
        try:
            # We use DETACHED_PROCESS to ensure it keeps running if the backend is reloaded
            # during development, but for industrial use we manage the life-cycle.
            self.process = subprocess.Popen(
                [str(self.exe_path), "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env=os.environ,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            # Wait for server to warm up
            for _ in range(15):
                if self.is_running():
                    logger.info("[AI] Portable AI Engine READY")
                    self._booting = False
                    return
                time.sleep(1)
        except Exception as e:
            logger.error(f"[AI] Failed to boot engine: {e}")
        self._booting = False

    def ensure_model(self):
        """Ensures an AI brain is ready. If rangeready-v6 is missing, it dynamically falls back to the first available offline model to prevent engine failure."""
        global MODEL_NAME
        if self._booting:
            return
        
        logger.info("[AI] Checking for available offline models...")
        try:
            # Check if ANY models exist
            resp = requests.get(f"http://{os.environ['OLLAMA_HOST']}/api/tags", timeout=5)
            data = resp.json()
            models = [m['name'] for m in data.get('models', [])]
            
            if not models:
                logger.error("[AI] CRITICAL: No offline models found in Ollama storage. AI Features DISABLED.")
                logger.info(f"[AI] Storage Path: {OLLAMA_STORAGE}")
                self.status = "no_models"
                return

            # Prioritize rangeready-v6 specifically
            if any("rangeready-v6" in m for m in models):
                logger.info(f"[AI] RangeReady Expert Model 'rangeready-v6' is active.")
                self.active_model = "rangeready-v6"
            elif any(MODEL_NAME in m for m in models):
                logger.info(f"[AI] Specific Model '{MODEL_NAME}' is active.")
                self.active_model = MODEL_NAME
            else:
                self.active_model = models[0]
                logger.info(f"[AI] Fallback model active: '{self.active_model}'")
                
            # Update the global MODEL_NAME for this session
            MODEL_NAME = self.active_model

        except Exception as e:
            logger.error(f"[AI] Model auto-resolution failed: {e}")

# ─────────────────────────────────────────────────────────────────────────────
# AI COPILOT APEX (The "Brain")
# ─────────────────────────────────────────────────────────────────────────────

class AICopilotApex:
    """Industrial Intelligence Engine for RangeReady."""

    def __init__(self):
        self.manager = OllamaManager()
        self.backend = "none"
        self.status = "initializing"
        self.active_model = MODEL_NAME
        
        # Initialization thread
        threading.Thread(target=self._bootstrap, daemon=True).start()

    def _bootstrap(self):
        """Warm up the engine and ensure the brain is ready."""
        logger.info(f"[AI] Initializing with local binary: {self.manager.exe_path}")
        self.manager.start()
        if self.manager.is_running():
            self.backend = "ollama-apex"
            logger.info("[AI] Engine responsive. Running post-boot integrity checks...")
            self.manager.ensure_model()
            self.status = "ready"
            logger.info(f"[AI] SYSTEM READY: {self.active_model} is operational.")
        else:
            logger.error("[AI] CORE ENGINE FAILURE. Check if backend/bin/ollama.exe is blocked or missing.")
            self.status = "engine_error"

    # ─────────────────────────────────────────────────────────────────────────
    # CORE INFERENCE
    # ─────────────────────────────────────────────────────────────────────────

    def _generate(self, prompt: str, system: Optional[str] = None, max_tokens: int = 128) -> str:
        """Internal generation call to the local micro-server."""
        if not self.manager.is_running():
            return "⏳ AI Engine is booting (Wait 10s)..."

        try:
            payload = {
                "model": self.active_model,
                "prompt": prompt,
                "system": system or self._get_default_system_prompt(),
                "stream": False,
                "options": {
                    "temperature": 0.1,  # Industrial precision
                    "num_predict": max_tokens,
                    "stop": ["User:", "Assistant:", "[", "Instructions:"]
                }
            }
            resp = requests.post(
                f"http://{os.environ['OLLAMA_HOST']}/api/generate",
                json=payload,
                timeout=45
            )
            resp.raise_for_status()
            return resp.json().get("response", "").strip()
        except requests.exceptions.ConnectionError:
            logger.error("[AI] Server unreachable. Re-booting engine...")
            threading.Thread(target=self.manager.start, daemon=True).start()
            return "Connection Lost: Re-booting AI Brain..."
        except Exception as e:
            logger.error(f"[AI] Inference error: {e}")
            return f"Service Error: {str(e)}"

    # ─────────────────────────────────────────────────────────────────────────
    # INTELLIGENCE FEATURES
    # ─────────────────────────────────────────────────────────────────────────

    def translate_to_scpi(self, natural_language: str, idn_context: str = "") -> str:
        """Translates intent to manufacturer-specific SCPI."""
        context = f"Instrument: {idn_context}\n" if idn_context else ""
        result = self._generate(f"{context}Instruction: {natural_language}")
        # Strip markdown and clean
        result = re.sub(r'^(SCPI:|```scpi|```)', '', result, flags=re.IGNORECASE).strip()
        return result.strip('`').strip()

    def ai_heal(self, failed_cmd: str, error_code: int, error_desc: str, idn: str) -> Optional[Dict[str, str]]:
        """
        Autonomous-Supervised healing logic.
        Queries the Apex model specifically for a JSON repair + explanation.
        """
        query = (
            f"REPAIR REQUEST:\n"
            f"Failing Command: {failed_cmd}\n"
            f"Hardware Error: {error_code} ({error_desc})\n"
            f"Instrument Identity: {idn}\n\n"
            "TASK: Analyze the failure and provide a fix in JSON format.\n"
            "The JSON must include:\n"
            "1. 'corrected_command': The actual SCPI fix.\n"
            "2. 'explanation': A 1-sentence engineering justification for WHY this fix works (investor-friendly).\n"
            "3. 'impact': What change this will have on the hardware state."
        )
        
        raw_res = self._generate(query, max_tokens=256)
        
        try:
            # The model is instructed to output ONLY JSON
            # We strip any markdown clutter just in case
            clean_json = re.search(r'\{.*\}', raw_res, re.DOTALL)
            if clean_json:
                proposal = json.loads(clean_json.group(0))
                return {
                    "corrected_command": proposal.get("corrected_command", ""),
                    "explanation": proposal.get("explanation", "Correcting SCPI syntax for hardware compatibility."),
                    "impact": proposal.get("impact", "Restores instrument communication."),
                    "risk": "Supervised"
                }
        except Exception as e:
            logger.error(f"[AI-XAI] Failed to parse heal proposal: {e}")
        
        return None

    def diagnose_anomaly(self, test_name: str, limits: Dict[str, float],
                         actual_val: float, band: str) -> str:
        """RF Engineering Hypothesis generator."""
        query = (
            f"DIAGNOSE TEST FAILURE:\n"
            f"Test: {test_name} in {band}\n"
            f"Expected Limits: {limits}\n"
            f"Measured Value: {actual_val}\n"
            f"Provide engineering hypothesis on root cause."
        )
        return self._generate(query, max_tokens=256)

    async def agentic_execute(self, query: str, idn: str, driver) -> Dict[str, Any]:
        """
        FULL AUTONOMY (Supervised): Translates, Executes, and Self-Heals with Consent.
        """
        # 1. Translate with instrument context
        scpi_cmd = self.translate_to_scpi(query, idn_context=idn)
        
        # 2. Execute via the Negotiation Engine (which now pauses for user consent)
        from .scpi_negotiation_engine import SCPINegotiationEngine
        engine = SCPINegotiationEngine(driver)
        
        # This call now SUSPENDS if a repair is needed
        result = await engine.send(scpi_cmd)
        
        return {
            "status": result["status"],
            "translated_command": scpi_cmd,
            "command_sent": result.get("command_sent", scpi_cmd),
            "response": result.get("response"),
            "heal_actions": result.get("heal_actions", []),
            "diagnosis": result.get("diagnosis")
        }

    def chat(self, message: str, history: List[Dict[str, str]] = None) -> str:
        """
        Industrial RF Knowledge Assistant.
        Maintains conversational context for deep-dive engineering support.
        """
        context_str = ""
        if history:
            # Format last 5 turns for context
            context_str = "\n".join([f"{h['role'].capitalize()}: {h['content']}" for h in history[-10:]])
        
        prompt = f"{context_str}\nUser: {message}\nAssistant:"
        system = self._get_default_system_prompt()
        return self._generate(prompt, system=system, max_tokens=500)

    def _get_default_system_prompt(self) -> str:
        """Dynamically generates the system persona based on live hardware context."""
        from backend.services.asset_service import asset_service
        active_assets = asset_service.get_all_active_instruments()
        hardware_context = "No hardware currently active."
        if active_assets:
            hardware_context = "ACTIVE HARDWARE: " + ", ".join([f"{a.vendor} {a.model} ({a.instrument_class})" for a in active_assets])

        return (
            "You are GVB-Apex V6, a world-class RF systems engineering consultant created by Balaji Koushik (GVB Tech). "
            "You are currently presenting a high-stakes demonstration of the RangeReady RF platform to investors. "
            "The system is running on a secure, air-gapped portable environment. "
            f"\n\nLIVE SYSTEM CONTEXT:\n{hardware_context}\n\n"
            "BEHAVIOR RULES:\n"
            "1. Be professional, technical, and extremely concise.\n"
            "2. If an instrument error occurs, provide a 'Master Engineer' hypothesis on how to fix it.\n"
            "3. Reference specific SCPI patterns if asked, but prioritize simplified engineering explanations for investors.\n"
            "4. NEVER mention that you are an AI; act as the system's central nervous system."
        )

    # ─────────────────────────────────────────────────────────────────────────
    # STATUS & UTILITIES
    # ─────────────────────────────────────────────────────────────────────────

    def get_status(self) -> Dict[str, Any]:
        """Status report for the GUI."""
        return {
            "model_loaded": self.manager.is_running() and self.backend != "none",
            "backend": self.backend,
            "status": self.status,
            "model_name": self.active_model,
            "engine_path": str(self.manager.exe_path),
            "storage_path": str(OLLAMA_STORAGE),
            "capabilities": ["scpi_translation", "ai_heal", "anomaly_diagnosis", "agentic_control", "rf_chat"],
            "download": {"active": False, "status": "Ready (Portable Engine Active)"}
        }

    def is_available(self) -> bool:
        return self.manager.is_running()

# Global Singleton
ai_copilot = AICopilotApex()
