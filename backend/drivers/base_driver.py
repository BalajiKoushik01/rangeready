"""
FILE: drivers/base_driver.py
ROLE: Abstract Base Class for all Hardware Drivers.
TRIGGERS: Inherited by KeysightUniversalDriver, RSUniversalDriver, etc.
TARGETS: Defines mandatory hardware interface (connect, write, query).
DESCRIPTION: Enforces a unified API across different hardware vendors.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Union
import struct

class BaseInstrumentDriver(ABC):
    """
    Abstract base class for all instrument drivers in the RangeReady ecosystem.
    Directly addresses industrial-grade connectivity and performance.
    """
    
    def __init__(self, simulation: bool = False):
        self.simulation = simulation
        self.is_connected = False
        self.address = None
        self.idn = "Simulation Mode" if simulation else "Disconnected"

    @abstractmethod
    def connect(self, address: str) -> bool:
        """Establishes connection via TCPIP/USB (PyVISA/VXI-11/Sockets)"""
        pass

    @abstractmethod
    def disconnect(self) -> None:
        """Safely closes the connection"""
        pass

    @abstractmethod
    def send_command(self, cmd: str) -> None:
        """Sends a raw SCPI command"""
        pass

    @abstractmethod
    def query(self, cmd: str) -> str:
        """Queries the instrument and returns response"""
        pass

    @abstractmethod
    def check_errors(self) -> List[str]:
        """Drains the instrument error queue and returns errors"""
        pass

    @abstractmethod
    def wait_for_opc(self, timeout_ms: int = 5000) -> bool:
        """Waits for *OPC to return 1"""
        pass

    def write_binary_block(self, cmd: str, data: bytes) -> None:
        """
        Formats and sends an IEEE 488.2 definite-length binary block.
        Format: #<num_digits><length><data>
        """
        length = len(data)
        len_str = str(length)
        num_digits = len(len_str)
        header = f"#{num_digits}{len_str}"
        full_command = f"{cmd}{header}".encode('ascii') + data
        self._send_raw(full_command)

    def read_binary_block(self, data: bytes) -> bytes:
        """
        Parses an IEEE 488.2 definite-length binary block from raw bytes.
        """
        if not data or data[0:1] != b'#':
            return b''
            
        num_digits = int(data[1:2])
        length = int(data[2:2+num_digits])
        return data[2+num_digits : 2+num_digits+length]

    def _send_raw(self, data: bytes) -> None:
        """Override this in child classes to send raw bytes directly"""
        pass

    @abstractmethod
    def get_trace(self) -> List[Dict[str, Any]]:
        """Returns the current trace data"""
        pass

    @abstractmethod
    def set_frequency(self, start: float, stop: float = 0) -> None:
        """Sets freq/span or CW frequency"""
        pass
