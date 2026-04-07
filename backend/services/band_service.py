from typing import Dict, Any, List

class BandProfile:
    def __init__(self, name: str, min_freq_hz: float, max_freq_hz: float, 
                 max_power_dbm: float, default_span_hz: float, default_rbw_hz: float):
        self.name = name
        self.min_freq_hz = min_freq_hz
        self.max_freq_hz = max_freq_hz
        self.max_power_dbm = max_power_dbm
        self.default_span_hz = default_span_hz
        self.default_rbw_hz = default_rbw_hz

class BandService:
    """
    Manages global frequency bands (L, S, C, X, Ku) to limit UI inputs dynamically
    and provide safe defaults for test sequence generation.
    """
    
    _bands = {
        "UHF": BandProfile("UHF", 3e8, 1e9, 20.0, 100e6, 100e3),
        "L-Band": BandProfile("L-Band", 1e9, 2e9, 10.0, 500e6, 300e3),
        "S-Band": BandProfile("S-Band", 2e9, 4e9, 10.0, 1e9, 1e6),
        "C-Band": BandProfile("C-Band", 4e9, 8e9, 0.0, 2e9, 3e6),
        "X-Band": BandProfile("X-Band", 8e9, 12e9, 0.0, 2e9, 3e6),
        "Ku-Band": BandProfile("Ku-Band", 12e9, 18e9, -10.0, 3e9, 5e6),
    }

    @classmethod
    def get_all_bands(cls) -> List[str]:
        return list(cls._bands.keys())

    @classmethod
    def get_band_profile(cls, name: str) -> Dict[str, Any]:
        """Returns the safe operating bounds for a specific RF band."""
        if name not in cls._bands:
            raise KeyError(f"Band '{name}' not found. Available: {cls.get_all_bands()}")
            
        profile = cls._bands[name]
        return {
            "name": profile.name,
            "min_freq_hz": profile.min_freq_hz,
            "max_freq_hz": profile.max_freq_hz,
            "max_power_dbm": profile.max_power_dbm,
            "default_span_hz": profile.default_span_hz,
            "default_rbw_hz": profile.default_rbw_hz
        }

    @classmethod
    def validate_parameters(cls, band_name: str, freq_hz: float, power_dbm: float) -> bool:
        """Validates if a given setup is within the safe limits for a specific band."""
        if band_name not in cls._bands:
            return False
            
        profile = cls._bands[band_name]
        
        # Check frequency bounds
        if not (profile.min_freq_hz <= freq_hz <= profile.max_freq_hz):
            return False
            
        # Check power limits (critical for preventing LNA/PA damage)
        if power_dbm > profile.max_power_dbm:
            return False
            
        return True
