import importlib
"""
FILE: drivers/plugin_manager.py
ROLE: Dynamic Hardware Driver Orchestrator.
TRIGGERS: All command routers (commands.py) and StatusPoller.
TARGETS: All driver files in backend/drivers/.
DESCRIPTION: Implements a Registry/Factory pattern to hot-load and serve instrument drivers based on model strings.
"""
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
        package_name = __name__.rsplit('.', 1)[0]
        
        for filename in os.listdir(drivers_path):
            if filename.endswith(".py") and filename not in ["__init__.py", "base_driver.py", "plugin_manager.py", "manifest_loader.py"]:
                module_name = f".{filename[:-3]}"
                try:
                    module = importlib.import_module(module_name, package=package_name)
                    # Register classes
                    for name, obj in inspect.getmembers(module):
                        if inspect.isclass(obj) and issubclass(obj, BaseInstrumentDriver) and obj is not BaseInstrumentDriver:
                            cls._drivers[name] = obj
                            print(f"DEBUG: Discovered Driver: {name}")
                except Exception as e:
                    print(f"ERROR: Failed to load driver {filename}: {e}")

    @classmethod
    def get_driver(cls, name: str, simulation: bool = False) -> BaseInstrumentDriver:
        """Instantiates a requested driver by name with optional simulation mode."""
        if name in cls._drivers:
            return cls._drivers[name](simulation=simulation)
        raise ValueError(f"Driver '{name}' not found in registry.")

    @classmethod
    def list_drivers(cls):
        return list(cls._drivers.keys())

# Auto-load on import for this session
PluginManager.load_plugins()
