"""
FILE: drivers/generic_scpi.py
ROLE: Universal Bridge Driver for ANY SCPI-Compliant Hardware.
TRIGGERS: PluginManager (when no known vendor driver matches the IDN string).
TARGETS: Physical hardware over TCP Port 5025 or VXI-11 (any vendor, any family).
DESCRIPTION:
  This driver operates from a user-defined "command_map" stored in the database.
  When a new piece of hardware is discovered and not recognized, the GUI Profiler
  Wizard interviews the user and builds this command_map. The driver then uses
  it to translate all high-level actions (set_frequency, rf_on, etc.) into the
  exact SCPI strings that specific hardware understands.

  It also supports full IEEE 488.2 fallback — if a mapping is missing, it will
  attempt the standard command. This ensures basic communication always works.

DATA FLOW:
  GUI Action → commands.py → PluginManager.get_driver("GenericSCPIDriver")
  → GenericSCPIDriver → command_map[action].format(value=val) → TCP Socket
  → Hardware → Response → check_errors() → Broadcast to Telemetry
"""

import socket
import time
import re
from typing import Dict, Any, List, Optional

from .base_driver import BaseInstrumentDriver


# ─────────────────────────────────────────────────────────────────────────────
# IEEE 488.2 FALLBACK COMMAND TABLE
# These are used when a command_map entry is missing for a given action.
# Most SCPI-compliant instruments (Keysight, R&S, Tektronix, Siglent) support
# these standard headers, making basic communication always possible.
# ─────────────────────────────────────────────────────────────────────────────
IEEE488_DEFAULTS: Dict[str, str] = {
    "query_idn":         "*IDN?",
    "reset":             "*RST",
    "clear":             "*CLS",
    "wait_opc":          "*OPC?",
    "query_error":       "SYST:ERR?",
    "query_error_count": "SYST:ERR:COUN?",
    # Signal Generator defaults (SCPI-standard)
    "set_frequency":     "FREQ {value}",
    "query_frequency":   "FREQ?",
    "set_power":         "POW {value}",
    "query_power":       "POW?",
    "rf_on":             "OUTP ON",
    "rf_off":            "OUTP OFF",
    "query_rf":          "OUTP?",
    # Modulation
    "am_on":             "AM:STAT ON",
    "am_off":            "AM:STAT OFF",
    "am_depth":          "AM:DEPT {value}",
    "fm_on":             "FM:STAT ON",
    "fm_off":            "FM:STAT OFF",
    "fm_dev":            "FM:DEV {value}",
    "pm_on":             "PM:STAT ON",
    "pm_off":            "PM:STAT OFF",
    "pulse_on":          "PULM:STAT ON",
    "pulse_off":         "PULM:STAT OFF",
    "pulse_period":      "PULM:INT:PER {value}",
    "pulse_width":       "PULM:INT:PWID {value}",
    # Sweep
    "sweep_start":       "FREQ:STAR {value}",
    "sweep_stop":        "FREQ:STOP {value}",
    "sweep_step":        "SWE:FREQ:STEP {value}",
    "sweep_dwell":       "SWE:DWELL {value}",
    "sweep_trigger":     "TRIG",
    # Trigger
    "trig_source_imm":   "TRIG:SOUR IMM",
    "trig_source_ext":   "TRIG:SOUR EXT",
    "trig_source_bus":   "TRIG:SOUR BUS",
    # Spectrum Analyzer defaults
    "sa_center":         "SENS:FREQ:CENT {value}",
    "sa_span":           "SENS:FREQ:SPAN {value}",
    "sa_start":          "SENS:FREQ:STAR {value}",
    "sa_stop":           "SENS:FREQ:STOP {value}",
    "sa_ref_level":      "DISP:WIND:TRAC:Y:RLEV {value}",
    "sa_rbw":            "SENS:BAND {value}",
    "sa_vbw":            "SENS:BAND:VID {value}",
    "sa_sweep_time":     "SENS:SWE:TIME {value}",
    "sa_sweep_points":   "SENS:SWE:POIN {value}",
    "sa_att":            "INP:ATT {value}",
    "sa_att_auto":       "INP:ATT:AUTO ON",
    "sa_init_cont":      "INIT:CONT ON",
    "sa_init_single":    "INIT:IMM",
    "sa_trace":          "TRAC:DATA? TRACE{value}",
    # Power Supply defaults
    "psu_volt":          "VOLT {value}",
    "psu_curr":          "CURR {value}",
    "psu_out_on":        "OUTP ON",
    "psu_out_off":       "OUTP OFF",
    "psu_query_volt":    "MEAS:VOLT?",
    "psu_query_curr":    "MEAS:CURR?",
    # System & Identification
    "query_options":     "*OPT?",
    "query_status":      "*STB?",
    "query_event":       "*ESR?",
    "self_test":         "*TST?",
    "save_state":        "*SAV {value}",
    "recall_state":      "*RCL {value}",
}

