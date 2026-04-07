from typing import List

class CustomCalibrationEngine:
    """
    Handles manual/custom calibration flow without relying on physical calibration kit hardware logic.
    Calculates error coefficients from raw measurements of known standards.
    """
    def __init__(self):
        self.coefficients = {}
        
    def calculate_normalization(self, reference_trace: List[float], measured_trace: List[float]) -> List[float]:
        """Calculates simple vector subtraction normalization (Data / Mem) in dB."""
        if len(reference_trace) != len(measured_trace):
            raise ValueError("Trace lengths must match for normalization.")
            
        correction = [ref - meas for ref, meas in zip(reference_trace, measured_trace)]
        return correction
        
    def apply_correction(self, raw_trace: List[float], correction: List[float]) -> List[float]:
        """Applies previously calculated correction factor."""
        if len(raw_trace) != len(correction):
            raise ValueError("Trace length must match correction length.")
            
        return [raw + corr for raw, corr in zip(raw_trace, correction)]
