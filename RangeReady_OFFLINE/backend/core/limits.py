from pydantic import BaseModel
from typing import Dict, List, Optional, Any

class ParameterLimit(BaseModel):
    parameter_name: str
    lower_limit: Optional[float] = None
    upper_limit: Optional[float] = None
    unit: str

class LimitEngine:
    @staticmethod
    def evaluate(value: float, config: ParameterLimit) -> bool:
        if config.lower_limit is not None and value < config.lower_limit:
            return False
        if config.upper_limit is not None and value > config.upper_limit:
            return False
        return True

    @staticmethod
    def evaluate_array(values: List[float], config: ParameterLimit) -> Dict[str, Any]:
        """Evaluates an array of values (like a sweep trace) against limits."""
        failures = []
        for i, val in enumerate(values):
            if not LimitEngine.evaluate(val, config):
                failures.append(i)
                
        return {
            "pass": len(failures) == 0,
            "failure_indices": failures,
            "min_margin_db": None # Calculate min distance to limit here if needed
        }
