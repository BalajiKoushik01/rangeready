import json
import os
from typing import Dict, Any

CONFIG_FILE = "config.json"

class ConfigService:
    def __init__(self, config_path: str = CONFIG_FILE):
        self.config_path = config_path
        self._config: Dict[str, Any] = {
            "Signal Generator": "192.168.1.141",
            "Spectrum Analyzer": "192.168.1.142"
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
        return self._config.get(role, "")

    def set_instrument_ip(self, role: str, ip: str):
        self._config[role] = ip
        self.save_config()
        
    def get_all_instruments(self) -> Dict[str, str]:
        return self._config.copy()

config_service = ConfigService()
