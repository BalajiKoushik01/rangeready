import os
import pyvisa
from typing import Dict, Any, Optional
import time
import numpy as np

class MockVISAInstrument:
    """A dummy pyvisa resource representation for offline testing."""
    def __init__(self, resource_name: str):
        self.resource_name = resource_name
        self.is_open = True
        self.timeout = 5000
    
    def write(self, command: str):
        print(f"Mock [{self.resource_name}] WRITE: {command}")
        
    def query(self, command: str) -> str:
        print(f"Mock [{self.resource_name}] QUERY: {command}")
        if "*IDN?" in command:
            return "GVB Tech,DUMMY-SA-1000,SN0001,V1.0.0"
        if "TRAC:DATA?" in command:
            # Generate a dummy spectrum trace
            # Return comma-separated string of 1001 points
            trace = np.random.normal(-90, 2, 1001)
            # Add a random CW signal
            trace[500] = -10
            return ",".join(f"{x:.2f}" for x in trace)
        
        return "OK"
        
    def close(self):
        self.is_open = False

class VISAService:
    """
    Manages pyvisa connections to lab instruments.
    Supports a mock mode for 'dummy test' debugging.
    """
    def __init__(self, use_mock: bool = False):
        self.use_mock = use_mock
        if not self.use_mock:
            self.rm = pyvisa.ResourceManager('@py') # Use pyvisa-py (pure Python backend)
        self.connections: Dict[str, Any] = {}
        
    def connect(self, ip_address: str, as_mock: bool = False) -> bool:
        resource_string = f"TCPIP0::{ip_address}::inst0::INSTR"
        
        if self.use_mock or as_mock:
            self.connections[ip_address] = MockVISAInstrument(resource_string)
            print(f"DEBUG: Connected to Mock VISA at {ip_address}")
            return True
            
        try:
            instr = self.rm.open_resource(resource_string)
            instr.timeout = 5000 # Default 5 secs
            self.connections[ip_address] = instr
            print(f"DEBUG: Connected to Real VISA at {ip_address}")
            return True
        except pyvisa.errors.VisaIOError as e:
            if e.error_code == pyvisa.errors.StatusCode.error_timeout:
                print(f"ERROR: VISA Timeout for {ip_address}. ACTION: Verify instrument is powered ON and reachable over network.")
            elif e.error_code == pyvisa.errors.StatusCode.error_resource_not_found:
                print(f"ERROR: VISA Resource {ip_address} not found. ACTION: Check LAN cable and verify IP address in configuration.")
            else:
                print(f"ERROR: VISA IO Error {e.error_code} for {ip_address}. ACTION: Check VISA backend installation (pyvisa-py).")
            return False
        except Exception as e:
            print(f"CRITICAL ERROR: Failed to connect to {ip_address}. Exception: {e}. ACTION: Verify pyvisa installation.")
            return False
            
    def disconnect(self, ip_address: str):
        if ip_address in self.connections:
            self.connections[ip_address].close()
            del self.connections[ip_address]
            
    def write(self, ip_address: str, command: str):
        if ip_address in self.connections:
            self.connections[ip_address].write(command)
        else:
            raise ConnectionError(f"Instrument {ip_address} not connected.")
            
    def query(self, ip_address: str, command: str) -> str:
        if ip_address in self.connections:
            return self.connections[ip_address].query(command).strip()
        else:
            raise ConnectionError(f"Instrument {ip_address} not connected.")
            
    def identify(self, ip_address: str) -> Optional[str]:
        """Queries the identity string of the instrument."""
        try:
            return self.query(ip_address, "*IDN?")
        except Exception:
            return None

# Global service instance
visa_service = VISAService(use_mock=False) # Production mode by default
