"""
FILE: drivers/keysight_universal.py
ROLE: Master Driver for all Keysight/Agilent/HP hardware.
TRIGGERS: PluginManager.
TARGETS: Physical Hardware via TCP Port 5025 (Socket) or VXI-11.
DESCRIPTION: Implements industry-standard Keysight SCPI protocols. Supports N5171B, EXG, MXG, PSG, and PNA families.
"""
"""
Keysight Universal Driver
author: RangeReady Platform
Based on: pyarbtools (Morgan Allison, Keysight RF/uW App Engineer) + socketscpi patterns
Supports: ALL Keysight instrument families via socket (Port 5025) or VXI-11

Supported Families:
  Signal Generators  : EXG (N517xB), MXG (N518xB), PSG (E8267D), UXG (N5193/4A), VXG (M9384A)
  AWG                : M8190A, M8195A, M8196A, M8199A
  Spectrum Analyzers : MXA (N9020B), PXA (N9030B), UXA (N9041B), CXA (N9000B), FieldFox
  Vector Network Analyzers: PNA (N5222B), ENA (E5063A), FieldFox VNA
  Oscilloscopes      : Infiniium S/E series, DSOX series
  Power Supplies     : N6700/N57xx, E36xx series
  DMMs               : 34461A, 34465A, 34470A

Communication: Raw Socket (Port 5025) with VXI-11 fallback
"""


# ─────────────────────────────────────────────────────────────────────────────
# SCPI COMMAND REFERENCE TABLE (TRACER)
# ─────────────────────────────────────────────────────────────────────────────
# LOGIC FUNCTION            | SCPI COMMAND                      | DESCRIPTION
# --------------------------|-----------------------------------|--------------
# Identify Instrument       | *IDN?                             | Returns ID, Model, SN
# Reset State               | *RST                              | Factory reset
# Clear Buffer              | *CLS                              | Clears error queue
# Wait for Completion       | *OPC?                             | Returns 1 when ready
# Check Errors              | SYST:ERR? / SYST:ERR:COUN?        | Pop error / Count errors
# --------------------------|-----------------------------------|--------------
# SIG GEN: Frequency        | SOUR:FREQ:CW <val>                | Sets continuous wave freq
# SIG GEN: Power            | SOUR:POW:LEV:IMM:AMPL <val>       | Sets output amplitude
# SIG GEN: RF State         | OUTP <ON|OFF>                     | Toggles RF output
# SIG GEN: AM Modulation    | SOUR:AM:STAT <ON|OFF>             | Toggles AM
# SIG GEN: FM Modulation    | SOUR:FM:STAT <ON|OFF>             | Toggles FM
# SIG GEN: ARB Status       | SOUR:RAD:ARB:STAT?                | Checks if Vector ARB playing
# --------------------------|-----------------------------------|--------------
# SPEC AN: Center Freq      | SENS:FREQ:CENT <val>              | Sets sweep center
# SPEC AN: Freq Span        | SENS:FREQ:SPAN <val>              | Sets sweep width
# SPEC AN: Ref Level        | DISP:WIND:TRAC:Y:RLEV <val>       | Sets top of Y-axis
# SPEC AN: RBW              | SENS:BAND <val>                   | Sets Resolution Bandwidth
# SPEC AN: Trace Data       | TRAC:DATA? TRACE1                 | Fetches 1001 amp points
# ─────────────────────────────────────────────────────────────────────────────

from backend.drivers.base_driver import BaseInstrumentDriver