# ─────────────────────────────────────────────────────────────────────────────
# INSTRUMENT CAPABILITY CLASSES
# Used by the Profiler Wizard to show the right controls per instrument type
# ─────────────────────────────────────────────────────────────────────────────
CAPABILITY_PROFILES = {
    "signal_generator": {
        "required": ["set_frequency", "set_power", "rf_on", "rf_off", "query_error"],
        "optional": ["am_on", "am_off", "am_depth", "fm_on", "fm_off", "fm_dev",
                     "pm_on", "pm_off", "pulse_on", "pulse_off", "pulse_period",
                     "pulse_width", "sweep_start", "sweep_stop", "trig_source_imm"],
    },
    "spectrum_analyzer": {
        "required": ["sa_center", "sa_span", "sa_ref_level", "sa_rbw", "sa_trace", "query_error"],
        "optional": ["sa_vbw", "sa_sweep_time", "sa_sweep_points", "sa_att", "sa_init_single"],
    },
    "power_supply": {
        "required": ["psu_volt", "psu_curr", "psu_out_on", "psu_out_off", "query_error"],
        "optional": ["psu_query_volt", "psu_query_curr"],
    },
    "oscilloscope": {
        "required": ["reset", "clear", "wait_opc", "query_error"],
        "optional": [],
    },
    "generic": {
        "required": ["query_idn", "query_error"],
        "optional": [],
    },
}


