import vxi11
from typing import List, Dict
from drivers.base_driver import BaseInstrumentDriver

class RSAnaDriver(BaseInstrumentDriver):
    """
    Driver for Rohde & Schwarz Spectrum Analyzers (e.g., FSV, FSW, FPS).
    Supports 5KHz - 7.5GHz range as requested.
    """
    
    def __init__(self):
        self.instr = None
        self.address = None
        self.is_connected = False
        self.start_freq = 1.0e6
        self.stop_freq = 7.5e9

    def connect(self, address: str) -> bool:
        try:
            self.address = address
            # Connect via VXI-11
            self.instr = vxi11.Instrument(address)
            idn = self.instr.ask("*IDN?")
            if "Rohde&Schwarz" in idn or "R&S" in idn:
                self.is_connected = True
                print(f"R&S Driver: Connected to {idn}")
                return True
            else:
                print(f"R&S Driver: Device at {address} is not an R&S instrument: {idn}")
                return False
        except Exception as e:
            print(f"R&S Driver: Connection error at {address}: {e}")
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

    def set_frequency(self, start: float, stop: float) -> None:
        self.start_freq = start
        self.stop_freq = stop
        self.send_command(f"SENS:FREQ:STAR {start}")
        self.send_command(f"SENS:FREQ:STOP {stop}")

    def get_trace(self) -> List[Dict[str, float]]:
        """
        Queries trace data from R&S analyzer.
        """
        if not self.is_connected:
            return []
            
        # Standard R&S command for trace data
        data_str = self.query("TRAC? CH1,TRACE1")
        if not data_str:
            return []
            
        # Parse comma-separated values
        amps = [float(x) for x in data_str.split(",")]
        num_points = len(amps)
        
        trace = []
        span = self.stop_freq - self.start_freq
        step = span / (num_points - 1) if num_points > 1 else 0
        
        for i in range(num_points):
            freq = self.start_freq + (i * step)
            trace.append({
                "freq": freq / 1e9,
                "amp": amps[i]
            })
        return trace
