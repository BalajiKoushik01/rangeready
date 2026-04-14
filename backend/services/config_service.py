"""
FILE: services/config_service.py
ROLE: Central State & Persistence Orchestrator.
TRIGGERS: All backend services and routers.
TARGETS: backend/config.json.
DESCRIPTION: Manages application-wide settings (Simulation, Discovery, Blacklists) and persists them to disk.
"""
import json
import os
from typing import Dict, Any, Optional

CONFIG_FILE = "config.json"

class ConfigService:
    def __init__(self, config_path: str = CONFIG_FILE):
        self.config_path = config_path
        self._config: Dict[str, Any] = {
            "Signal Generator": "192.168.1.141",
            "Spectrum Analyzer": "192.168.1.142",
            "simulation_mode": False,
            "discovery_active": True,
            "discovery_stop_after_one": False,
            "blacklisted_ips": []
        }
        self.load_config()

    def load_config(self):
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r") as f:
                    data = json.load(f)
                    self._config.update(data)
            except Exception as e:
                print(f"Error loading config: {e}")
        else:
            self.save_config()

    def save_config(self):
        try:
            with open(self.config_path, "w") as f:
                json.dump(self._config, f, indent=4)
        except Exception as e:
            print(f"Error saving config: {e}")

    def get_instrument_ip(self, role: str) -> str:
        """
        RESOLVER PRIORITY:
        1. Active Instrument from Database (AssetService)
        2. Explicit override in config.json
        """
        from backend.services.asset_service import asset_service
        # DB first (Industrial dynamic behavior)
        active = asset_service.get_active_instrument(role)
        if active:
            return active.address
            
        # Fallback to local config
        return self._config.get(role, "")

    def set_instrument_ip(self, role: str, ip: str):
        self._config[role] = ip
        self.save_config()
        
    def is_simulation_mode(self) -> bool:
        return self._config.get("simulation_mode", False)
        
    def set_simulation_mode(self, enabled: bool):
        self._config["simulation_mode"] = enabled
        self.save_config()

    def get_all_instruments(self) -> Dict[str, Any]:
        return self._config.copy()

    def set_discovery_status(self, active: bool):
        self._config["discovery_active"] = active
        self.save_config()

    def set_discovery_mode(self, stop_after_one: bool):
        self._config["discovery_stop_after_one"] = stop_after_one
        self.save_config()

    def add_to_blacklist(self, ip: str):
        if ip not in self._config["blacklisted_ips"]:
            self._config["blacklisted_ips"].append(ip)
            self.save_config()

    def get_blacklist(self) -> list:
        return self._config.get("blacklisted_ips", [])

config_service = ConfigService()