class GenericSCPIDriver(BaseInstrumentDriver):
    """
    Universal hardware driver for ANY SCPI-compliant instrument.

    COMMAND MAP PRIORITY (highest to lowest):
    1. User-defined command_map (from DB / Profiler Wizard)
    2. IEEE 488.2 defaults (IEEE488_DEFAULTS table above)
    3. Raw passthrough (used from the SCPI Console)

    USAGE in commands.py:
        driver = PluginManager.get_driver("GenericSCPIDriver", simulation=False)
        driver.set_command_map(instrument_record.command_map)
        driver.connect(instrument_record.address)
        driver.execute("set_frequency", value=1e9)
    """

    def __init__(self, simulation: bool = False):
        super().__init__(simulation=simulation)
        self.sock = None
        self.vxi = None
        self.address = ""
        self.port = 5025
        self.timeout_s = 10.0
        # User-defined overrides loaded from DB or Manifest
        self._command_map: Dict[str, str] = {}
        # Resolved map = user_map merged with IEEE defaults
        self._resolved_map: Dict[str, str] = {}
        self.instrument_class = "generic"
        self.personality_id = None # Link to JSON manifest if applicable
        self._last_success_port = None # Sticky port caching
        self._rebuild_resolved_map()

    def load_personality_from_manifest(self, manifest_id: str):
        """Loads personality (class and commands) from a JSON manifest."""
        from .manifest_loader import ManifestLoader
        try:
            manifest = ManifestLoader.get_manifest(manifest_id)
            self.instrument_class = manifest.instrument_class
            self.personality_id = manifest.id
            
            # Map manifest commands to driver map
            new_map = {}
            for action, cmd_obj in manifest.commands.items():
                if isinstance(cmd_obj, str):
                    new_map[action] = cmd_obj
                elif hasattr(cmd_obj, "command"):
                    new_map[action] = cmd_obj.command
                elif isinstance(cmd_obj, dict):
                    new_map[action] = cmd_obj.get("command", "")
            
            self.set_command_map(new_map, instrument_class=manifest.instrument_class)
            print(f"[Generic] Personality '{manifest_id}' loaded successfully.")
        except Exception as e:
            print(f"[Generic] Manifest Load Error ({manifest_id}): {e}")

    def set_command_map(self, command_map: Dict[str, str], instrument_class: str = "generic"):
        """
        Load user-defined command overrides from the database.
        Called by commands.py before any hardware interaction.

        DATA FLOW:
          DB instrument.command_map → this method → self._resolved_map
        """
        self._command_map = command_map or {}
        self.instrument_class = instrument_class or "generic"
        self._rebuild_resolved_map()

    def _rebuild_resolved_map(self):
        """
        Merges IEEE488 defaults with user overrides.
        User overrides always win. This means a user can fix vendor-specific issues
        (like the Keysight -113 header variation) just by updating the DB record.
        """
        self._resolved_map = {**IEEE488_DEFAULTS, **self._command_map}

    def _resolve_cmd(self, action: str, **kwargs) -> Optional[str]:
        """
        Translates a logical action name into a raw SCPI string using kwargs for templates.
        """
        template = self._resolved_map.get(action)
        if template is None:
            return None
        try:
            return template.format(**kwargs)
        except (KeyError, IndexError):
            # Fallback for simple value replacement if format fails
            if "value" in kwargs:
                return template.replace("{value}", str(kwargs["value"]))
            return template

    # ─────────────────────────────────────────── Connection ───────────────────
    def connect(self, address: str, port: int = 5025) -> bool:
        """
        Connects via DNS/mDNS with port-caching and Multi-Protocol fallback.
        """
        # DNS/mDNS Resolution
        try:
            resolved_ip = socket.gethostbyname(address)
            self.address = resolved_ip
        except socket.gaierror:
            self.address = address # Fallback to original
            
        # Port Priority: 1. Successful cache, 2. Argument, 3. Standard defaults
        search_port = self._last_success_port or port
        self.port = search_port

        if self.simulation:
            self.is_connected = True
            self.idn = "Generic,SimulatedInstrument,SN12345,FW1.0"
            return True

        # Try Cached/Requested Port first
        if self._connect_socket(self.address, search_port):
            self._last_success_port = search_port
            return True

        # Fallback to VXI-11 if socket failed OR if it's the specific LXI port
        if self._connect_vxi11(self.address):
            self._last_success_port = 111
            return True
            
        return False

    def _connect_socket(self, address: str, port: int) -> bool:
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.settimeout(3.0)  # Faster timeout for discovery
            
            # LATENCY OPTIMIZATION: Disable Nagle's Algorithm
            # Forces commands to be sent immediately rather than buffering
            self.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            
            self.sock.connect((address, port))
            # Test communication
            self.idn = self._socket_query("*IDN?").strip()
            if self.idn:
                self.is_connected = True
                self.sock.settimeout(self.timeout_s)  # Resume normal timeout
                self._socket_write("*CLS")
                print(f"[Generic-Socket] Connected: {self.idn}")
                return True
        except (socket.error, socket.timeout):
            pass
        finally:
            if not self.is_connected and self.sock:
                self.sock.close()
                self.sock = None
        return False

    def _connect_vxi11(self, address: str) -> bool:
        try:
            import vxi11
            self.vxi = vxi11.Instrument(address)
            self.vxi.timeout = self.timeout_s
            self.idn = self.vxi.ask("*IDN?")
            if self.idn:
                self.is_connected = True
                self.vxi.write("*CLS")
                print(f"[Generic-VXI11] Connected: {self.idn}")
                return True
        except Exception as e:
            print(f"[Generic-VXI11] Error: {e}")
        finally:
            if not self.is_connected and self.vxi:
                self.vxi.close()
                self.vxi = None
        return False

    def disconnect(self):
        if self.sock:
            self.sock.close()
            self.sock = None
        if self.vxi:
            self.vxi.close()
            self.vxi = None
        self.is_connected = False

    # ─────────────────────────────────────── Transport ────────────────────────
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

    # ─────────────────────────────────────────── Core API ─────────────────────
    def send_command(self, cmd: str) -> None:
        """Raw SCPI passthrough. Used by the SCPI Console terminal."""
        self.write(cmd)

    def write(self, cmd: str) -> None:
        if not self.is_connected:
            return
        if self.simulation:
            print(f"[SIM→Generic] {cmd}")
            return
        if self.sock:
            self._socket_write(cmd)
        elif self.vxi:
            self.vxi.write(cmd)

    def query(self, cmd: str) -> str:
        if not self.is_connected:
            return ""
        if self.simulation:
            return "1" if cmd == "*OPC?" else "0"
        if self.sock:
            return self._socket_query(cmd)
        elif self.vxi:
            return self.vxi.ask(cmd)
        return ""

    def execute(self, action: str, **kwargs) -> Any:
        """
        Industry-standard logical action execution.
        """
        cmd = self._resolve_cmd(action, **kwargs)
        if cmd is None:
            print(f"[Generic] No personality mapping for '{action}'. skipping.")
            return None
            
        if "?" in cmd:
            return self.query(cmd)
        else:
            self.write(cmd)
            return True

    def check_errors(self) -> List[str]:
        errors = []
        for _ in range(10):
            err = self.query(self._resolve_cmd("query_error") or "SYST:ERR?")
            if not err or '+0,"No error"' in err or err == "0":
                break
            errors.append(err)
        return errors

    def wait_for_opc(self, timeout_ms: int = 10000) -> bool:
        end = time.time() + timeout_ms / 1000.0
        while time.time() < end:
            if self.query("*OPC?").strip() == "1":
                return True
            time.sleep(0.05)
        return False

    # ─────────────────────────── High-Level Logical Controls ──────────────────
    # These mirror the Keysight/R&S driver APIs so that the rest of the system
    # can call them without knowing the underlying vendor.

    def sg_set_frequency(self, freq_hz: float) -> None:
        """TRACE: GUI Freq Dial → action='set_frequency' → SCPI → Hardware"""
        self.write(self._resolve_cmd("set_frequency", value=freq_hz))
        self.check_errors()

    def sg_set_power(self, power_dbm: float) -> None:
        """TRACE: GUI Power Slider → action='set_power' → SCPI → Hardware"""
        self.write(self._resolve_cmd("set_power", value=power_dbm))
        self.check_errors()

    def sg_set_rf_output(self, state: bool) -> None:
        """TRACE: GUI RF Toggle → action='rf_on'/'rf_off' → SCPI → Hardware"""
        action = "rf_on" if state else "rf_off"
        self.write(self._resolve_cmd(action))
        self.check_errors()

    def sg_set_am(self, state: bool, depth_pct: float = 30.0) -> None:
        if state:
            self.write(self._resolve_cmd("am_depth", value=depth_pct))
            self.write(self._resolve_cmd("am_on"))
        else:
            self.write(self._resolve_cmd("am_off"))
        self.check_errors()

    def sg_set_fm(self, state: bool, deviation_hz: float = 1000.0) -> None:
        if state:
            self.write(self._resolve_cmd("fm_dev", deviation_hz))
            self.write(self._resolve_cmd("fm_on"))
        else:
            self.write(self._resolve_cmd("fm_off"))
        self.check_errors()

    def sg_set_pulse_modulation(self, state: bool) -> None:
        action = "pulse_on" if state else "pulse_off"
        self.write(self._resolve_cmd(action))
        self.check_errors()

    def sg_set_pulse_params(self, period_s: float, width_s: float) -> None:
        self.write(self._resolve_cmd("pulse_period", period_s))
        self.write(self._resolve_cmd("pulse_width", width_s))
        self.check_errors()

    def sg_set_sweep(self, start_hz: float, stop_hz: float, step_hz: float = 1e6, dwell_s: float = 0.01) -> None:
        self.write(self._resolve_cmd("sweep_start", start_hz))
        self.write(self._resolve_cmd("sweep_stop", stop_hz))
        self.write(self._resolve_cmd("sweep_step", step_hz))
        self.write(self._resolve_cmd("sweep_dwell", dwell_s))
        self.check_errors()

    def sa_set_center_span(self, center_hz: float, span_hz: float) -> None:
        self.write(self._resolve_cmd("sa_center", value=center_hz))
        self.write(self._resolve_cmd("sa_span", value=span_hz))
        self.check_errors()

    def sa_set_reference_level(self, ref_dbm: float) -> None:
        self.write(self._resolve_cmd("sa_ref_level", value=ref_dbm))
        self.check_errors()

    def get_trace(self):
        """Standardized trace fetch with binary fallback for speed."""
        try:
            return self.get_trace_binary()
        except:
            return self.execute("sa_trace")

    def get_trace_binary(self):
        """
        Ultra-High Speed: Fetches data in binary block format (REAL,32).
        Decreases bus traffic by 60%+ compared to ASCII.
        """
        if self.simulation:
            import random
            return [random.uniform(-100, -10) for _ in range(1001)]

        # 1. Switch instrument to binary mode
        self.write("FORM:DATA realm,32")
        
        # 2. Query trace
        cmd = self._resolve_cmd("sa_trace") or "TRAC:DATA? TRACE1"
        self.write(cmd)
        
        # 3. Read binary block manually for speed
        # Header is like #41001 (4 digits for 1001 bytes)
        header = self.sock.recv(2) # Read # and digits_count
        if header[0:1] != b'#':
            raise ValueError("Invalid binary block header")
        
        num_digits = int(header[1:2])
        length_bytes = int(self.sock.recv(num_digits))
        
        # Read full block
        raw_data = b""
        while len(raw_data) < length_bytes:
            chunk = self.sock.recv(min(length_bytes - len(raw_data), 16384))
            if not chunk: break
            raw_data += chunk
            
        # Final newline
        self.sock.recv(1)
        
        # Unpack IEEE 4 byte floats (32-bit real)
        import struct
        points = len(raw_data) // 4
        return list(struct.unpack(f"{points}f", raw_data))

    def set_frequency(self, start: float, stop: float = 0) -> None:
        """Standardized frequency setter required by BaseInstrumentDriver."""
        if stop > 0:
            self.write(self._resolve_cmd("sa_start", value=start))
            self.write(self._resolve_cmd("sa_stop", value=stop))
        else:
            self.sg_set_frequency(start)

    def get_capability_questions(self) -> List[Dict[str, Any]]:
        """
        Returns the wizard questions for this instrument class.
        Used by the GUI Profiler Wizard to know what to ask the user.

        TRACE: GET /api/instruments/wizard-questions → this method
        """
        profile = CAPABILITY_PROFILES.get(self.instrument_class, CAPABILITY_PROFILES["generic"])
        return profile
