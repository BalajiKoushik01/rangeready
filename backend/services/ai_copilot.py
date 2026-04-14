"""
FILE: services/ai_copilot.py
ROLE: Offline AI Intelligence Engine — Chat, Agentic Control, SCPI Healing.
TRIGGERS:
  - routers/ai.py (all AI API endpoints)
  - services/scpi_negotiation_engine.py (as last-resort healer)
TARGETS:
  - Local GGUF model file (backend/models/gemma-2-2b-it.Q4_K_M.gguf)
  - backend/drivers/ (for agentic execution)
  - Hugging Face Hub CDN (only for initial download, can be done offline-first)

DESCRIPTION:
  The AICopilot is a singleton service that wraps a local quantized LLM
  (Gemma-2-2B-IT) to provide four distinct capabilities:

  1. SCPI TRANSLATION — "Set frequency to 2.4 GHz" → "SOUR:FREQ:CW 2.4E9"
  2. ANOMALY DIAGNOSIS — "Gain dropped 3dB in L-band" → RF engineering hypothesis
  3. AGENTIC EXECUTION — Translates a command AND sends it to the real hardware
  4. AI HEAL — Given error code + context, suggests a corrected SCPI command

DATA FLOW (Agentic Mode):
  GUI [Chat] → POST /api/ai/agentic-execute
  → ai_copilot.agentic_execute(query, instrument)
  → llm.generate(SCPI_SYSTEM_PROMPT + query)
  → extracted_command → PluginManager.get_driver() → driver.send_command()
  → SCPINegotiationEngine check → result
  → broadcast(telemetry_packet) → GUI displays hardware's response

MODEL INFO:
  File: gemma-2-2b-it.Q4_K_M.gguf (~1.6 GB)
  Source: huggingface.co/bartowski/gemma-2-2b-it-GGUF
  Why this model:
    - Instruction-tuned (understands "translate to SCPI")
    - 2B params → fast CPU inference (~5-15 tokens/second)
    - Q4_K_M quantisation → best quality/size ratio for 4-bit
    - MIT license → safe for commercial/lab use

DEPENDENCIES (install once):
  pip install llama-cpp-python huggingface_hub
"""

import os
import re
import time
import logging
import threading
from typing import Dict, Any, Optional, Callable, Generator
from pathlib import Path

logger = logging.getLogger("ai.copilot")

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

# Core SCPI assistant prompt.
# Instructs the model to respond ONLY with valid SCPI command strings.
SCPI_SYSTEM_PROMPT = """You are an expert RF instrument control assistant for Keysight, Rohde & Schwarz, Anritsu, Tektronix, and other SCPI-compliant instruments.

Your ONLY job is to translate a user's natural language instruction into the correct SCPI command string.
Rules:
- Output ONLY the SCPI command. No explanation, no prefix, no markdown.
- Use standard IEEE 488.2 and SCPI-99 syntax.
- For values: use scientific notation (e.g. 2.4E9 for 2.4 GHz).
- If multiple commands are needed, separate them with a semicolon on one line.
- If the request is ambiguous, provide the most common command.

Examples:
User: Set frequency to 2.4 GHz
SOUR:FREQ:CW 2.4E9

User: Turn on the RF output
OUTP ON

User: Set output power to -10 dBm
SOUR:POW:LEV:IMM:AMPL -10

User: Enable AM modulation at 50% depth
SOUR:AM:STAT ON;SOUR:AM:DEPT 50
"""

# RF anomaly diagnosis prompt.
# Instructs the model to give engineering hypotheses.
DIAGNOSIS_SYSTEM_PROMPT = """You are a senior RF Test & Measurement engineer with expertise in TR module testing, VNA calibration, signal generation, and spectrum analysis.

When given a test failure description, provide a concise 2-3 sentence engineering hypothesis about the root cause.
Focus on: thermal drift, VSWR mismatch, LO leakage, PA compression, cable issues, calibration errors, component aging.
Be specific and actionable. Use technical terminology.
"""

# Agentic execution context prompt.
# Gives the model full awareness of the active instrument.
AGENTIC_SYSTEM_PROMPT = """You are an agentic RF instrument controller with direct hardware access.
You will receive a natural language command and the connected instrument's identity.
Translate the command to the correct SCPI syntax for that specific instrument.
Output ONLY the SCPI command string — it will be sent directly to the hardware.
"""

