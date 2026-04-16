"""
FILE: drivers/manifest_loader.py
ROLE: Local Asset Discovery & Registry Link.
TRIGGERS: PluginManager (during driver resolution).
TARGETS: backend/database.py (Queries registered instruments).
DESCRIPTION: Loads instrument metadata (IP, Driver Type) from the DB to initialize physical drivers.
"""
import os
import json
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class SCPICommandTemplate(BaseModel):
    command: str
    type: str # "set", "query", "trigger"
    parameters: List[str] = [] # list of param names to insert

class InstrumentManifest(BaseModel):
    model_config = {"protected_namespaces": ()}  # 'model_regex' is intentional, not a Pydantic field

    id: str
    manufacturer: str
    model_regex: str
    instrument_class: str  # "Signal Generator", "Signal Analyzer"
    
    # Hints for discovery service to interrogation the device
    # e.g. {"query_mode": "INST:SEL?", "expected_mode": "SA"}
    discovery_probes: Dict[str, str] = {}
    
    capability_flags: Dict[str, bool] = {}
    commands: Dict[str, Any] = {} # Now supports raw strings or SCPICommandTemplate
    safe_limits: Dict[str, Any] = {}

class ManifestLoader:
    """
    Loads JSON instrument manifests dynamically.
    """
    _manifests: Dict[str, InstrumentManifest] = {}

    @classmethod
    def load_manifests(cls):
        manifest_dir = os.path.join(os.path.dirname(__file__), 'manifests')
        if not os.path.exists(manifest_dir):
            os.makedirs(manifest_dir)
            
        for filename in os.listdir(manifest_dir):
            if filename.endswith(".json"):
                try:
                    with open(os.path.join(manifest_dir, filename), 'r') as f:
                        data = json.load(f)
                        manifest = InstrumentManifest(**data)
                        cls._manifests[manifest.id] = manifest
                        print(f"DEBUG: Loaded Manifest: {manifest.id}")
                except Exception as e:
                    print(f"ERROR: Failed to load manifest {filename}: {e}")

    @classmethod
    def get_manifest(cls, manifest_id: str) -> InstrumentManifest:
        if manifest_id in cls._manifests:
            return cls._manifests[manifest_id]
        raise ValueError(f"Manifest '{manifest_id}' not found.")

    @classmethod
    def match_idn_string(cls, idn_response: str) -> Optional[InstrumentManifest]:
        """
        Attempts to match an *IDN? response string to a loaded manifest using model_regex.
        """
        import re
        for manifest in cls._manifests.values():
            if re.search(manifest.model_regex, idn_response, re.IGNORECASE):
                return manifest
        return None

    @classmethod
    def get_all_manifests(cls) -> List[InstrumentManifest]:
        return list(cls._manifests.values())

# Auto-load manifests on import
ManifestLoader.load_manifests()
