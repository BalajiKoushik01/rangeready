from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseInstrumentDriver(ABC):
    """
    Abstract base class for all instrument drivers in the GVB Tech ecosystem.
    Directly addresses the modularity of Keysight PathWave and R&S WMT.
    """
    
    @abstractmethod
    def connect(self, address: str) -> bool:
        """Establishes connection via TCPIP/USB (PyVISA/VXI-11)"""
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
    def get_trace(self) -> List[Dict[str, float]]:
        """Returns the current trace as a list of frequency/amplitude pairs"""
        pass

    @abstractmethod
    def set_frequency(self, start: float, stop: float) -> None:
        """Sets the span of the measurement"""
        pass
