import asyncio
import numpy as np
from sqlalchemy.orm import Session
from models.test_session import TestSession, TestStep
from services.analysis_engine import RFAnalysisEngine
import json
from typing import Tuple, List, Dict, Any, Optional

class TestRunner:
    """
    Orchestrates the execution of a test session.
    Manages the lifecycle from Pending to Completed.
    """

    def __init__(self, session_id: int, db: Session, websocket_manager=None):
        self.session_id = session_id
        self.db = db
        self.websocket_manager = websocket_manager
        self.engine = RFAnalysisEngine()

    async def run(self):
        """
        Executes all steps in the test session.
        """
        session = self.db.query(TestSession).filter(TestSession.id == self.session_id).first()
        if not session:
            print(f"Session {self.session_id} not found.")
            return

        print(f"Starting test session {self.session_id} for DUT {session.dut_name}...")
        
        overall_pass = True
        
        for step in session.steps:
            print(f"Running Step {step.step_number}: {step.name}")
            
            # 1. Update status via WebSocket (Step Start)
            if self.websocket_manager:
                await self.websocket_manager.broadcast({
                    "type": "step_start",
                    "step_id": step.id,
                    "step_name": step.name
                })

            # 2. Simulate/Fetch Trace Data (Mocking for now)
            # In a real system, this would call SiglentSA.fetch_sweep_result()
            freqs, amplitudes = self._generate_mock_data(step)
            
            # 3. Analyze results
            metrics = self.engine.extract_metrics(freqs, amplitudes, step.measurement_type)
            is_pass = self.engine.pass_fail_check(amplitudes, step.upper_limit, step.lower_limit)
            
            if not is_pass:
                overall_pass = False

            # 4. Save results to the database
            step.frequencies_hz = freqs.tolist()
            step.amplitudes_db = amplitudes.tolist()
            # Result value: extract from metrics (e.g., Min S11 or average Gain)
            step.result_value = metrics.get("min_value") if "min_value" in metrics else metrics.get("max_value")
            step.pass_fail = is_pass
            
            self.db.commit()

            # 5. Update UI via WebSocket (Step Complete)
            if self.websocket_manager:
                await self.websocket_manager.broadcast({
                    "type": "step_complete",
                    "step_id": step.id,
                    "pass_fail": is_pass,
                    "metrics": metrics,
                    "trace": {
                        "freqs": freqs.tolist(),
                        "amps": amplitudes.tolist()
                    }
                })
            
            # Simulate actual instrument sweep time (1-2 seconds)
            await asyncio.sleep(1.5)

        # 6. Finalize session
        session.overall_result = "PASS" if overall_pass else "FAIL"
        self.db.commit()
        
        if self.websocket_manager:
            await self.websocket_manager.broadcast({
                "type": "session_complete",
                "session_id": self.session_id,
                "overall_result": session.overall_result
            })

    def _generate_mock_data(self, step: TestStep) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generates realistic RF traces for demonstration.
        """
        freqs = np.linspace(step.start_freq_hz, step.stop_freq_hz, step.points)
        
        if step.measurement_type.upper() in ["S11", "VSWR", "RETURN_LOSS"]:
            # Lorentzian dip for antenna match + noise floor
            f_center = (step.start_freq_hz + step.stop_freq_hz) / 2
            span = step.stop_freq_hz - step.start_freq_hz
            q = 10.0 # Quality factor
            
            dip = -15.0 / (1 + (2 * q * (freqs - f_center) / f_center)**2)
            noise = np.random.normal(-35, 1, step.points)
            # Combine
            amps = -10 + dip + (noise / 10)
            
        elif step.measurement_type.upper() in ["S21", "GAIN", "INSERTION_LOSS"]:
            # Flat response with some ripple + bandwidth rolloff
            f_center = (step.start_freq_hz + step.stop_freq_hz) / 2
            span = step.stop_freq_hz - step.start_freq_hz
            
            # Bandpass-ish roll-off
            rolloff = -3.0 * ((freqs - f_center) / (span/2))**4
            ripple = 0.5 * np.sin(2 * np.pi * 5 * (freqs - step.start_freq_hz) / span)
            amps = rolloff + ripple - 1.0 # -1dB nominal loss
            
        else:
            amps = np.random.normal(-20, 2, step.points)
            
        return freqs, amps
