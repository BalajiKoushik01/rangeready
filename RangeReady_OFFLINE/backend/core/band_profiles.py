from pydantic import BaseModel
from typing import Dict, Optional

class BandProfile(BaseModel):
    name: str # e.g. "S-Band"
    min_freq_hz: int
    max_freq_hz: int
    default_center_freq_hz: int
    default_span_hz: int
    max_safe_power_dbm: float
    description: Optional[str] = ""

class BandManager:
    _profiles: Dict[str, BandProfile] = {}

    @classmethod
    def load_defaults(cls):
        s_band = BandProfile(
            name="S-Band",
            min_freq_hz=2000000000,
            max_freq_hz=4000000000,
            default_center_freq_hz=3000000000,
            default_span_hz=2000000000,
            max_safe_power_dbm=10.0,
            description="2-4 GHz active phase array testing"
        )
        x_band = BandProfile(
            name="X-Band",
            min_freq_hz=8000000000,
            max_freq_hz=12000000000,
            default_center_freq_hz=10000000000,
            default_span_hz=4000000000,
            max_safe_power_dbm=10.0,
            description="8-12 GHz standard military radar"
        )
        cls._profiles["S-Band"] = s_band
        cls._profiles["X-Band"] = x_band

    @classmethod
    def get_profile(cls, name: str) -> BandProfile:
        return cls._profiles.get(name)

    @classmethod
    def list_profiles(cls):
        return list(cls._profiles.keys())

BandManager.load_defaults()
