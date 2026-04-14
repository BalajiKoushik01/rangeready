from backend.drivers.plugin_manager import PluginManager
from backend.drivers.base_driver import BaseInstrumentDriver
import os
import json
import socket
import time
import asyncio
from typing import List, Dict, Any

class TRMController:
    """
    Handles direct Ethernet communication to the Transmit/Receive (TR) Module.
    
    This controller is responsible for sending digital commands to the DUT (Device Under Test)
    hardware over the local network via UDP/TCP.
    """
    def __init__(self, ip: str, port: int = 5000):
        """
        Initializes the TRM controller.
        
        Args:
            ip: IPv4 address of the TRM module.
            port: UDP/TCP port for command communication.
        """
        self.ip = ip
        self.port = port
        
    def send_command(self, command_str: str):
        """
        Transmits a digital command string to the TRM hardware.
        
        Args:
            command_str: The raw command string to send.
        """
        print(f"TRM Controller [{self.ip}:{self.port}] COMMAND: {command_str}")
        from backend.services.config_service import config_service
        if not config_service.is_simulation_mode():
            try:
                # Digital interface usually uses UDP for low-latency command strobes
                with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                    s.settimeout(1.0)
                    s.sendto(command_str.encode('utf-8'), (self.ip, self.port))
            except socket.error as e:
                print(f"TRM Network Error: {e}")
            except Exception as e:
                print(f"TRM Unexpected Error: {e}")

class SequenceEngine:
    """
    Automated execution engine for test sequences.
    
    This engine iterates through a list of test steps, coordinating instrument
    configuration, DUT commands, and measurements. It broadcasts real-time 
    telemetry to any connected WebSocket clients.
    """
    def __init__(self, sequence: List[Dict[str, Any]], instruments: Dict[str, str], trm_ip: str, ws_manager=None, simulation: bool = False):
        """
        Initializes the sequence engine.
        
        Args:
            sequence: List of step dictionaries defining the test workflow.
            instruments: Mapping of role names to VISA addresses/IPs.
            trm_ip: IP address of the TRM controller.
            ws_manager: Optional ConnectionManager for live broadcasting.
            simulation: Global flag for hardware simulation.
        """
        self.sequence = sequence
        self.instruments = instruments
        self.trm_controller = TRMController(trm_ip)
        self.log = []
        self.ws_manager = ws_manager
        self.simulation = simulation
        self.active_drivers: Dict[str, BaseInstrumentDriver] = {}
        
    async def log_event(self, step_name: str, status: str, value: Any = None, raw_packet: str = None):
        """
        Logs a test step event and broadcasts it to the live UI with full traceability.
        
        Args:
            step_name: Name of the current test step.
            status: Success/Error status of the step.
            value: Optional measurement result or error message.
            raw_packet: Raw SCPI/Ethernet command string for bus traceability.
        """
        event = {
            "timestamp": time.time(),
            "step": step_name,
            "status": status,
            "value": value,
            "raw_packet": raw_packet
        }
        self.log.append(event)
        print(f"SEQ LOG: {event}")
        
        if self.ws_manager:
            # Notify UI of the step status and background bus traffic
            await self.ws_manager.broadcast_status({
                "message": f"[{status}] {step_name}",
                "traceability": {
                    "step": step_name,
                    "bus_traffic": raw_packet,
                    "response": str(value) if value else None
                }
            })
            
            # Special handling for measurement values that contain trace data
            import json
            if isinstance(value, str) and value.startswith("[") and value.endswith("]"):
                try:
                    trace_array = json.loads(value)
                    await self.ws_manager.broadcast_trace(trace_array, {"step": step_name})
                except json.JSONDecodeError:
                    pass
                except Exception:
                    pass
        
    async def execute(self):
        """
        Primary execution loop for the test sequence.
        """
        for step in self.sequence:
            try:
                await self._execute_step(step)
            except (ValueError, socket.error, RuntimeError, OSError) as e:
                error_msg = f"Hardware/Network Fault: {str(e)}"
                await self.log_event(step.get("name", "Unnamed"), "ERROR", value=error_msg, raw_packet="BUS_FAULT")
                if self.ws_manager:
                    await self.ws_manager.broadcast_status(f"CRITICAL: {error_msg}. Check cables or switch to SIMULATION.")
                break
            except Exception as e:
                error_msg = f"In-Sequence Logic Error: {str(e)}"
                await self.log_event(step.get("name", "Unnamed"), "CRITICAL", value=error_msg, raw_packet="ENGINE_FAULT")
                break
        
        # Cleanup connections
        for driver in self.active_drivers.values():
            try: driver.disconnect()
            except: pass
        self.active_drivers.clear()
        return self.log

    async def _execute_step(self, step: Dict[str, Any]):
        """Dispatches a step to the appropriate handler based on its type."""
        step_type = step.get("type")
        name = step.get("name", "Unnamed Step")

        if step_type == "INSTRUMENT_CONFIG":
            await self._handle_config_step(name, step)
        elif step_type == "DUT_COMMAND":
            await self._handle_dut_step(name, step)
        elif step_type == "WAIT":
            await self._handle_wait_step(name, step)
        elif step_type == "MEASURE":
            await self._handle_measure_step(name, step)

    async def _handle_config_step(self, name: str, step: Dict[str, Any]):
        target_role = step.get("target_role")
        address = self.instruments.get(target_role)
        if not address: raise ValueError(f"No address mapped for {target_role}")
        
        driver = self._get_driver_for_role(target_role)
        driver.connect(address)
        cmd = step.get("command")
        driver.send_command(cmd)
        await self.log_event(name, "SUCCESS", raw_packet=cmd)

    async def _handle_dut_step(self, name: str, step: Dict[str, Any]):
        cmd = step.get("command")
        self.trm_controller.send_command(cmd)
        await self.log_event(name, "SUCCESS", raw_packet=f"UDP_SEND: {cmd}")

    async def _handle_wait_step(self, name: str, step: Dict[str, Any]):
        ms = step.get("duration_ms", 1000)
        await asyncio.sleep(ms / 1000.0)
        await self.log_event(name, "SUCCESS", value=f"Dwell: {ms}ms", raw_packet="INTERNAL_WAIT")

    async def _handle_measure_step(self, name: str, step: Dict[str, Any]):
        target_role = step.get("target_role")
        address = self.instruments.get(target_role)
        if not address: raise ValueError(f"No address mapped for {target_role}")
        cmd = step.get("command")
        
        driver = self._get_driver_for_role(target_role)
        driver.connect(address)
        
        if "TRAC" in cmd or "get_trace" in cmd:
            result = json.dumps(driver.get_trace())
        else:
            result = driver.query(cmd)
        await self.log_event(name, "SUCCESS", value=result, raw_packet=cmd)

    def _get_driver_for_role(self, role: str) -> BaseInstrumentDriver:
        """Determines the correct driver plugin based on the instrument role name."""
        if role in self.active_drivers:
            return self.active_drivers[role]
            
        # Basic heuristic for mapping roles to driver classes
        driver_name = "KeysightUniversalDriver"
        if "Analyzer" in role or "Spectrum" in role:
            driver_name = "RSUniversalDriver"
            
        driver = PluginManager.get_driver(driver_name, simulation=self.simulation)
        self.active_drivers[role] = driver
        return driver
