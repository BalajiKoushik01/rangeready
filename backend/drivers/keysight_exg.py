import vxi11
from typing import List, Dict
from drivers.base_driver import BaseInstrumentDriver

class KeysightEXGDriver(BaseInstrumentDriver):
    """
    Driver for Keysight EXG Analog Signal Generators (N5171B/N5172B).
    Supports 9KHz - 6GHz range as requested.
    """
    
    def __init__(self):
        self.instr = None
        self.address = None
        self.is_connected = False
        self.rf_state = False
        self.freq = 1.0e9
        self.amp = -20.0

    def connect(self, address: str) -> bool:
        try:
            self.address = address
            self.instr = vxi11.Instrument(address)
            idn = self.instr.ask("*IDN?")
            if "Keysight" in idn or "Agilent" in idn:
                self.is_connected = True
                print(f"Keysight Driver: Connected to {idn}")
                return True
            else:
                print(f"Keysight Driver: Device at {address} is not a Keysight instrument: {idn}")
                return False
        except Exception as e:
            print(f"Keysight Driver: Connection error at {address}: {e}")
            return False

    def disconnect(self) -> None:
        if self.instr:
            self.instr.close()
        self.is_connected = False

    def send_command(self, cmd: str) -> None:
        if self.is_connected:
            self.instr.write(cmd)

    def query(self, cmd: str) -> str:
        if self.is_connected:
            return self.instr.ask(cmd)
        return ""

    def set_frequency(self, freq: float, stop: float = 0) -> None:
        # For Signal Generator, stop is ignored
        self.frec = freq
        self.send_command(f"FREQ {freq}")

    def set_amplitude(self, power: float) -> None:
        self.amp = power
        self.send_command(f"POW {power}")

    def set_rf_output(self, state: bool) -> None:
        self.rf_state = state
        cmd = "OUTP ON" if state else "OUTP OFF"
        self.send_command(cmd)

    def get_trace(self) -> List[Dict[str, float]]:
        """
        Signal generators don't have traces in the traditional sense,
        but we return the current CW state for the UI.
        """
        return [{
            "freq": self.freq / 1e9,
            "amp": self.amp,
            "state": "ON" if self.rf_state else "OFF"
        }]