class KeysightUniversalDriver(BaseInstrumentDriver):
    """
    Universal driver for ANY Keysight instrument.
    Uses raw socket (port 5025) - same approach as socketscpi library (Morgan Allison, Keysight).
    Falls back to vxi11 if socket unavailable.
    
    Reference: https://github.com/morgan-at-keysight/socketscpi
    """

    # Instrument type detection patterns from *IDN?
    IDN_FAMILIES = {
        "signal_generator": ["N5171", "N5172", "N5181", "N5182", "E8267", "N5193", "N5194", "M9383", "M9384"],
        "spectrum_analyzer": ["N9020", "N9030", "N9040", "N9041", "N9000", "N9010", "P9370", "P9372"],
        "vector_network_analyzer": ["N5221", "N5222", "N5224", "N5225", "E5061", "E5063", "E5080"],
        "oscilloscope": ["DSOX", "MSOS", "DSO-X", "INFINIIUM", "DSO9", "DSO6"],
        "awg": ["M8190", "M8195", "M8196", "M8199", "33600", "33500"],
        "dmm": ["34461", "34465", "34470", "34410", "34411"],
        "power_supply": ["N6705", "N5750", "N5770", "E3610", "E3630", "E3633", "E3645"],
        "power_sensor": ["N1921", "N1922", "U2000", "U2001", "U2002"],
    }

    def __init__(self, simulation: bool = False):
        super().__init__(simulation=simulation)
        self.sock = None
        self.vxi = None
        self.address = ""
        self.instrument_type = "unknown"
        self.port = 5025  # Industry-standard Keysight SCPI socket port
        self.timeout_s = 10.0
        self.capabilities = {
            "has_arb": True,
            "has_modulation": True,
            "is_analog_only": False
        }
        self._sim_cache: Dict[str, str] = {}
        self._init_sim_cache()

    def _init_sim_cache(self):
        """Initialize a comprehensive simulation state cache."""
        self._sim_cache = {
            # Signal Generator state
            "FREQ?": "1.000000000E+09", "FREQ:CW?": "1.000000000E+09",
            "FREQ:FIX?": "1.000000000E+09",
            "POW?": "-20.00", "POW:AMPL?": "-20.00", "POW:LEV?": "-20.00",
            "OUTP?": "0", "OUTP:STAT?": "0",
            "AM:STAT?": "0", "AM:DEPT?": "30.00", "AM:SOUR?": "INT",
            "FM:STAT?": "0", "FM:DEV?": "1000.00", "FM:SOUR?": "INT",
            "PULM:STAT?": "0", "PULM:INT:PER?": "0.01", "PULM:INT:WIDT?": "0.001",
            "POW:ALC?": "1", "ROSC:SOUR?": "INT",
            "SOUR:RAD:ARB:STAT?": "0",
            # Spectrum Analyzer state
            "SENS:FREQ:CENT?": "1.000000000E+09", "SENS:FREQ:SPAN?": "1.000000000E+09",
            "SENS:FREQ:STAR?": "5.000000000E+08", "SENS:FREQ:STOP?": "1.500000000E+09",
            "DISP:WIND:TRAC:Y:RLEV?": "0.00",
            "SENS:BAND?": "1.000000000E+06", "SENS:BAND:VID?": "3.000000000E+06",
            "SENS:SWE:TIME?": "0.02", "SENS:SWE:POIN?": "1001",
            "INP:ATT?": "10.00", "INP:ATT:AUTO?": "1",
            "SENS:DET?": "PEAK", "SENS:AVER:STAT?": "0", "SENS:AVER:COUN?": "10",
            # VNA state
            "SENS:FREQ:STAR?": "300000.00", "SENS:FREQ:STOP?": "8500000000.00",
            # Common
            "*IDN?": "Keysight,N5172B-SIM,MY53051234,B.01.85",
            "*OPC?": "1", "SYST:ERR?": '+0,"No error"',
            "*STB?": "0", "TRIG:SOUR?": "IMM",
        }

    # ─────────────────────────────────────────────── Connection ───────────────
    def connect(self, address: str, port: int = 5025) -> bool:
        self.address = address
        self.port = port
        if self.simulation:
            self.is_connected = True
            self.idn = self._sim_cache["*IDN?"]
            self.instrument_type = self._detect_type(self.idn)
            print(f"[SIM] Keysight: Connected to {address}")
            return True
        try:
            # Primary: Raw socket (Port 5025) – fastest, no driver required
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.settimeout(self.timeout_s)
            self.sock.connect((address, port))
            self.idn = self._socket_query("*IDN?").strip()
            if any(brand in self.idn for brand in ["Keysight", "Agilent", "HEWLETT"]):
                self.is_connected = True
                self._socket_write("*CLS")
                self.idn = self.idn or self._socket_query("*IDN?")
                self.instrument_type = self._detect_type(self.idn)
                self._detect_capabilities(self.idn)
                print(f"[Keysight] Connected via Socket: {self.idn} (AnalogOnly: {self.capabilities['is_analog_only']})")
                return True
            self.sock.close()
            self.sock = None
        except Exception as e:
            print(f"[Keysight] Socket failed ({e}), trying VXI-11...")
            try:
                import vxi11
                self.vxi = vxi11.Instrument(address)
                self.idn = self.vxi.ask("*IDN?")
                if any(brand in self.idn for brand in ["Keysight", "Agilent", "HEWLETT"]):
                    self.is_connected = True
                    self.vxi.write("*CLS")
                    self.instrument_type = self._detect_type(self.idn)
                    print(f"[Keysight] Connected via VXI-11: {self.idn}")
                    return True
            except Exception as e2:
                print(f"[Keysight] VXI-11 also failed: {e2}")
        return False

    def disconnect(self):
        if self.sock:
            self.sock.close()
            self.sock = None
        if self.vxi:
            self.vxi.close()
            self.vxi = None
        self.is_connected = False

    def _detect_type(self, idn: str) -> str:
        idn_up = idn.upper()
        for family, patterns in self.IDN_FAMILIES.items():
            if any(p.upper() in idn_up for p in patterns):
                return family
        return "generic"

    def _detect_capabilities(self, idn: str):
        """Identifies instrument limitations based on model number (e.g. Analog vs Vector)."""
        idn_up = idn.upper()
        # EXG/MXG Analog models (ending in 1B or 1A)
        analog_models = ["N5171", "N5181", "E8257"]
        if any(m in idn_up for m in analog_models):
            self.capabilities["has_arb"] = False
            self.capabilities["is_analog_only"] = True
        
        # Check for specific options if needed (future expansion)
        if self.simulation:
            self.capabilities["has_arb"] = "SIM" not in idn_up

    # ──────────────────────────────────────────── Socket Transport ────────────
    def _socket_write(self, cmd: str):
        self.sock.sendall((cmd + "\n").encode())

    def _socket_query(self, cmd: str) -> str:
        self._socket_write(cmd)
        buf = b""
        self.sock.settimeout(self.timeout_s)
        while True:
            chunk = self.sock.recv(4096)
            buf += chunk
            if buf.endswith(b"\n"):
                break
        return buf.decode(errors="replace").strip()

    def _socket_read_raw(self, nbytes: int) -> bytes:
        buf = b""
        remaining = nbytes
        while remaining > 0:
            chunk = self.sock.recv(min(remaining, 65536))
            if not chunk:
                break
            buf += chunk
            remaining -= len(chunk)
        return buf

    # ──────────────────────────────────────────────── Core API ────────────────
    def send_command(self, cmd: str) -> None:
        """Alias for write() as required by base class."""
        self.write(cmd)

    def write(self, cmd: str) -> None:
        if not self.is_connected:
            return
        if self.simulation:
            # Update sim cache on write commands
            cmd_stripped = cmd.strip()
            parts = cmd_stripped.split()
            if len(parts) >= 2:
                scpi_key = parts[0].upper() + "?"
                self._sim_cache[scpi_key] = " ".join(parts[1:])
            print(f"[SIM→Keysight] {cmd}")
            return
        if self.sock:
            self._socket_write(cmd)
        elif self.vxi:
            self.vxi.write(cmd)

    def query(self, cmd: str) -> str:
        if not self.is_connected:
            return ""
        if self.simulation:
            cmd_up = cmd.strip().upper()
            # Direct match first
            if cmd_up in self._sim_cache:
                return self._sim_cache[cmd_up]
            # Substring match
            for key, val in self._sim_cache.items():
                if key.rstrip("?") in cmd_up:
                    return val
            return "0"
        if self.sock:
            return self._socket_query(cmd)
        elif self.vxi:
            return self.vxi.ask(cmd)
        return ""

    def write_binary_block(self, header_cmd: str, data: bytes) -> None:
        """IEEE 488.2 definite-length binary block transfer."""
        if self.simulation:
            print(f"[SIM→Keysight] Binary block: {header_cmd} [{len(data)} bytes]")
            return
        num_digits = len(str(len(data)))
        block_header = f"#{num_digits}{len(data)}".encode()
        payload = header_cmd.encode() + block_header + data + b"\n"
        if self.sock:
            self.sock.sendall(payload)
        elif self.vxi:
            self.vxi.write_raw(payload)

    def check_errors(self) -> List[str]:
        errors = []
        for _ in range(20):
            err = self.query("SYST:ERR?")
            if not err or '+0,"No error"' in err or err == "0":
                break
            errors.append(err)
        if errors:
            print(f"[Keysight] Errors: {errors}")
        return errors

    def wait_for_opc(self, timeout_ms: int = 10000) -> bool:
        """
        Polls *OPC? until the instrument confirms all pending operations are complete.
        
        TRACE: Used by ARB upload and Frequency sweeps to ensure hardware synchronization.
        """
        end = time.time() + timeout_ms / 1000.0
        while time.time() < end:
            if self.query("*OPC?").strip() == "1":
                return True
            time.sleep(0.05)
        return False

    # ───────────────────────────────── Signal Generator Controls ──────────────
    def sg_set_frequency(self, freq_hz: float) -> None:
        """
        Sets CW frequency using 'SOUR:FREQ:CW <freq_hz>'.
        
        TRACE: Triggered by GUI [Frequency Dial] or [Master Control Panel].
        """
        self.write(f"SOUR:FREQ:CW {freq_hz}")
        self.check_errors()

    def sg_set_power(self, power_dbm: float) -> None:
        """
        Sets output power using 'SOUR:POW:LEV:IMM:AMPL <power_dbm>'.
        
        TRACE: Triggered by GUI [Power Slider] or [Safety Power Limits].
        """
        self.write(f"SOUR:POW:LEV:IMM:AMPL {power_dbm}")
        self.check_errors()

    def sg_set_rf_output(self, state: bool) -> None:
        """
        Toggles RF Output state using 'OUTP <ON/OFF>'.
        
        TRACE: Triggered by [MASTER RF TOGGLE] or [EMERGENCY KILL].
        """
        self.write(f"OUTP {'ON' if state else 'OFF'}")
        self.check_errors()

    def sg_query_frequency(self) -> float:
        return float(self.query("SOUR:FREQ:CW?") or 0)

    def sg_query_power(self) -> float:
        return float(self.query("SOUR:POW:LEV:IMM:AMPL?") or -200)

    def sg_query_rf_state(self) -> bool:
        return self.query("OUTP?").strip() == "1"

    # Modulation
    def sg_set_am(self, state: bool, depth_pct: float = 30.0, source: str = "INT") -> None:
        self.write(f"SOUR:AM:SOUR {source}")
        self.write(f"SOUR:AM:DEPT {depth_pct}")
        self.write(f"SOUR:AM:STAT {'ON' if state else 'OFF'}")
        self.check_errors()

    def sg_set_fm(self, state: bool, deviation_hz: float = 1000.0, source: str = "INT") -> None:
        self.write(f"SOUR:FM:SOUR {source}")
        self.write(f"SOUR:FM:DEV {deviation_hz}")
        self.write(f"SOUR:FM:STAT {'ON' if state else 'OFF'}")
        self.check_errors()

    def sg_set_pm(self, state: bool, deviation_rad: float = 0.5, source: str = "INT") -> None:
        self.write(f"SOUR:PM:SOUR {source}")
        self.write(f"SOUR:PM:DEV {deviation_rad}")
        self.write(f"SOUR:PM:STAT {'ON' if state else 'OFF'}")
        self.check_errors()

    def sg_set_lf_output(self, state: bool, freq_hz: float = 1000.0, amp_v: float = 0.5) -> None:
        """LF Output (internal modulation source generator)."""
        self.write(f"SOUR:LFO:FREQ {freq_hz}")
        self.write(f"SOUR:LFO:AMPL {amp_v}")
        self.write(f"SOUR:LFO:STAT {'ON' if state else 'OFF'}")
        self.check_errors()

    # Pulse Modulation
    def sg_set_pulse_modulation(self, state: bool) -> None:
        self.write(f"SOUR:PULM:STAT {'ON' if state else 'OFF'}")
        self.check_errors()

    def sg_set_pulse_source(self, source: str = "INT") -> None:
        """source: INT, EXT, SCAL"""
        self.write(f"SOUR:PULM:SOUR {source}")
        self.check_errors()

    def sg_set_pulse_params(self, period_s: float, width_s: float, delay_s: float = 0.0) -> None:
        self.write(f"SOUR:PULM:INT:PER {period_s}")
        self.write(f"SOUR:PULM:INT:PWID {width_s}")
        if delay_s > 0:
            self.write(f"SOUR:PULM:INT:DEL {delay_s}")
        self.check_errors()

    def sg_set_pulse_doublet(self, state: bool) -> None:
        self.write(f"SOUR:PULM:DOUB {'ON' if state else 'OFF'}")
        self.check_errors()

    # ALC / Leveling
    def sg_set_alc(self, state: bool) -> None:
        self.write(f"SOUR:POW:ALC {'ON' if state else 'OFF'}")
        self.check_errors()

    def sg_set_alc_level(self, power_dbm: float) -> None:
        self.write(f"SOUR:POW:ALC:LEV {power_dbm}")
        self.check_errors()

    def sg_execute_power_search(self) -> None:
        """Forces ALC power search (EXG/MXG specific)."""
        self.write("SOUR:POW:ALC:SEAR:EXEC")
        self.wait_for_opc()

    def sg_set_step_attenuator(self, value_db: float) -> None:
        self.write(f"SOUR:POW:ATT {value_db}")
        self.check_errors()

    # Reference & Sweep
    def sg_set_ref_clock(self, source: str = "INT", freq_hz: float = 10e6) -> None:
        """source: INT, EXT, SENS"""
        self.write(f"SOUR:ROSC:SOUR {source}")
        if source == "EXT":
            self.write(f"SOUR:ROSC:EXT:FREQ {freq_hz}")
        self.check_errors()

    def sg_set_sweep(self, start_hz: float, stop_hz: float,
                     step_hz: float = 1e6, dwell_s: float = 0.01) -> None:
        """Configures frequency list/step sweep."""
        self.write(f"SOUR:FREQ:STAR {start_hz}")
        self.write(f"SOUR:FREQ:STOP {stop_hz}")
        self.write(f"SOUR:SWE:FREQ:STEP {step_hz}")
        self.write(f"SOUR:SWE:DWELL {dwell_s}")
        self.write("SOUR:FREQ:MODE SWEEP")
        self.check_errors()

    def sg_set_sweep_mode(self, mode: str = "STEP") -> None:
        """mode: STEP, LIST, MAN"""
        self.write(f"SOUR:SWE:MODE {mode}")
        self.check_errors()

    def sg_trigger_sweep(self) -> None:
        self.write("TRIG")
        self.check_errors()

    # Triggering
    def sg_set_trigger_source(self, source: str = "IMM") -> None:
        """source: IMM, EXT, BUS"""
        self.write(f"TRIG:SOUR {source}")
        self.check_errors()

    def sg_set_trigger_slope(self, slope: str = "POS") -> None:
        self.write(f"TRIG:SLOP {slope}")
        self.check_errors()

    # ARB / IQ Waveform
    def sg_upload_arb_iq(self, name: str, i_data: List[float], q_data: List[float],
                          sample_rate: float = 100e6, force: bool = False) -> bool:
        """
        Uploads interleaved I/Q as 16-bit Big-Endian binary block.
        Implements granularity-4 padding and 0.707 PAPR scaling (from pyarbtools).
        """
        if not force:
            cat = self.query(':MEM:CAT? "WFM1"')
            if f'"{name}"' in cat:
                self.write(f':MMEM:LOAD:DATA "WFM1:{name}"')
                self.write(f':SOUR:RAD:ARB:WAV "WFM1:{name}"')
                self.write(":SOUR:RAD:ARB:STAT ON")
                return True

        if len(i_data) != len(q_data):
            return False

        # Granularity-4 padding (from pyarbtools wraparound_calc)
        gran = 4
        while len(i_data) % gran != 0:
            i_data.append(i_data[-1])
            q_data.append(q_data[-1])

        scale = 32767 * 0.707  # Safety scaling to prevent DAC clipping
        iq_bytes = bytearray()
        for i_val, q_val in zip(i_data, q_data):
            i_clamped = max(min(i_val, 1.0), -1.0)
            q_clamped = max(min(q_val, 1.0), -1.0)
            iq_bytes.extend(struct.pack(">hh", int(i_clamped * scale), int(q_clamped * scale)))

        self.write(f":SOUR:RAD:ARB:SRAT {sample_rate}")
        self.write_binary_block(f':MMEM:DATA "WFM1:{name}",', bytes(iq_bytes))
        self.wait_for_opc()
        self.write(f':SOUR:RAD:ARB:WAV "WFM1:{name}"')
        self.write(":SOUR:RAD:ARB:STAT ON")
        self.write(":SOUR:RAD:ARB:RSC 70")  # Runtime scaling 70%
        return len(self.check_errors()) == 0

    def sg_stop_arb(self) -> None:
        self.write(":SOUR:RAD:ARB:STAT OFF")

    def sg_list_waveforms(self) -> List[str]:
        cat = self.query(':MEM:CAT? "WFM1"')
        # parse comma-separated names in quotes
        import re
        return re.findall(r'"([^"]+)"', cat)

    def sg_delete_waveform(self, name: str) -> None:
        self.write(f':MEM:DEL:NAME "WFM1:{name}"')
        self.check_errors()

    def sg_reset(self) -> None:
        self.write("*RST")
        self.wait_for_opc()

    def sg_preset(self) -> None:
        self.write("SYST:PRES")
        self.wait_for_opc()

    def sg_get_complete_status(self) -> Dict[str, Any]:
        """Queries comprehensive state. Selective queries prevent -113 errors on Analog units."""
        status = {
            "idn": self.idn,
            "type": self.instrument_type,
            "address": self.address,
            "connected": self.is_connected,
            "freq_hz": self.sg_query_frequency(),
            "power_dbm": self.sg_query_power(),
            "rf_state": self.sg_query_rf_state(),
            "alc_state": self.query("SOUR:POW:ALC?").strip() == "1",
            "ref_clock": self.query("SOUR:ROSC:SOUR?").strip(),
            "error_count": int(self.query("SYST:ERR:COUN?") or 0)
        }
        
        # Only query modulation/ARB subsystems if the hardware supports them
        if not self.capabilities["is_analog_only"]:
            status.update({
                "am_state": self.query("SOUR:AM:STAT?").strip() == "1",
                "fm_state": self.query("SOUR:FM:STAT?").strip() == "1",
                "pulse_state": self.query("SOUR:PULM:STAT?").strip() == "1",
            })
            
        if self.capabilities["has_arb"]:
            status["arb_state"] = self.query("SOUR:RAD:ARB:STAT?").strip() == "1"
            
        return status

    # ───────────────────────────── Spectrum Analyzer Controls ─────────────────
    def sa_set_center_span(self, center_hz: float, span_hz: float) -> None:
        """
        Sets Span and Center via 'SENS:FREQ:CENT' and 'SENS:FREQ:SPAN'.
        
        TRACE: Triggered by [Analysis View] or [Spectrum Dashboard].
        """
        self.write(f"SENS:FREQ:CENT {center_hz}")
        self.write(f"SENS:FREQ:SPAN {span_hz}")
        self.check_errors()

    def sa_set_start_stop(self, start_hz: float, stop_hz: float) -> None:
        """Sets range via 'SENS:FREQ:STAR' and 'SENS:FREQ:STOP'."""
        self.write(f"SENS:FREQ:STAR {start_hz}")
        self.write(f"SENS:FREQ:STOP {stop_hz}")
        self.check_errors()

    def sa_set_reference_level(self, ref_dbm: float) -> None:
        self.write(f"DISP:WIND:TRAC:Y:RLEV {ref_dbm}")
        self.check_errors()

    def sa_set_attenuation(self, att_db: float, auto: bool = False) -> None:
        if auto:
            self.write("INP:ATT:AUTO ON")
        else:
            self.write(f"INP:ATT {att_db}")
        self.check_errors()

    def sa_set_rbw(self, rbw_hz: float, auto: bool = False) -> None:
        if auto:
            self.write("SENS:BAND:AUTO ON")
        else:
            self.write(f"SENS:BAND {rbw_hz}")
        self.check_errors()

    def sa_set_vbw(self, vbw_hz: float, auto: bool = False) -> None:
        if auto:
            self.write("SENS:BAND:VID:AUTO ON")
        else:
            self.write(f"SENS:BAND:VID {vbw_hz}")
        self.check_errors()

    def sa_set_sweep_time(self, time_s: float, auto: bool = True) -> None:
        if auto:
            self.write("SENS:SWE:TIME:AUTO ON")
        else:
            self.write(f"SENS:SWE:TIME {time_s}")
        self.check_errors()

    def sa_set_sweep_points(self, points: int) -> None:
        self.write(f"SENS:SWE:POIN {points}")
        self.check_errors()

    def sa_set_detector(self, detector: str = "NORM") -> None:
        """detector: NORM, AVER, POS (peak), SAMP, NEG, QPE, EAV, RMS"""
        self.write(f"DET {detector}")
        self.check_errors()

    def sa_set_trace_type(self, trace: int = 1, mode: str = "WRIT") -> None:
        """mode: WRIT (clear-write), MAXH, MINH, AVER, VIEW, BLAN"""
        self.write(f"DISP:WIND:TRAC{trace}:MODE {mode}")
        self.check_errors()

    def sa_set_average(self, count: int, state: bool = True) -> None:
        self.write(f"AVER:STAT {'ON' if state else 'OFF'}")
        if state:
            self.write(f"AVER:COUN {count}")
        self.check_errors()

    def sa_set_preamp(self, state: bool) -> None:
        self.write(f"INP:GAIN:STAT {'ON' if state else 'OFF'}")
        self.check_errors()

    # Triggering
    def sa_set_trigger_source(self, source: str = "IMM") -> None:
        """source: IMM, LINE, VID, EXT1, EXT2"""
        self.write(f"TRIG:SOUR {source}")
        self.check_errors()

    def sa_set_trigger_level(self, level_dbm: float) -> None:
        self.write(f"TRIG:VID:LEV {level_dbm}")
        self.check_errors()

    def sa_initiate_continuous(self, state: bool = True) -> None:
        self.write(f"INIT:CONT {'ON' if state else 'OFF'}")
        self.check_errors()

    def sa_initiate_single(self) -> None:
        self.write("INIT:CONT OFF")
        self.write("INIT:IMM")
        self.wait_for_opc(timeout_ms=30000)

    # Markers (supports 1–12 on X-Series)
    def sa_set_marker(self, index: int, freq_hz: float, state: bool = True) -> None:
        if not (1 <= index <= 12):
            return
        self.write(f"CALC:MARK{index}:STAT {'ON' if state else 'OFF'}")
        if state:
            self.write(f"CALC:MARK{index}:X {freq_hz}")
        self.check_errors()

    def sa_set_marker_type(self, index: int, mtype: str = "POS") -> None:
        """mtype: POS, DELT, FIX, OFF"""
        self.write(f"CALC:MARK{index}:MODE {mtype}")
        self.check_errors()

    def sa_marker_peak_search(self, index: int = 1) -> None:
        self.write(f"CALC:MARK{index}:MAX")
        self.check_errors()

    def sa_marker_next_peak(self, index: int = 1, direction: str = "RIGHT") -> None:
        """direction: RIGHT, LEFT"""
        cmd = f"CALC:MARK{index}:MAX:NEXT" if direction == "RIGHT" else f"CALC:MARK{index}:MAX:LEFT"
        self.write(cmd)
        self.check_errors()

    def sa_query_marker(self, index: int) -> Dict[str, float]:
        x = self.query(f"CALC:MARK{index}:X?")
        y = self.query(f"CALC:MARK{index}:Y?")
        try:
            return {"x": float(x), "y": float(y)}
        except ValueError:
            return {"x": 0.0, "y": -200.0}

    def sa_query_all_markers(self, count: int = 6) -> List[Dict]:
        markers = []
        for i in range(1, count + 1):
            active = self.query(f"CALC:MARK{i}:STAT?").strip() == "1"
            data = self.sa_query_marker(i)
            markers.append({"index": i, "active": active, **data})
        return markers

    def sa_clear_all_markers(self) -> None:
        self.write("CALC:MARK:AOFF")
        self.check_errors()

    # Limit Lines
    def sa_set_limit_line(self, line: int, points: List[Tuple[float, float]]) -> None:
        """points: list of (freq_hz, amp_dbm) tuples."""
        self.write(f"CALC:LIM{line}:DEL:ALL")
        for freq, amp in points:
            self.write(f"CALC:LIM{line}:FREQ {freq}")
            self.write(f"CALC:LIM{line}:AMP {amp}")
        self.check_errors()

    # Trace Retrieval
    def sa_get_trace_binary(self, trace: int = 1) -> List[float]:
        """
        High-speed IEEE 488.2 binary trace retrieval.
        FORM:BORD NORM = Big-Endian (Keysight default).
        """
        if self.simulation:
            return self._generate_sim_trace_data(1001)
        self.write("FORM:BORD NORM")
        self.write("FORM REAL,32")
        raw = self.query(f"TRAC:DATA? TRACE{trace}")
        # Parse IEEE 488.2 block header
        if raw.startswith("#"):
            n_digits = int(raw[1])
            n_bytes = int(raw[2:2 + n_digits])
            data_start = 2 + n_digits
            raw_bytes = raw[data_start:data_start + n_bytes].encode("latin-1")
        else:
            return []
        count = len(raw_bytes) // 4
        return list(struct.unpack(f">{count}f", raw_bytes))

    def sa_get_trace_points(self, trace: int = 1) -> List[Dict[str, float]]:
        """Returns trace with frequency axis computed from start/stop."""
        amps = self.sa_get_trace_binary(trace)
        if not amps:
            return []
        try:
            start = float(self.query("SENS:FREQ:STAR?"))
            stop = float(self.query("SENS:FREQ:STOP?"))
        except ValueError:
            start, stop = 0.0, 1e9
        pts = len(amps)
        step = (stop - start) / max(pts - 1, 1)
        return [{"freq": (start + i * step) / 1e9, "amp": amps[i]} for i in range(pts)]

    def sa_get_complete_status(self) -> Dict[str, Any]:
        return {
            "idn": self.idn,
            "type": self.instrument_type,
            "address": self.address,
            "connected": self.is_connected,
            "center_hz": float(self.query("SENS:FREQ:CENT?") or 1e9),
            "span_hz": float(self.query("SENS:FREQ:SPAN?") or 1e9),
            "start_hz": float(self.query("SENS:FREQ:STAR?") or 0),
            "stop_hz": float(self.query("SENS:FREQ:STOP?") or 2e9),
            "ref_level_dbm": float(self.query("DISP:WIND:TRAC:Y:RLEV?") or 0),
            "rbw_hz": float(self.query("SENS:BAND?") or 1e6),
            "vbw_hz": float(self.query("SENS:BAND:VID?") or 3e6),
            "sweep_time_s": float(self.query("SENS:SWE:TIME?") or 0.02),
            "points": int(float(self.query("SENS:SWE:POIN?") or 1001)),
            "attenuation_db": float(self.query("INP:ATT?") or 10),
            "attenuation_auto": self.query("INP:ATT:AUTO?").strip() == "1",
            "detector": self.query("DET?").strip(),
            "markers": self.sa_query_all_markers(6),
        }

    # ─────────────────────────── VNA Controls ─────────────────────────────────
    def vna_set_start_stop(self, start_hz: float, stop_hz: float) -> None:
        self.write(f"SENS:FREQ:STAR {start_hz}")
        self.write(f"SENS:FREQ:STOP {stop_hz}")
        self.check_errors()

    def vna_set_points(self, points: int) -> None:
        self.write(f"SENS:SWE:POIN {points}")
        self.check_errors()

    def vna_set_power(self, power_dbm: float, port: int = 1) -> None:
        self.write(f"SOUR:POW{port} {power_dbm}")
        self.check_errors()

    def vna_set_parameter(self, channel: int, parameter: str = "S11") -> None:
        self.write(f"CALC{channel}:PAR:DEF 'Tr1',{parameter}")
        self.check_errors()

    def vna_get_sdata(self, channel: int = 1) -> List[complex]:
        raw = self.query(f"CALC{channel}:DATA? SDATA")
        vals = [float(x) for x in raw.split(",") if x.strip()]
        return [complex(vals[i], vals[i+1]) for i in range(0, len(vals)-1, 2)]

    # ──────────────────────────── Simulation Helpers ──────────────────────────
    def _generate_sim_trace_data(self, points: int = 1001) -> List[float]:
        """Generates realistic spectrum trace for simulation mode."""
        center_idx = points // 2
        sig_width = points // 20
        result = []
        for i in range(points):
            noise = -100 + random.uniform(-2, 2)
            dist = abs(i - center_idx)
            peak = 80 * math.exp(-(dist**2) / (2 * (sig_width/2)**2)) if dist < sig_width * 3 else 0
            result.append(noise + peak)
        return result
    def get_trace(self) -> List[Dict[str, Any]]:
        """Implementation from BaseInstrumentDriver."""
        return self.sa_get_trace_points(trace=1)

    def set_frequency(self, start: float, stop: float = 0) -> None:
        """Standardized frequency setter."""
        if stop > 0:
            self.sa_set_start_stop(start, stop)
        else:
            self.sg_set_frequency(start)
