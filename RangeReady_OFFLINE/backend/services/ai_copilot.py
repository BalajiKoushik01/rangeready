import os
import logging
from typing import Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class AICopilot:
    """
    Offline Intelligence Engine for RangeReady.
    Uses llama-cpp-python to run a quantized local LLM without internet access.
    Option A: Bundled GGUF integration.
    """
    
    def __init__(self, model_filename: str = "gemma-2-2b-it.Q4_K_M.gguf"):
        self.model_filename = model_filename
        self.model_path = Path(__file__).parent.parent / "models" / self.model_filename
        self.llm = None
        self._initialize_engine()

    def _initialize_engine(self):
        """Attempts to load the local LLM into memory."""
        try:
            # We delay import so the app doesn't crash if llama-cpp is not installed 
            # during basic CI/CD or non-AI environments
            from llama_cpp import Llama
            
            if self.model_path.exists():
                logger.info(f"Loading local AI model from {self.model_path}...")
                self.llm = Llama(
                    model_path=str(self.model_path),
                    n_ctx=2048,  # Context window
                    n_threads=4, # CPU Cores
                    verbose=False
                )
                logger.info("Local AI Engine Initialized successfully.")
            else:
                logger.warning(
                    f"AI model {self.model_filename} not found at {self.model_path}. "
                    "AI features will operate in simulated fallback mode until model is downloaded."
                )
        except ImportError:
            logger.warning("llama-cpp-python is not installed. AI features in fallback mode.")
        except Exception as e:
            logger.error(f"Failed to initialize AI Engine: {e}")

    def diagnose_trace_anomaly(self, test_name: str, limits: Dict[str, float], actual_val: float, band: str) -> str:
        """
        Diagnoses an RF measurement failure. If the offline model is loaded, generates 
        a technical explanation. Otherwise returns a standard fallback string.
        """
        prompt = f"""
        You are an expert RF Test Engineer. A TR Module failed a measurement in {band}.
        Test: {test_name}
        Expected Limit: {limits}
        Actual Measured: {actual_val}
        Provide a concise 1-2 sentence engineering hypothesis explaining why this might have occurred (e.g. thermal issues, VSWR mismatch, LO leakage).
        """
        
        if self.llm:
            try:
                response = self.llm(
                    f"<start_of_turn>user\n{prompt}<end_of_turn>\n<start_of_turn>model\n",
                    max_tokens=60,
                    stop=["<end_of_turn>"]
                )
                return response['choices'][0]['text'].strip()
            except Exception as e:
                logger.error(f"LLM inference failed: {e}")
                
        # Fallback if no LLM is loaded
        diff = actual_val - list(limits.values())[0] if limits else 0
        return f"Anomaly detected ({diff:.2f} offset). Check for potential component mismatch, thermal drift, or connection VSWR issues at {band}."

    def scpi_assistant(self, query: str) -> str:
        """
        Conversational assistant translating natural language to SCPI commands.
        """
        if not self.llm:
            return "SCPI Copilot is offline. Please install the local AI model (GGUF) to enable natural language programming."
            
        system_prompt = "You are a SCPI programming assistant for Keysight and Siglent instruments. Provide ONLY the SCPI command requested, without explanation."
        
        prompt = f"<start_of_turn>user\n{system_prompt}\nQuery: {query}<end_of_turn>\n<start_of_turn>model\n"
        try:
            response = self.llm(prompt, max_tokens=100, stop=["<end_of_turn>"])
            return response['choices'][0]['text'].strip()
        except Exception as e:
            return f"SCPI generation failed: {e}"

# Global singleton
ai_copilot = AICopilot()
