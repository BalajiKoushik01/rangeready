import importlib
import os
import inspect
from typing import Dict, Type
from .base_driver import BaseInstrumentDriver

class PluginManager:
    """
    Universal Instrument Plugin Engine.
    Dynamically discovers and loads instrument drivers in the 'backend/drivers' directory.
    Replicates the 'OpenTAP' modularity of Keysight PathWave.
    """
    
    _drivers: Dict[str, Type[BaseInstrumentDriver]] = {}

    @classmethod
    def load_plugins(cls):
        """Discovers all .py files in drivers/ and registers classes inheriting from BaseInstrumentDriver."""
        drivers_path = os.path.dirname(__file__)
        for filename in os.listdir(drivers_path):
            if filename.endswith(".py") and filename not in ["__init__.py", "base_driver.py"]:
                module_name = f"backend.drivers.{filename[:-3]}"
                try:
                    module = importlib.import_module(module_name)
                    # Register classes
                    for name, obj in inspect.getmembers(module):
                        if inspect.isclass(obj) and issubclass(obj, BaseInstrumentDriver) and obj is not BaseInstrumentDriver:
                            cls._drivers[name] = obj
                            print(f"DEBUG: Discovered Driver: {name}")
                except Exception as e:
                    print(f"ERROR: Failed to load driver {filename}: {e}")

    @classmethod
    def get_driver(cls, name: str) -> BaseInstrumentDriver:
        """Instantiates a requested driver by name."""
        if name in cls._drivers:
            return cls._drivers[name]()
        raise ValueError(f"Driver '{name}' not found in registry.")

    @classmethod
    def list_drivers(cls):
        return list(cls._drivers.keys())

# Auto-load on import for this session
PluginManager.load_plugins()
