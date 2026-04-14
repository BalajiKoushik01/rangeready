"""
Rohde & Schwarz Universal Driver
author: RangeReady Platform
Based on: RsInstrument library (official R&S Python module) + SCPI reference manuals
Reference: https://github.com/Rohde-Schwarz/RsInstrument
           https://github.com/Rohde-Schwarz/Examples

Communication: Raw Socket (Port 5025) or VXI-11 (Port 0/VXI-11)
Port 5025 = R&S LAN (SCPI raw socket endpoint, same as TCPIP::IP::5025::SOCKET)

Supported Families:
  Spectrum/Signal Analyzers: FSW, FSV/FSVA, FPS, FSMR, FSL, RTO/RTB/RTA (SA mode)
  Signal Generators        : SMW200A, SMM100A, SMBV100B, SMB100A, SMC100A, SMA100B
  Oscilloscopes            : RTP, RTO, RTE, RTB, RTA, RTM
  Vector Network Analyzers : ZNA, ZNB, ZNC, ZND, ZVA, ZVB, ZVT
  Power Meters/Sensors     : NRP, NRQ, NRV
  Wireless Testers         : CMW, CMX
"""

import socket
import struct
import time
import math
import random
"""
FILE: drivers/rs_universal.py
ROLE: Master Driver for all Rohde & Schwarz hardware.
TRIGGERS: PluginManager.
TARGETS: Physical Hardware via TCP Port 5025 (Socket) or VXI-11.
DESCRIPTION: Implements R&S SCPI protocols. Supports SMBV, SMB, FSV, and FSW families.
"""
from typing import List, Dict, Any, Optional, Tuple


from .base_driver import BaseInstrumentDriver

