import numpy as np
from typing import List, Dict, Any, Optional

class AnomalyDetector:
    """
    Identifies statistical outliers and glitches in RF trace data.
    """
    @staticmethod
    def detect_spikes(amplitudes: List[float], threshold_sigma: float = 3.5) -> List[int]:
        """
        Detects sudden spikes using a rolling Z-score or simple deviation check.
        Returns indices of anomalies.
        """
        data = np.array(amplitudes)
        mean = np.mean(data)
        std = np.std(data)
        
        if std == 0: return []
        
        z_scores = np.abs((data - mean) / std)
        anomalies = np.where(z_scores > threshold_sigma)[0]
        
        return anomalies.tolist()

    @staticmethod
    def check_noise_floor(amplitudes: List[float], target_floor: float = -40.0) -> bool:
        """
        Checks if the average noise floor is within expected ISRO-range.
        """
        avg = np.mean(amplitudes)
        return avg <= target_floor

class TraceMathEngine:
    """
    Performs vectorized trace operations (Normalization, Golden Sample Diff).
    """
    @staticmethod
    def compute_diff(live_amps: List[float], golden_amps: List[float]) -> List[float]:
        """
        Computes (Live - Golden) to highlight manufacturing variance.
        """
        live = np.array(live_amps)
        golden = np.array(golden_amps)
        
        # Ensure lengths match for diffing
        if len(live) != len(golden):
            return live.tolist()
            
        return (live - golden).tolist()

    @staticmethod
    def normalize(amplitudes: List[float], ref_level: float = 0.0) -> List[float]:
        """
        Normalizes the trace to a reference level (e.g., for Gain measurements).
        """
        data = np.array(amplitudes)
        offset = ref_level - np.max(data)
        return (data + offset).tolist()
