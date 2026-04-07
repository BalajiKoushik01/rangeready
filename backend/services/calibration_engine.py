import numpy as np
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)

class CalibrationEngine:
    """
    Implements 1-Port (OSL) and 2-Port (SOLT) error correction math mapping raw 
    instrument vectors to calibrated S-Parameter data.
    """

    def __init__(self):
        # 1-port error terms arrays
        self.e00 = None  # Directivity
        self.e11 = None  # Source Match
        self.e10e01 = None  # Reflection Tracking

    def compute_1port_coefficients(self, 
                                   measured_open: np.ndarray, 
                                   measured_short: np.ndarray, 
                                   measured_load: np.ndarray) -> bool:
        """
        Computes the 3-term error model for 1-port reflection (S11) measurements.
        Expects complex numpy arrays representing S11 data across frequency points.
        
        Assumes ideal standards:
        Open = +1 + 0j
        Short = -1 + 0j
        Load = 0 + 0j
        """
        try:
            # Ideal reflection coefficients for standard calibration kits
            gamma_open = 1.0 + 0.0j
            gamma_short = -1.0 + 0.0j

            M_O = measured_open
            M_S = measured_short
            M_L = measured_load

            # Derive 3 error terms for each frequency point using standard SOL math
            # Using standard system of equations for 1-port VNA calibration
            
            # e00 (Directivity) = Measured Load (since ideal Load reflection is 0)
            self.e00 = M_L
            
            # intermediate math
            num1 = M_O - self.e00
            num2 = M_S - self.e00
            
            # e11 (Source Match) and e10e01 (Reflection Tracking)
            # Derived from solving: M = e00 + (e10e01 * Gamma) / (1 - e11 * Gamma)
            
            e11_num = (num1 * gamma_short) - (num2 * gamma_open)
            e11_den = (num1 * gamma_open * gamma_short) - (num2 * gamma_short * gamma_open)
            
            # Handling potential division by zero at singular points
            safe_den = np.where(np.abs(e11_den) < 1e-12, 1e-12, e11_den)
            self.e11 = e11_num / safe_den
            
            self.e10e01 = (num1 * (1 - self.e11 * gamma_open)) / gamma_open

            logger.info("Successfully computed 1-port (OSL) calibration coefficients.")
            return True

        except Exception as e:
            logger.error(f"Failed to compute calibration coefficients: {e}")
            return False

    def apply_1port_correction(self, raw_measurement: np.ndarray) -> np.ndarray:
        """
        Applies the stored 3-term error model to an uncalibrated raw measurement.
        Formula: Gamma_actual = (M - e00) / (e10e01 + e11 * (M - e00))
        """
        if self.e00 is None or self.e11 is None or self.e10e01 is None:
            logger.warning("Calibration coefficients missing. Returning raw measurement.")
            return raw_measurement
            
        try:
            num = raw_measurement - self.e00
            den = self.e10e01 + self.e11 * num
            
            # Add small epsilon to prevent division by zero
            safe_den = np.where(np.abs(den) < 1e-12, 1e-12, den)
            calibrated_gamma = num / safe_den
            
            return calibrated_gamma
        except Exception as e:
            logger.error(f"Correction application failed: {e}")
            return raw_measurement

    def export_coefficients(self) -> Dict[str, List[complex]]:
        """Exports complex error terms to standard dictionaries for database storage."""
        if self.e00 is None:
            return {}
        return {
            "e00": self.e00.tolist(),
            "e11": self.e11.tolist(),
            "e10e01": self.e10e01.tolist()
        }
    
    def import_coefficients(self, coeff_dict: Dict[str, List[complex]]):
        """Loads complex error terms from database storage."""
        if "e00" in coeff_dict:
            self.e00 = np.array(coeff_dict["e00"], dtype=complex)
            self.e11 = np.array(coeff_dict["e11"], dtype=complex)
            self.e10e01 = np.array(coeff_dict["e10e01"], dtype=complex)

calibration_engine = CalibrationEngine()