class RSUniversalDriver(BaseInstrumentDriver):
    """
    Universal driver for ALL Rohde & Schwarz instruments.
    Implements RsInstrument patterns for VISA-less raw socket communication.
    Port 5025 = R&S standard SCPI socket (no VISA needed).

    Reference implementation pattern from RsInstrument:
      resource = 'TCPIP::192.168.1.50::5025::SOCKET'
      instr = RsInstrument(resource, True, True, "SelectVisa='socket'")
    """

    # Instrument type detection from *IDN?
    IDN_FAMILIES = {
        "spectrum_analyzer": ["FSW", "FSV", "FSVA", "FPS", "FSMR", "FSL", "FSQ", "FSVR", "FSEM"],
        "signal_generator": [
            "SMW200A", "SMM100A", "SMBV100B", "SMB100A", "SMB100B",
            "SMC100A", "SMA100A", "SMA100B", "SGS100A", "SGMA", "AMU200"
        ],
        "oscilloscope": ["RTP", "RTO", "RTE", "RTB", "RTA", "RTM", "HMO"],
        "vector_network_analyzer": ["ZNA", "ZNB", "ZNC", "ZND", "ZVA", "ZVB", "ZVT", "ZVAB"],
        "power_meter": ["NRP", "NRQ", "NRV", "NRPM"],
        "wireless_tester": ["CMW", "CMX", "CMB"],
    }

    def __init__(self, simulation: bool = False):
        super().__init__(simulation=simulation)
        self.sock = None
        self.vxi = None
        self.address = ""
        self.instrument_type = "unknown"
        self.port = 5025
        self.timeout_s = 15.0
        self._sim_cache: Dict[str, str] = {}
        self._init_sim_cache()

    def _init_sim_cache(self):
        self._sim_cache = {
            # General
            "*IDN?": "Rohde&Schwarz,FSV3000-SIM,123456,1.40",
            "*OPC?": "1",
            "*STB?": "0",
            "SYST:ERR? ALL": '+0,"No error"',
            "SYST:ERR?": '+0,"No error"',
            # Spectrum Analyzer
            "SENS:FREQ:CENT?": "1.000000000E+09",
            "SENS:FREQ:SPAN?": "1.000000000E+09",
            "SENS:FREQ:STAR?": "5.000000000E+08",
            "SENS:FREQ:STOP?": "1.500000000E+09",
            "DISP:WIND:TRAC:Y:RLEV?": "0.00",
            "SENS:BAND?": "1.000000000E+06",
            "SENS:BAND:VID?": "3.000000000E+06",
            "SENS:SWE:TIME?": "0.02",
            "SENS:SWE:POIN?": "1001",
            "INP:ATT?": "10.00",
            "INP:ATT:AUTO?": "1",
            "SENS:DET:FUNC?": "POS",
            "SENS:AVER:STAT?": "0",
            "SENS:AVER:COUN?": "10",
            "INP:GAIN:STAT?": "0",
            "TRIG:SOUR?": "IMM",
            # Signal Generator
            "SOUR:FREQ:CW?": "1.000000000E+09",
            "SOUR:FREQ?": "1.000000000E+09",
            "SOUR:POW:LEV:IMM:AMPL?": "-20.00",
            "OUTP1:STAT?": "0", "OUTP?": "0",
            "SOUR:MOD:STAT?": "0",
            "SOUR:AM:STAT?": "0", "SOUR:AM:DEPT?": "30.00",
            "SOUR:FM:STAT?": "0", "SOUR:FM:DEV?": "1000.00",
            "SOUR:PM:STAT?": "0",
            "SOUR:PULM:STAT?": "0",
            "SOUR:PULM:SOUR?": "INT",
            "SOUR:PULM:INT:PER?": "0.01",
            "SOUR:PULM:INT:PWID?": "0.001",
            "SOUR:BB:ARB:STAT?": "0",
            "SOUR:ROSC:SOUR?": "INT",
            "SOUR:POW:ALC:STAT?": "1",
        }

    # ──────────────────────────────────────────── Connection ──────────────────
    def connect(self, address: str, port: int = 5025) -> bool:
        """
        Connects via raw TCP socket (Port 5025) with VXI-11 fallback.
        """
        self.address = address
        self.port = port
        if self.simulation:
            self.is_connected = True
            self.idn = self._sim_cache["*IDN?"]
            self.instrument_type = self._detect_type(self.idn)
            return True

        if self._connect_socket(address, port):
            return True
            
        return self._connect_vxi11(address)

    def _connect_socket(self, address: str, port: int) -> bool:
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.settimeout(3.0)
            self.sock.connect((address, port))
            self.idn = self._socket_query("*IDN?").strip()
            # R&S brands: Rohde, Schwarz, R&S, ROHDE
            if any(b in self.idn for b in ["Rohde", "Schwarz", "R&S", "ROHDE"]):
                self.is_connected = True
                self.sock.settimeout(self.timeout_s)
                self._socket_write("*CLS")
                # Binary format optimization for R&S Performance
                self._socket_write("FORM REAL,32;:FORM:BORD SWAP")
                self.instrument_type = self._detect_type(self.idn)
                print(f"[R&S-Socket] Connected: {self.idn}")
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
            if any(b in self.idn for b in ["Rohde", "Schwarz", "R&S"]):
                self.is_connected = True
                self.vxi.write("*CLS")
                self.vxi.write("FORM REAL,32;:FORM:BORD SWAP")
                self.instrument_type = self._detect_type(self.idn)
                print(f"[R&S-VXI11] Connected: {self.idn}")
                return True
        except Exception as e:
            print(f"[R&S-VXI11] Error: {e}")
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

    def _detect_type(self, idn: str) -> str:
        idn_up = idn.upper()
        for family, patterns in self.IDN_FAMILIES.items():
            if any(p.upper() in idn_up for p in patterns):
                return family
        return "generic"

    # ─────────────────────────────── Socket Transport ─────────────────────────
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

    # ─────────────────────────────────── Core API ─────────────────────────────
    def send_command(self, cmd: str) -> None:
        """Alias for write() as required by base class."""
        self.write(cmd)

    def write(self, cmd: str) -> None:
        if not self.is_connected:
            return
        if self.simulation:
            cmd_stripped = cmd.strip()
            parts = cmd_stripped.split()
            if len(parts) >= 2:
                scpi_key = parts[0].upper() + "?"
                self._sim_cache[scpi_key] = " ".join(parts[1:])
            print(f"[SIM→R&S] {cmd}")
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
            if cmd_up in self._sim_cache:
                return self._sim_cache[cmd_up]
            for key, val in self._sim_cache.items():
                if key.rstrip("?") in cmd_up:
                    return val
            return "0"
        if self.sock:
            return self._socket_query(cmd)
        elif self.vxi:
            return self.vxi.ask(cmd)
        return ""

    def write_binary_block(self, cmd: str, data: bytes) -> None:
        """IEEE 488.2 definite-length binary block."""
        if self.simulation:
            print(f"[SIM→R&S] Binary block {cmd} [{len(data)} bytes]")
            return
        n = len(data)
        ndigits = len(str(n))
        header = f"#{ndigits}{n}".encode()
        payload = cmd.encode() + header + data + b"\n"
        if self.sock:
            self.sock.sendall(payload)
        elif self.vxi:
            self.vxi.write_raw(payload)

    def check_errors(self) -> List[str]:
        """
        Optimized: checks STB bit 2 (EAV) first, drains only if needed.
        Industry standard pattern for R&S performance safety.
        """
        if self.simulation:
            return []
        try:
            stb_str = self.query("*STB?")
            if not stb_str: return []
            stb = int(stb_str)
            if not (stb & 0x04):  # Bit 2 = EAV (Error Available)
                return []
        except Exception:
            # Fallback to direct query if *STB? fails
            pass
            
        errors = []
        for _ in range(20):
            # Try ALL first (FSW/FSV support it), fallback to single
            raw_err = self.query("SYST:ERR? ALL")
            if not raw_err or "No error" in raw_err:
                raw_err = self.query("SYST:ERR?")
                
            if not raw_err or '+0,"No error"' in raw_err or raw_err == "0":
                break
            errors.append(raw_err)
        return errors

    def wait_for_opc(self, timeout_ms: int = 30000) -> bool:
        """
        MAV (Bit 4) / ESB (Bit 5) polling pattern from RsInstrument.
        Industry standard for R&S sweep synchronization.
        """
        end = time.time() + timeout_ms / 1000.0
        while time.time() < end:
            if self.simulation:
                return True
            try:
                stb = int(self.query("*STB?"))
                if (stb & 0x10) or (stb & 0x20):  # MAV or ESB
                    if self.query("*OPC?").strip() == "1":
                        return True
            except Exception:
                pass
            time.sleep(0.05)
        return False

    def reset(self) -> None:
        self.write("*RST")
        self.wait_for_opc()

    def preset(self) -> None:
        """R&S instrument preset — equivalent to front-panel PRESET button."""
        self.write("SYST:PRES")
        self.wait_for_opc()

    # ───────────────────────── Spectrum Analyzer Controls (FSW/FSV/FPS) ───────
    def sa_set_center_span(self, center_hz: float, span_hz: float) -> None:
        self.write(f"SENS:FREQ:CENT {center_hz}")
        self.write(f"SENS:FREQ:SPAN {span_hz}")
        self.check_errors()

    def sa_set_start_stop(self, start_hz: float, stop_hz: float) -> None:
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
            self.write("INP:ATT:AUTO OFF")
            self.write(f"INP:ATT {att_db}")
        self.check_errors()

    def sa_set_preamp(self, state: bool) -> None:
        self.write(f"INP:GAIN:STAT {'ON' if state else 'OFF'}")
        self.check_errors()

    def sa_set_rbw(self, rbw_hz: float, auto: bool = False) -> None:
        if auto:
            self.write("SENS:BAND:AUTO ON")
        else:
            self.write("SENS:BAND:AUTO OFF")
            self.write(f"SENS:BAND {rbw_hz}")
        self.check_errors()

    def sa_set_vbw(self, vbw_hz: float, auto: bool = False) -> None:
        if auto:
            self.write("SENS:BAND:VID:AUTO ON")
        else:
            self.write("SENS:BAND:VID:AUTO OFF")
            self.write(f"SENS:BAND:VID {vbw_hz}")
        self.check_errors()

    def sa_set_sweep_time(self, time_s: float, auto: bool = True) -> None:
        if auto:
            self.write("SENS:SWE:TIME:AUTO ON")
        else:
            self.write("SENS:SWE:TIME:AUTO OFF")
            self.write(f"SENS:SWE:TIME {time_s}")
        self.check_errors()

    def sa_set_sweep_points(self, points: int) -> None:
        self.write(f"SENS:SWE:POIN {points}")
        self.check_errors()

    def sa_set_sweep_count(self, count: int) -> None:
        self.write(f"SENS:SWE:COUN {count}")
        self.check_errors()

    def sa_set_detector(self, detector: str = "POS") -> None:
        """
        detector: POS (peak), NEG, SAMP, RMS, AVER, QPE (quasi-peak), LPN (low noise)
        Reference: R&S FSx remote control manual, SENSe:DETector:FUNCtion
        """
        self.write(f"SENS:DET:FUNC {detector}")
        self.check_errors()

    def sa_set_trace_mode(self, trace: int = 1, mode: str = "WRIT") -> None:
        """
        mode: WRIT (clear-write), MAXH (max hold), MINH (min hold),
              AVER (average), VIEW (view frozen), BLAN (blank)
        """
        self.write(f"DISP:WIND:TRAC{trace}:MODE {mode}")
        self.check_errors()

    def sa_set_average(self, count: int, state: bool = True) -> None:
        self.write(f"SENS:AVER:STAT {'ON' if state else 'OFF'}")
        if state:
            self.write(f"SENS:AVER:COUN {count}")
        self.check_errors()

    def sa_set_trigger_source(self, source: str = "IMM") -> None:
        """source: IMM, LINE, EXT, IFP (IF power), VID (video), TIME, AUTO"""
        self.write(f"TRIG:SOUR {source}")
        self.check_errors()

    def sa_set_trigger_level(self, level_dbm: float) -> None:
        self.write(f"TRIG:LEV:VID {level_dbm}")
        self.check_errors()

    def sa_initiate_continuous(self, state: bool = True) -> None:
        self.write(f"INIT:CONT {'ON' if state else 'OFF'}")

    def sa_initiate_single(self) -> None:
        """Single sweep with OPC synchronization."""
        self.write("INIT:CONT OFF")
        self.write("INIT:IMM")
        self.wait_for_opc(timeout_ms=60000)

    # Markers (R&S supports up to 16 markers on FSW)
    def sa_set_marker(self, index: int, freq_hz: float, state: bool = True) -> None:
        if not (1 <= index <= 16):
            return
        self.write(f"CALC:MARK{index}:STAT {'ON' if state else 'OFF'}")
        if state:
            self.write(f"CALC:MARK{index}:X {freq_hz}")
        self.check_errors()

    def sa_set_marker_type(self, index: int, mtype: str = "NORM") -> None:
        """mtype: NORM, DELT, FIX, BPOW (band power)"""
        self.write(f"CALC:MARK{index}:MODE {mtype}")
        self.check_errors()

    def sa_marker_peak_search(self, index: int = 1) -> None:
        """Moves marker to highest peak on active trace."""
        self.write(f"CALC:MARK{index}:MAX:PEAK")
        self.check_errors()

    def sa_marker_next_right(self, index: int = 1) -> None:
        """Moves to the next peak to the right."""
        self.write(f"CALC:MARK{index}:MAX:RIGH")
        self.check_errors()

    def sa_marker_next_left(self, index: int = 1) -> None:
        self.write(f"CALC:MARK{index}:MAX:LEFT")
        self.check_errors()

    def sa_query_marker(self, index: int) -> Dict[str, float]:
        x_str = self.query(f"CALC:MARK{index}:X?")
        y_str = self.query(f"CALC:MARK{index}:Y?")
        try:
            return {"x": float(x_str), "y": float(y_str)}
        except ValueError:
            if self.simulation:
                return {"x": 1e9 + index * 1e6, "y": -40.0 + random.uniform(-5, 5)}
            return {"x": 0.0, "y": -200.0}

    def sa_query_all_markers(self, count: int = 6) -> List[Dict]:
        markers = []
        for i in range(1, count + 1):
            active_str = self.query(f"CALC:MARK{i}:STAT?").strip()
            active = active_str == "1" or active_str.upper() == "ON"
            data = self.sa_query_marker(i)
            markers.append({"index": i, "active": active, **data})
        return markers

    def sa_clear_all_markers(self) -> None:
        self.write("CALC:MARK:AOFF")
        self.check_errors()

    def sa_set_delta_marker(self, marker: int, ref_marker: int) -> None:
        """Sets marker as delta relative to reference marker."""
        self.write(f"CALC:MARK{marker}:MODE DELT")
        self.write(f"CALC:MARK{marker}:REF {ref_marker}")
        self.check_errors()

    def sa_set_band_power_marker(self, marker: int, span_hz: float) -> None:
        """Configures a band power marker (power in a bandwidth)."""
        self.write(f"CALC:MARK{marker}:MODE BPOW")
        self.write(f"CALC:MARK{marker}:BPOW:SPAN {span_hz}")
        self.check_errors()

    # Limit Lines
    def sa_set_limit_line(self, line: int, points: List[Tuple[float, float]],
                           limit_type: str = "UPP") -> None:
        """limit_type: UPP (upper), LOW (lower)"""
        self.write(f"CALC:LIM{line}:DEL:ALL")
        for freq, amp in points:
            self.write(f"CALC:LIM{line}:{limit_type} {freq},{amp}")
        self.write(f"CALC:LIM{line}:STAT ON")
        self.check_errors()

    def sa_check_limit(self, line: int) -> bool:
        """Returns True if measurement passes the limit."""
        result = self.query(f"CALC:LIM{line}:FAIL?")
        return result.strip() == "0"

    # Trace Retrieval
    def sa_get_trace_binary(self, trace: int = 1) -> List[float]:
        """
        High-speed REAL,32 binary trace retrieval.
        Reference pattern from RsInstrument: query_bin_or_ascii_float_list('TRAC:DATA? TRACE1')
        """
        if self.simulation:
            return self._generate_sim_trace_data(1001)
        raw_bytes = self.query(f"TRAC:DATA? TRACE{trace}").encode("latin-1")
        return self._parse_ieee_block_floats(raw_bytes)

    def _parse_ieee_block_floats(self, data: bytes) -> List[float]:
        """Parses IEEE 488.2 binary block #NDDDD... of single-precision floats (Little-Endian SWAP)."""
        if not data or data[0:1] != b"#":
            return []
        n_digits = int(data[1:2])
        n_bytes = int(data[2:2 + n_digits])
        payload = data[2 + n_digits:2 + n_digits + n_bytes]
        count = n_bytes // 4
        return list(struct.unpack(f"<{count}f", payload))  # Little-Endian (FORM:BORD SWAP)

    def sa_get_trace_points(self, trace: int = 1) -> List[Dict[str, float]]:
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
            "attenuation_auto": self.query("INP:ATT:AUTO?").strip() in ("1", "ON"),
            "detector": self.query("SENS:DET:FUNC?").strip(),
            "avg_state": self.query("SENS:AVER:STAT?").strip() in ("1", "ON"),
            "avg_count": int(float(self.query("SENS:AVER:COUN?") or 10)),
            "preamp": self.query("INP:GAIN:STAT?").strip() in ("1", "ON"),
            "markers": self.sa_query_all_markers(6),
        }

    # ────────────────────── Signal Generator Controls (SMW/SMB/SMBV) ──────────
    def sg_set_frequency(self, freq_hz: float) -> None:
        self.write(f"SOUR:FREQ:CW {freq_hz}")
        self.check_errors()

    def sg_set_power(self, power_dbm: float) -> None:
        self.write(f"SOUR:POW:LEV:IMM:AMPL {power_dbm}")
        self.check_errors()

    def sg_set_rf_output(self, state: bool, port: int = 1) -> None:
        self.write(f"OUTP{port}:STAT {'ON' if state else 'OFF'}")
        self.check_errors()

    def sg_query_frequency(self) -> float:
        return float(self.query("SOUR:FREQ:CW?") or 0)

    def sg_query_power(self) -> float:
        return float(self.query("SOUR:POW:LEV:IMM:AMPL?") or -200)

    def sg_query_rf_state(self, port: int = 1) -> bool:
        return self.query(f"OUTP{port}:STAT?").strip() in ("1", "ON")

    # Modulation
    def sg_set_am(self, state: bool, depth_pct: float = 30.0, source: str = "INT") -> None:
        self.write(f"SOUR:AM:DEPT {depth_pct}")
        self.write(f"SOUR:AM:SOUR {source}")
        self.write(f"SOUR:AM:STAT {'ON' if state else 'OFF'}")
        self.check_errors()

    def sg_set_fm(self, state: bool, deviation_hz: float = 1000.0, source: str = "INT") -> None:
        self.write(f"SOUR:FM:DEV {deviation_hz}")
        self.write(f"SOUR:FM:SOUR {source}")
        self.write(f"SOUR:FM:STAT {'ON' if state else 'OFF'}")
        self.check_errors()

    def sg_set_pm(self, state: bool, deviation_rad: float = 0.5, source: str = "INT") -> None:
        self.write(f"SOUR:PM:DEV {deviation_rad}")
        self.write(f"SOUR:PM:SOUR {source}")
        self.write(f"SOUR:PM:STAT {'ON' if state else 'OFF'}")
        self.check_errors()

    def sg_set_lf_output(self, state: bool, freq_hz: float = 1000.0, shape: str = "SIN") -> None:
        """LF Output (internal modulation source). shape: SIN, TRI, SQU, PULS."""
        self.write(f"SOUR:LFO:FREQ {freq_hz}")
        self.write(f"SOUR:LFO:SHAP {shape}")
        self.write(f"SOUR:LFO:STAT {'ON' if state else 'OFF'}")
        self.check_errors()

    # Pulse Modulation
    def sg_set_pulse_modulation(self, state: bool) -> None:
        self.write(f"SOUR:PULM:STAT {'ON' if state else 'OFF'}")
        self.check_errors()

    def sg_set_pulse_source(self, source: str = "INT") -> None:
        """source: INT, EXT, SGEN (signal from 2nd path for SMW)"""
        self.write(f"SOUR:PULM:SOUR {source}")
        self.check_errors()

    def sg_set_pulse_params(self, period_s: float, width_s: float,
                             delay_s: float = 0.0, double_pulse: bool = False) -> None:
        self.write(f"SOUR:PULM:INT:PER {period_s}")
        self.write(f"SOUR:PULM:INT:PWID {width_s}")
        if delay_s > 0:
            self.write(f"SOUR:PULM:INT:DEL {delay_s}")
        self.write(f"SOUR:PULM:DOUB {'ON' if double_pulse else 'OFF'}")
        self.check_errors()

    def sg_set_pulse_train(self, pulse_count: int) -> None:
        """Configure pulse train mode (SMW200A specific)."""
        self.write(f"SOUR:PULM:TREN:CNT {pulse_count}")
        self.write("SOUR:PULM:MODE TREN")
        self.check_errors()

    # ALC / Power
    def sg_set_alc(self, state: bool) -> None:
        self.write(f"SOUR:POW:ALC:STAT {'ON' if state else 'OFF'}")
        self.check_errors()

    def sg_set_offset_power(self, offset_db: float) -> None:
        self.write(f"SOUR:POW:LEV:IMM:OFFS {offset_db}")
        self.check_errors()

    # Reference Clock
    def sg_set_ref_clock(self, source: str = "INT") -> None:
        """source: INT, EXT"""
        self.write(f"SOUR:ROSC:SOUR {source}")
        self.check_errors()

    # Sweep
    def sg_set_sweep(self, start_hz: float, stop_hz: float,
                     step_hz: float = 1e6, dwell_s: float = 0.01,
                     shape: str = "SAWR") -> None:
        """shape: SAWR (sawtooth), TRI (triangle)"""
        self.write("SOUR:FREQ:MODE SWE")
        self.write(f"SOUR:FREQ:STAR {start_hz}")
        self.write(f"SOUR:FREQ:STOP {stop_hz}")
        self.write(f"SOUR:SWE:FREQ:STEP:LIN {step_hz}")
        self.write(f"SOUR:SWE:FREQ:DWEL {dwell_s}")
        self.write(f"SOUR:SWE:FREQ:SHAP {shape}")
        self.check_errors()

    def sg_start_sweep(self) -> None:
        self.write("SOUR:SWE:FREQ:EXEC")
        self.check_errors()

    def sg_stop_sweep(self) -> None:
        self.write("SOUR:FREQ:MODE CW")
        self.check_errors()

    # IQ / Baseband (SMW200A specific)
    def sg_set_baseband_clock(self, sample_rate_hz: float) -> None:
        self.write(f"SOUR:BB:ARB:SRAT {sample_rate_hz}")
        self.check_errors()

    def sg_upload_arb_iq(self, name: str, i_data: List[float], q_data: List[float],
                          sample_rate_hz: float = 100e6, force: bool = False) -> bool:
        """
        Uploads I/Q waveform to R&S SMW/SMBV in R&S native .wv format concept
        using binary block (MMEM:DATA). Implements granularity-4 and safety scaling.
        """
        if not force:
            cat = self.query("MMEM:CAT? '/var/user'")
            if f'"{name}.wv"' in cat:
                self.write(f"SOUR:BB:ARB:WAV:SEL '/var/user/{name}.wv'")
                self.write("SOUR:BB:ARB:STAT ON")
                return True

        if len(i_data) != len(q_data):
            return False

        # Granularity padding (R&S requires multiple of 4 samples)
        gran = 4
        while len(i_data) % gran != 0:
            i_data.append(i_data[-1])
            q_data.append(q_data[-1])

        # R&S uses int16 Little-Endian interleaved I,Q (opposite of Keysight)
        scale = 32767 * 0.707
        iq_bytes = bytearray()
        for i_val, q_val in zip(i_data, q_data):
            i_clamped = max(min(i_val, 1.0), -1.0)
            q_clamped = max(min(q_val, 1.0), -1.0)
            iq_bytes.extend(struct.pack("<hh", int(i_clamped * scale), int(q_clamped * scale)))

        # Upload via MMEM:DATA
        self.write_binary_block(f"MMEM:DATA '/var/user/{name}.wv',", bytes(iq_bytes))
        self.wait_for_opc()
        self.write(f"SOUR:BB:ARB:WAV:SEL '/var/user/{name}.wv'")
        self.write(f"SOUR:BB:ARB:SRAT {sample_rate_hz}")
        self.write("SOUR:BB:ARB:STAT ON")
        return len(self.check_errors()) == 0

    def sg_stop_arb(self) -> None:
        self.write("SOUR:BB:ARB:STAT OFF")

    def sg_get_complete_status(self) -> Dict[str, Any]:
        return {
            "idn": self.idn,
            "type": self.instrument_type,
            "address": self.address,
            "connected": self.is_connected,
            "freq_hz": self.sg_query_frequency(),
            "power_dbm": self.sg_query_power(),
            "rf_state": self.sg_query_rf_state(),
            "am_state": self.query("SOUR:AM:STAT?").strip() in ("1", "ON"),
            "am_depth": float(self.query("SOUR:AM:DEPT?") or 30),
            "fm_state": self.query("SOUR:FM:STAT?").strip() in ("1", "ON"),
            "fm_dev": float(self.query("SOUR:FM:DEV?") or 1000),
            "pm_state": self.query("SOUR:PM:STAT?").strip() in ("1", "ON"),
            "pulse_state": self.query("SOUR:PULM:STAT?").strip() in ("1", "ON"),
            "pulse_source": self.query("SOUR:PULM:SOUR?").strip(),
            "alc_state": self.query("SOUR:POW:ALC:STAT?").strip() in ("1", "ON"),
            "ref_clock": self.query("SOUR:ROSC:SOUR?").strip(),
        }

    # ────────────────────────────── VNA Controls (ZNB/ZNA/ZVA) ──────────────
    def vna_set_start_stop(self, start_hz: float, stop_hz: float, channel: int = 1) -> None:
        self.write(f"SENS{channel}:FREQ:STAR {start_hz}")
        self.write(f"SENS{channel}:FREQ:STOP {stop_hz}")
        self.check_errors()

    def vna_set_points(self, points: int, channel: int = 1) -> None:
        self.write(f"SENS{channel}:SWE:POIN {points}")
        self.check_errors()

    def vna_set_power(self, power_dbm: float, port: int = 1) -> None:
        self.write(f"SOUR:POW{port} {power_dbm}")
        self.check_errors()

    def vna_set_s_parameter(self, channel: int = 1, parameter: str = "S11") -> None:
        self.write(f"CALC{channel}:PAR:MEAS 'Tr1','{parameter}'")
        self.check_errors()

    def vna_get_sdata_complex(self, channel: int = 1) -> List[complex]:
        raw = self.query(f"CALC{channel}:DATA? SDATA")
        if self.simulation:
            return [complex(random.uniform(-1, 1), random.uniform(-1, 1)) for _ in range(201)]
        vals = [float(x) for x in raw.split(",") if x.strip()]
        return [complex(vals[i], vals[i + 1]) for i in range(0, len(vals) - 1, 2)]

    # ──────────────────────────── Oscilloscope Controls (RTO/RTB) ─────────────
    def osc_set_timebase(self, time_div_s: float) -> None:
        self.write(f"TIM:SCAL {time_div_s}")
        self.check_errors()

    def osc_set_channel(self, ch: int = 1, vdiv: float = 1.0,
                         coupling: str = "DC", state: bool = True) -> None:
        self.write(f"CHAN{ch}:SCAL {vdiv}")
        self.write(f"CHAN{ch}:COUP {coupling}")
        self.write(f"CHAN{ch}:STAT {'ON' if state else 'OFF'}")
        self.check_errors()

    def osc_acquire(self) -> None:
        self.write("RUN")
        self.wait_for_opc()

    def osc_get_waveform(self, ch: int = 1) -> List[float]:
        if self.simulation:
            return [math.sin(i * 0.1) + random.uniform(-0.1, 0.1) for i in range(1000)]
        raw = self.query(f"CHAN{ch}:DATA?")
        return [float(x) for x in raw.split(",") if x.strip()]

    # ─────────────────────────── Simulation Helpers ───────────────────────────
    def _generate_sim_trace_data(self, points: int = 1001) -> List[float]:
        center_idx = points // 2
        sig_width = points // 20
        result = []
        for i in range(points):
            noise = -100 + random.uniform(-2, 2)
            dist = abs(i - center_idx)
            peak = 80 * math.exp(-(dist ** 2) / (2 * (sig_width / 2) ** 2)) if dist < sig_width * 3 else 0
            result.append(noise + peak)
        return result
    def get_trace(self) -> List[Dict[str, Any]]:
        """Implementation from BaseInstrumentDriver."""
        return self.sa_get_trace_points(trace=1)

    def set_frequency(self, start: float, stop: float = 0) -> None:
        """Standardized frequency setter for R&S."""
        if stop > 0:
            self.sa_set_start_stop(start, stop)
        else:
            self.sg_set_frequency(start)
