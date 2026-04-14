import time
import socket
from typing import List, Dict, Any
from .visa_service import visa_service
from drivers.manifest_loader import ManifestLoader

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
        if not visa_service.use_mock:
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
    def __init__(self, sequence: List[Dict[str, Any]], instruments: Dict[str, str], trm_ip: str, ws_manager=None):
        """
        Initializes the sequence engine.
        
        Args:
            sequence: List of step dictionaries defining the test workflow.
            instruments: Mapping of role names to VISA addresses/IPs.
            trm_ip: IP address of the TRM controller.
            ws_manager: Optional ConnectionManager for live broadcasting.
        """
        self.sequence = sequence
        self.instruments = instruments
        self.trm_controller = TRMController(trm_ip)
        self.log = []
        self.ws_manager = ws_manager
        
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
        
        Iterates through steps asynchronously, coordinating the hardware
        orchestration with synchronized bus traceability.
        """
        for step in self.sequence:
            step_type = step.get("type")
            name = step.get("name", "Unnamed Step")
            
            try:
                if step_type == "INSTRUMENT_CONFIG":
                    target_role = step.get("target_role")
                    ip = self.instruments.get(target_role)
                    if not ip:
                        raise ValueError(f"No IP mapped for {target_role}")
                    
                    cmd_template = step.get("command")
                    visa_service.write(ip, cmd_template)
                    await self.log_event(name, "SUCCESS", raw_packet=cmd_template)
                    
                elif step_type == "DUT_COMMAND":
                    cmd = step.get("command")
                    self.trm_controller.send_command(cmd)
                    await self.log_event(name, "SUCCESS", raw_packet=f"UDP_SEND: {cmd}")
                    
                elif step_type == "WAIT":
                    ms = step.get("duration_ms", 1000)
                    import asyncio
                    await asyncio.sleep(ms / 1000.0)
                    await self.log_event(name, "SUCCESS", value=f"Dwell: {ms}ms", raw_packet="INTERNAL_WAIT")
                    
                elif step_type == "MEASURE":
                    target_role = step.get("target_role")
                    ip = self.instruments.get(target_role)
                    cmd = step.get("command")
                    result = visa_service.query(ip, cmd)
                    await self.log_event(name, "SUCCESS", value=result, raw_packet=cmd)
            
            except (ValueError, socket.error, RuntimeError) as e:
                await self.log_event(name, "ERROR", value=f"Hardware/Network Error: {str(e)}", raw_packet="BUS_FAULT")
                break
            except Exception as e:
                await self.log_event(name, "CRITICAL", value=f"Engine Logic Error: {str(e)}", raw_packet="ENGINE_FAULT")
                break
                
        return self.log
