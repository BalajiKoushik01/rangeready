import numpy as np
from typing import List, Dict, Optional, Any

class RFAnalysisEngine:
    """
    Advanced RF Trace Analysis Engine.
    Implements automated marker logic found in high-end Anritsu and Keysight analyzers.
    """

    @staticmethod
    def find_peak(trace: List[Dict[str, float]]) -> Optional[Dict[str, float]]:
        """Finds the maximum amplitude point in a trace."""
        if not trace: return None
        amps = [p['amp'] for p in trace]
        max_idx = np.argmax(amps)
        return trace[max_idx]

    @staticmethod
    def calculate_bandwidth(trace: List[Dict[str, float]], db_down: float = 3.0) -> Dict[str, Any]:
        """
        Calculates the bandwidth at X dB down from the peak.
        Address the automated Filter/Antenna analysis requirement.
        """
        if not trace: return {"bw": 0, "center": 0, "q_factor": 0}
        
        peak = RFAnalysisEngine.find_peak(trace)
        threshold = peak['amp'] - db_down
        
        # Find points crossing the threshold
        freqs = np.array([p['freq'] for p in trace])
        amps = np.array([p['amp'] for p in trace])
        
        crossings = np.where(np.diff((amps >= threshold).astype(int)) != 0)[0]
        
        if len(crossings) >= 2:
            f1 = freqs[crossings[0]]
            f2 = freqs[crossings[-1]]
            bw = abs(f2 - f1)
            center = (f1 + f2) / 2
            q_factor = center / bw if bw > 0 else 0
            return {
                "bw": bw,
                "center": center,
                "q_factor": q_factor,
                "f1": f1,
                "f2": f2,
                "peak_amp": peak['amp']
            }
        
        return {"bw": 0, "center": 0, "q_factor": 0}

    @staticmethod
    def calculate_vswr(return_loss_db: float) -> float:
        """Converts Return Loss (dB) to VSWR."""
        reflection_coeff = 10**(-abs(return_loss_db) / 20)
        if reflection_coeff >= 1: return 99.9
        return (1 + reflection_coeff) / (1 - reflection_coeff)