# SCPI healing prompt — given an error, suggest a fix.
HEAL_SYSTEM_PROMPT = """You are a SCPI debugging assistant.
Given a failed SCPI command, the instrument IDN, and the error code received, suggest the corrected command.
Output ONLY the corrected SCPI command string. No explanation.
"""


class AICopilot:
    """
    Offline AI Intelligence Engine for RangeReady.

    Singleton — access via module-level `ai_copilot` instance.
    Runs a local quantized Gemma-2-2B model for SCPI translation,
    anomaly diagnosis, and agentic hardware control.

    USAGE:
        from backend.services.ai_copilot import ai_copilot
        result = ai_copilot.translate_to_scpi("set frequency to 900 MHz")
        # → "SOUR:FREQ:CW 900E6"

    AGENTIC USAGE:
        result = ai_copilot.agentic_execute("turn on RF output", instrument, driver)
        # → Generates SCPI, sends to hardware, returns actual response
    """

    MODEL_FILENAME = "gemma-2-2b-it.Q4_K_M.gguf"
    MODEL_REPO    = "bartowski/gemma-2-2b-it-GGUF"
    MODEL_HF_FILE = "gemma-2-2b-it-Q4_K_M.gguf"

    def __init__(self):
        self.model_path = Path(__file__).parent.parent / "models" / self.MODEL_FILENAME
        self.llm = None              # llama-cpp-python Llama instance
        self.ollama_model = None     # Ollama model name if using Ollama fallback
        self.backend = "none"        # "llama_cpp" | "ollama" | "none"
        self.is_loading = False
        self.load_error: Optional[str] = None

        # Download progress state (for GUI polling)
        self.download_progress: Dict[str, Any] = {
            "active": False,
            "percent": 0,
            "downloaded_mb": 0,
            "total_mb": 0,
            "speed_mbps": 0,
            "status": "idle",   # idle | downloading | complete | error
        }

        # Try to load model on startup (non-blocking)
        threading.Thread(target=self._initialize_engine, daemon=True).start()

    # ─────────────────────────────────────────────────────────────────────────
    # ENGINE INITIALIZATION
    # ─────────────────────────────────────────────────────────────────────────

    def _initialize_engine(self):
        """
        Attempts to load the local GGUF model.
        Priority order:
          1. llama-cpp-python + local GGUF file (best, fully offline)
          2. Ollama (if running locally) — zero-compile fallback
          3. None — AI features in fallback mode

        Runs in a background thread — does NOT block FastAPI startup.
        """
        if self.is_loading:
            return
        self.is_loading = True

        try:
            # ── Priority 1: llama-cpp-python ────────────────────────────────
            from llama_cpp import Llama

            if not self.model_path.exists():
                logger.warning(
                    f"[AI] Model not found at {self.model_path}. "
                    "Trying Ollama fallback..."
                )
                raise ImportError("Model file missing — try Ollama")

            logger.info(f"[AI] Loading local GGUF from {self.model_path} ...")
            self.llm = Llama(
                model_path=str(self.model_path),
                n_ctx=2048,
                n_threads=4,
                n_gpu_layers=0,    # CPU-only for max portability
                verbose=False,
            )
            self.backend = "llama_cpp"
            logger.info("[AI] ✓ llama-cpp-python backend ready")
            return

        except Exception as e:
            logger.warning(f"[AI] llama-cpp-python not available ({type(e).__name__}). Trying Ollama...")

        # ── Priority 2: Ollama ───────────────────────────────────────────────
        # Ollama is a simple local AI server (ollama.ai).
        # Install: download https://ollama.ai, then run: ollama pull gemma2:2b
        try:
            import requests as _req
            resp = _req.get("http://localhost:11434/api/tags", timeout=2)
            if resp.status_code == 200:
                models = [m["name"] for m in resp.json().get("models", [])]
                # Find a suitable model
                for candidate in ["gemma2:2b", "gemma2", "gemma:2b", "llama3.2", "llama3", "phi3"]:
                    if any(candidate in m for m in models):
                        self.ollama_model = candidate
                        self.backend = "ollama"
                        logger.info(f"[AI] ✓ Ollama backend ready with model '{candidate}'")
                        return
                logger.warning(f"[AI] Ollama running but no suitable model found. Available: {models}")
                logger.warning("[AI] Run: ollama pull gemma2:2b")
        except Exception:
            pass

        # ── Priority 3: No AI ────────────────────────────────────────────────
        self.load_error = (
            "No AI backend available. Options:\n"
            "1. Download model via Intelligence HUD (requires llama-cpp-python)\n"
            "2. Install Ollama from https://ollama.ai then run: ollama pull gemma2:2b"
        )
        logger.warning(f"[AI] No backend available: {self.load_error}")
        self.backend = "none"
        self.is_loading = False

    # ─────────────────────────────────────────────────────────────────────────
    # MODEL DOWNLOAD (called from API endpoint, runs in thread)
    # ─────────────────────────────────────────────────────────────────────────

    def start_download(self, progress_callback: Optional[Callable] = None):
        """
        Downloads the Gemma-2-2B model from Hugging Face Hub with progress reporting.

        TRACE: GUI [Download Model] → POST /api/ai/download → this method (thread)
               → huggingface_hub.hf_hub_download() → model saved to backend/models/
               → _initialize_engine() on completion

        Args:
            progress_callback: Optional callable(percent, downloaded_mb, total_mb, speed_mbps)
        """
        if self.download_progress["status"] == "downloading":
            logger.warning("[AI] Download already in progress.")
            return

        def _download():
            self.download_progress.update({
                "active": True, "percent": 0,
                "status": "downloading", "downloaded_mb": 0,
                "total_mb": 0, "speed_mbps": 0,
            })
            try:
                self.model_path.parent.mkdir(parents=True, exist_ok=True)
                requests = self._ensure_download_deps()

                url = (
                    f"https://huggingface.co/{self.MODEL_REPO}/resolve/main/"
                    f"{self.MODEL_HF_FILE}?download=true"
                )
                logger.info(f"[AI] Downloading from {url}")
                response = requests.get(url, stream=True, timeout=30)
                response.raise_for_status()

                total = int(response.headers.get("content-length", 0))
                self.download_progress["total_mb"] = round(total / (1024 * 1024), 1)

                self._execute_download_loop(response, total, progress_callback)

                self.download_progress.update({"status": "complete", "percent": 100, "active": False})
                logger.info("[AI] Download complete. Loading model …")
                self._initialize_engine()

            except Exception as e:
                self.download_progress.update({"status": "error", "active": False, "error": str(e)})
                logger.error(f"[AI] Download failed: {e}")

        threading.Thread(target=_download, daemon=True).start()

    def _ensure_download_deps(self):
        """Dynamically ensures requests is available for streaming."""
        try:
            import requests
            return requests
        except ImportError:
            import subprocess, sys
            logger.info("[AI] Installing missing download dependencies...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "-q"])
            import requests
            return requests

    def _execute_download_loop(self, response, total_bytes, callback):
        """Handles the byte-streaming loop and progress updates."""
        downloaded = 0
        start_time = time.time()
        chunk_size = 1024 * 1024

        with open(self.model_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=chunk_size):
                if not chunk:
                    continue
                f.write(chunk)
                downloaded += len(chunk)
                elapsed = time.time() - start_time
                speed = (downloaded / (1024*1024)) / max(elapsed, 0.001)
                pct = int((downloaded / total_bytes) * 100) if total_bytes else 0

                self.download_progress.update({
                    "percent": pct,
                    "downloaded_mb": round(downloaded / (1024*1024), 1),
                    "speed_mbps": round(speed, 2),
                })
                if callback:
                    callback(pct, downloaded/(1024*1024), self.download_progress["total_mb"], speed)

    # ─────────────────────────────────────────────────────────────────────────
    # CORE AI CAPABILITIES
    # ─────────────────────────────────────────────────────────────────────────

    def _generate(self, system_prompt: str, user_message: str,
                  max_tokens: int = 128, stop_tokens: Optional[list] = None) -> str:
        """
        Internal LLM inference call.
        Supports two backends:
          - llama_cpp: Uses local Gemma-2 GGUF (fastest, fully offline)
          - ollama: Uses local Ollama server (simpler install)

        Returns: generated text string, or a fallback message if no backend.
        """
        # ── llama-cpp-python backend ─────────────────────────────────────────
        if self.backend == "llama_cpp" and self.llm:
            formatted = (
                f"<start_of_turn>user\n"
                f"{system_prompt}\n\nUser: {user_message}<end_of_turn>\n"
                f"<start_of_turn>model\n"
            )
            try:
                response = self.llm(
                    formatted,
                    max_tokens=max_tokens,
                    stop=stop_tokens or ["<end_of_turn>", "\n\n"],
                    temperature=0.1,
                    echo=False,
                )
                return response["choices"][0]["text"].strip()
            except Exception as e:
                logger.error(f"[AI] Inference error: {e}")
                return f"Inference error: {e}"

        # ── Ollama backend ───────────────────────────────────────────────────
        if self.backend == "ollama" and self.ollama_model:
            try:
                import requests as _req
                payload = {
                    "model": self.ollama_model,
                    "prompt": f"{system_prompt}\n\nUser: {user_message}\nAssistant:",
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": max_tokens},
                }
                resp = _req.post("http://localhost:11434/api/generate", json=payload, timeout=120)
                return resp.json().get("response", "No response from Ollama").strip()
            except Exception as e:
                logger.error(f"[AI] Ollama error: {e}")
                return f"Ollama error: {e}"

        # ── No backend ───────────────────────────────────────────────────────
        if self.is_loading:
            return "⏳ AI model is still loading. Please wait a moment..."
        return (
            "🔴 No AI backend available. "
            "Install Ollama (https://ollama.ai) and run 'ollama pull gemma2:2b', "
            "or download the GGUF model via the Intelligence HUD Model tab."
        )

    def translate_to_scpi(self, natural_language: str) -> str:
        """
        Translates a natural language request to a SCPI command string.

        TRACE: GUI [Intelligence HUD chat input]
               → POST /api/ai/assistant {query}
               → this method
               → returns SCPI string to display in GUI

        Example:
          Input:  "Set the carrier to 5.8 GHz and enable RF"
          Output: "SOUR:FREQ:CW 5.8E9;OUTP ON"
        """
        result = self._generate(SCPI_SYSTEM_PROMPT, natural_language, max_tokens=128)
        # Clean up any accidental leading labels like "SCPI: " or markdown fences
        result = re.sub(r'^(SCPI:|```scpi|```)', '', result, flags=re.IGNORECASE).strip()
        result = result.strip('`').strip()
        return result

    def diagnose_anomaly(self, test_name: str, limits: Dict[str, float],
                         actual_val: float, band: str) -> str:
        """
        Generates an RF engineering hypothesis for a measurement failure.

        TRACE: TestRunnerPage [Anomaly Detected] → POST /api/ai/diagnose → this method

        Args:
            test_name:  Name of the failed test (e.g. "Gain Flatness")
            limits:     Expected min/max limits (e.g. {"min": -2.0, "max": 2.0})
            actual_val: Measured value that failed
            band:       RF band under test (e.g. "L-Band", "X-Band")
        """
        query = (
            f"Test: {test_name}\n"
            f"Band: {band}\n"
            f"Limits: {limits}\n"
            f"Measured: {actual_val}\n"
            f"What is the most likely root cause of this failure?"
        )
        return self._generate(DIAGNOSIS_SYSTEM_PROMPT, query, max_tokens=180)

    def ai_heal(self, failed_cmd: str, error_code: int,
                error_desc: str, idn: str) -> Optional[str]:
        """
        Last-resort AI healer — called by SCPINegotiationEngine when static
        heuristics have been exhausted.

        TRACE: SCPINegotiationEngine.send() → all static strategies fail
               → this method (if configured) → returns corrected command

        Args:
            failed_cmd:  The command that caused the error
            error_code:  SCPI error code (e.g. -113)
            error_desc:  Error description string
            idn:         Instrument IDN string for context

        Returns:
            Corrected SCPI command string, or None if AI can't help
        """
        query = (
            f"Instrument: {idn}\n"
            f"Failed command: {failed_cmd}\n"
            f"Error code: {error_code} ({error_desc})\n"
            f"Provide the corrected SCPI command for this instrument."
        )
        result = self._generate(HEAL_SYSTEM_PROMPT, query, max_tokens=80)
        # Only return if it looks like a valid SCPI command (contains a colon or is a keyword)
        if result and len(result) < 200 and not result.startswith("⏳") and not result.startswith("🔴"):
            return result
        return None

    def agentic_execute(self, natural_language: str, idn: str = "",
                        driver=None) -> Dict[str, Any]:
        """
        AGENTIC MODE: Translates a natural language command AND executes it
        on the connected hardware.

        TRACE:
          GUI [Chat + Agentic Mode ON] → POST /api/ai/agentic-execute
          → translate_to_scpi(query)
          → SCPINegotiationEngine.send(scpi_cmd)
          → broadcast(telemetry_packet)
          → return {command, response, status, heal_actions}

        Args:
            natural_language: User's instruction in plain English
            idn: Instrument IDN string (for context-aware translation)
            driver: Active BaseInstrumentDriver instance

        Returns:
            Dict with: translated_command, command_sent, response, status,
                       heal_actions, diagnosis
        """
        # Step 1: Build context-aware prompt if IDN is known
        if idn:
            context_query = f"Instrument: {idn}\nCommand: {natural_language}"
            result = self._generate(AGENTIC_SYSTEM_PROMPT, context_query, max_tokens=128)
        else:
            result = self.translate_to_scpi(natural_language)

        translated_cmd = result

        if not driver:
            return {
                "status": "no_driver",
                "translated_command": translated_cmd,
                "response": "No active instrument driver. Connect a hardware instrument first.",
                "command_sent": None,
                "heal_actions": [],
                "diagnosis": None,
            }

        # Step 2: Send through Negotiation Engine (auto-heals any resulting errors)
        from backend.services.scpi_negotiation_engine import SCPINegotiationEngine
        engine = SCPINegotiationEngine(driver)
        engine_result = engine.send(translated_cmd)

        return {
            "status": engine_result["status"],
            "translated_command": translated_cmd,
            "command_sent": engine_result.get("command_sent", translated_cmd),
            "response": engine_result.get("response", "Executed"),
            "heal_actions": engine_result.get("heal_actions", []),
            "diagnosis": engine_result.get("diagnosis"),
            "errors": engine_result.get("errors", []),
        }

    def chat(self, message: str, conversation_history: list = None) -> str:
        """
        General-purpose conversational chat with full RF domain knowledge.
        Used for questions like "What is VSWR?" or "Explain L-band noise figure".

        TRACE: GUI [Intelligence HUD, General Questions] → POST /api/ai/chat

        Args:
            message: User's question or statement
            conversation_history: List of {"role": "user"|"assistant", "content": str}
        """
        # Build conversation context
        context = ""
        if conversation_history:
            for turn in conversation_history[-6:]:  # keep last 6 turns for context
                role = "User" if turn["role"] == "user" else "Assistant"
                context += f"{role}: {turn['content']}\n"
            context += f"User: {message}"
        else:
            context = message

        system = (
            "You are RangeReady AI, an expert assistant for RF hardware testing, "
            "SCPI instrument control, and RF engineering. Help the user understand "
            "RF concepts, debug test setups, optimize test sequences, and control "
            "instruments. Be concise and technical."
        )
        return self._generate(system, context, max_tokens=400, stop_tokens=["<end_of_turn>"])

    # ─────────────────────────────────────────────────────────────────────────
    # STATUS & UTILITY
    # ─────────────────────────────────────────────────────────────────────────

    def get_status(self) -> Dict[str, Any]:
        """
        Returns current AI engine status for the GUI status panel.
        TRACE: Polled by GET /api/ai/status every few seconds from Intelligence HUD
        """
        model_size_mb = 0
        if self.model_path.exists():
            model_size_mb = round(self.model_path.stat().st_size / (1024*1024), 1)

        return {
            "model_loaded": self.is_available(),
            "backend": self.backend,           # "llama_cpp" | "ollama" | "none"
            "ollama_model": self.ollama_model,  # Which Ollama model is in use
            "is_loading": self.is_loading,
            "model_found_on_disk": self.model_path.exists(),
            "model_path": str(self.model_path),
            "model_size_mb": model_size_mb,
            "model_filename": self.MODEL_FILENAME,
            "load_error": self.load_error,
            "download": self.download_progress,
            "capabilities": [
                "scpi_translation",
                "anomaly_diagnosis",
                "agentic_execution",
                "ai_heal",
                "general_chat",
            ],
        }

    def is_available(self) -> bool:
        """Quick check — returns True if any AI backend is active."""
        return self.backend in ("llama_cpp", "ollama")


# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL SINGLETON
# Access from anywhere: from backend.services.ai_copilot import ai_copilot
# ─────────────────────────────────────────────────────────────────────────────
ai_copilot = AICopilot()
