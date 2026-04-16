import socket
"""
FILE: services/discovery_service.py
ROLE: Background Network Sentry.
TRIGGERS: Backend startup (main.py), Global Toggle (system.py).
TARGETS: backend/services/lxi_discovery.py and backend/services/broadcast.py.
DESCRIPTION: Periodically scans the subnet for new SCPI-compatible hardware and broadcasts found assets to the GUI.
"""
import asyncio
import ifaddr
from typing import List, Dict, Any, Optional
from backend.services.broadcast import manager
from backend.drivers.plugin_manager import PluginManager
from backend.drivers.manifest_loader import ManifestLoader
from backend.services.config_service import config_service
from backend.services.asset_service import asset_service
from backend.models.instrument import Instrument
from backend.database import SessionLocal
import datetime


class DiscoveryService:
    # Configuration for multi-port discovery universe
    PROBE_PORTS = [5025, 5024, 111, 49152] 
    SCAN_TIMEOUT = 0.2 # Presentation Aggression: Faster probing

    def __init__(self):
        self._scanning = False
        self.active_subnets = []
        self._last_known_goods = set() # Cache for confirmed IPs

    def refresh_subnets(self):
        """Detects all local IPv4 subnets from active network interfaces (including 169.254.x.x)."""
        subnets = []
        adapters = ifaddr.get_adapters()
        for adapter in adapters:
            for ip in adapter.ips:
                if ip.is_IPv4 and not ip.ip.startswith("127."):
                    # Generate the .x.0 subnet prefix
                    subnet_prefix = ".".join(ip.ip.split(".")[:-1]) + "."
                    if subnet_prefix not in subnets:
                        subnets.append(subnet_prefix)
                        print(f"[Discovery] Detected active subnet range: {subnet_prefix}0/24")
        self.active_subnets = subnets
        return subnets

    async def broadcast_status(self, message: str, level: str = "INFO"):
        await manager.broadcast({
            "type": "discovery_status",
            "message": message,
            "level": level
        })

    async def broadcast_discovery_prompt(self, instrument_id: int, ip: str, info: Dict):
        """Sends a notification to the UI asking the user to switch to new hardware."""
        await manager.broadcast({
            "type": "discovery_prompt",
            "data": {
                "id": instrument_id,
                "ip": ip,
                "model": info.get("model", "Unknown"),
                "manufacturer": info.get("manufacturer", "Unknown"),
                "role": info.get("role", "Unknown"),
                "mode": info.get("mode", "Unknown")
            }
        })

    async def initialize_instrument(self, ip: str, role: str, manufacturer: str):
        """Initializes hardware to a safe, known state with mode-enforcement."""
        from backend.drivers.generic_scpi import GenericSCPIDriver
        from backend.drivers.manifest_loader import ManifestLoader
        
        # Priority: Personality-based initialization
        drv = GenericSCPIDriver(simulation=False)
        try:
            # Note: discovery_service.PROBE_PORTS logic find the correct port earlier
            # Here we assume the port is 5025 or was stored in config.
            # For simplicity in init, we try the known address.
            if drv.connect(ip):
                idn = drv.idn
                manifest = ManifestLoader.match_idn_string(idn)
                
                # Industry Best Practice: Enforce Operating Mode
                if manifest and manifest.discovery_probes:
                    target_mode = manifest.discovery_probes.get("expected_mode")
                    query_cmd = manifest.discovery_probes.get("query_mode")
                    
                    if target_mode and query_cmd:
                        current_mode = drv.query(query_cmd).strip().replace('"', '')
                        if current_mode != target_mode:
                            await self.broadcast_status(f"Enforcing {target_mode} mode on {ip}...", level="INFO")
                            drv.write(f"INST {target_mode}")
                            await asyncio.sleep(2) 
                
                # Generic Reset & Safe State
                drv.write("*RST")
                if "Signal Generator" in role:
                    drv.execute("set_frequency", value=1e9)
                    drv.execute("rf_off")
                elif "Spectrum Analyzer" in role:
                    drv.execute("sa_center", value=1e9)
                    drv.execute("sa_span", value=100e6)
                
                await self.broadcast_status(f"Initialized {role} ({manufacturer}) at {ip}", level="SUCCESS")
                drv.disconnect()
        except Exception as e:
            print(f"Setup error for {role} at ip {ip}: {e}")
            try: drv.disconnect()
            except: pass

    async def scan_network(self) -> List[Dict[str, Any]]:
        """
        Scans all detected local subnets on the standard SCPI port (5025).
        """
        if self._scanning:
            return []

        self._scanning = True
        self.refresh_subnets()
        
        if not self.active_subnets:
            await self.broadcast_status("No active network interfaces detected.", level="WARN")
            self._scanning = False
            return []

        ips_to_scan = self._get_ips_to_scan()
        await self.broadcast_status(f"Scanning {len(self.active_subnets)} subnets for hardware...", level="INFO")

        active_ips = await self._probe_network(ips_to_scan)
        
        discovered = []
        for ip in active_ips:
            res = await self._process_discovered_ip(ip)
            if res:
                discovered.append(res)

        self._scanning = False
        return discovered

    async def manual_discovery(self, ip: str) -> Optional[Dict[str, Any]]:
        """Direct, single-IP interrogation bypass for mission-critical overrides."""
        await self.broadcast_status(f"Initiating manual handshake for {ip}...", level="INFO")
        res = await self._process_discovered_ip(ip)
        if res:
            await self.broadcast_status(f"Manual override successful. {ip} secured.", level="SUCCESS")
        else:
            await self.broadcast_status(f"Manual discovery failed for {ip}. Check Physical Connection.", level="ERROR")
        return res

    def _get_ips_to_scan(self) -> List[str]:
        """Gathers list of candidate IPs across all subnets, excluding blacklist."""
        ips = []
        blacklist = config_service.get_blacklist()
        for sn in self.active_subnets:
            for i in range(1, 255):
                ip = f"{sn}{i}"
                if ip not in blacklist:
                    ips.append(ip)
        
        # Prioritize Last Known Goods
        for lkg in self._last_known_goods:
            if lkg in ips:
                ips.remove(lkg)
                ips.insert(0, lkg)

        return ips

    async def _probe_network(self, ips: List[str]) -> List[str]:
        """Probes multiple IPs concurrently across all standard hardware ports."""
        def check_ports(ip: str) -> bool:
            # Check most likely ports first (5025/5024) then fallback to VXI-11 (111)
            for port in self.PROBE_PORTS:
                try:
                    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                        s.settimeout(self.SCAN_TIMEOUT)
                        if s.connect_ex((ip, port)) == 0:
                            return True
                except:
                    continue
            return False

        loop = asyncio.get_event_loop()
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=60) as executor: # Aggressive concurrency
            results = list(await loop.run_in_executor(
                executor,
                lambda: list(executor.map(check_ports, ips))
            ))
        return [ip for ip, ok in zip(ips, results) if ok]

    async def handle_mdns_discovery(self, ip: str, port: int, idn: str):
        """Callback triggered by the mDNS listener."""
        logger.info(f"[mDNS] Rapid Handshake triggered for {ip}:{port}")
        # Only process if not already confirmed recently
        if ip not in self._last_known_goods:
            await self._process_discovered_ip(ip)

    async def _process_discovered_ip(self, ip: str) -> Optional[Dict[str, Any]]:
        """Handshakes and identifies an instrument at a specific IP by scanning ports."""
        # Find which port actually replied
        discovered_port = 5025
        for port in self.PROBE_PORTS:
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.settimeout(self.SCAN_TIMEOUT)
                    if s.connect_ex((ip, port)) == 0:
                        discovered_port = port
                        break
            except: continue

        from backend.drivers.generic_scpi import GenericSCPIDriver
        driver = GenericSCPIDriver(simulation=False)
        try:
            if not driver.connect(ip, port=discovered_port):
                return None
                
            idn = driver.idn
            if not idn:
                driver.disconnect()
                return None

            await self.broadcast_status(f"Handshaking with {ip}:{discovered_port}...", level="INFO")
            
            # Discovery 2.0: Deep Interrogation (The AI Profiler)
            await self.broadcast_status(f"Analyzing {ip} manufacturer protocols...", level="INFO")
            personality = await self._interrogate_personality(driver)
            info = self._identify_instrument(idn)
            
            # Merge decoded personality into info
            info.update(personality)
            await self.broadcast_status(f"Profile Secured: {info['manufacturer']} {info.get('model')} ({info.get('mode')} mode)", level="SUCCESS")
            
            # Industry Best Practice: Auto-Register into Database
            instrument_id = self._auto_register_instrument(ip, discovered_port, info, idn)
            self._last_known_goods.add(ip)
            
            # Check if we should auto-activate or prompt
            active_now = asset_service.get_active_instrument(info["role"])
            
            if not active_now:
                # Case 1: First device found → Auto-Activate
                await asset_service.activate_instrument(instrument_id)
                await self.broadcast_status(f"Auto-Activated {info['manufacturer']} {info['model']} at {ip}", level="SUCCESS")
                # Async initialization (Stateful)
                asyncio.create_task(self.initialize_instrument(ip, info["role"], info["manufacturer"]))
            else:
                # Case 2: New device found while one is active → Prompt User
                await self.broadcast_discovery_prompt(instrument_id, ip, info)
                await self.broadcast_status(f"New {info['manufacturer']} detected at {ip}. Awaiting switch approval.", level="INFO")
            
            driver.disconnect()
            return {"id": instrument_id, "status": "processed"}
            
        except Exception as e:
            logger.error(f"[DISCOVERY] Critical failure interrogating {ip}: {e}")
            try: driver.disconnect()
            except: pass
            return None


    async def _interrogate_personality(self, driver) -> Dict[str, str]:
        """Discovery 2.0: Queries mode and options to build personality profile using AI assistance."""
        try:
            # 1. Decode Mode (Legacy SCPI Check)
            mode = "Default"
            for cmd in ["INST:SEL?", "INST?", "SYST:MODE?", "SOUR:FREQ:MODE?"]:
                try:
                    res = driver.query(cmd).strip().replace('"', '')
                    if res:
                        mode = res
                        break
                except: continue
                
            # 2. Decode Options
            opts = driver.query("*OPT?").strip()
            
            # AI Profiler Bypass: If mode is unknown, ask the AI brain to hypothesize
            if mode == "Default" or "Unknown" in mode:
                from backend.services.ai_copilot import ai_copilot
                if ai_copilot.is_available():
                    idn = driver.idn
                    log_msg = f"Unknown hardware behavior at {driver.address}. Consulting AI Profiler..."
                    await self.broadcast_status(log_msg, level="INFO")
                    
                    guess = ai_copilot.translate_to_scpi(
                        f"Analyze this instrument based on IDN: '{idn}'. Answer with ONLY 'Signal Generator', 'Spectrum Analyzer', or 'Network Analyzer'.",
                        idn_context=idn
                    )
                    if guess and "Analyzer" in guess or "Generator" in guess:
                        mode = f"AI Guess: {guess}"
            
            return {"mode": mode, "options": opts}
        except:
            return {"mode": "Unknown", "options": "None"}

    def _auto_register_instrument(self, ip: str, port: int, info: Dict, idn: str) -> int:
        """Persists discovered hardware to the DB using Industry best practices."""
        db = SessionLocal()
        try:
            # Model & Serial from IDN
            parts = idn.split(',')
            model = parts[1] if len(parts) > 1 else "Unknown"
            serial = parts[2] if len(parts) > 2 else f"DISC-{ip.replace('.', '-')}"
            
            # Check if exists
            existing = db.query(Instrument).filter(Instrument.serial_number == serial).first()
            
            if existing:
                existing.address = ip
                existing.last_seen = datetime.datetime.utcnow()
                db.commit()
                return existing.id
            
            # Create new entry
            new_inst = Instrument(
                name=f"Auto-{model}-{ip.split('.')[-1]}",
                model=model,
                serial_number=serial,
                connection_type="TCPIP",
                address=ip,
                driver_id=info.get("suggested_driver", "GenericSCPIDriver"),
                instrument_class=info.get("instrument_class", info.get("role", "generic")).lower().replace(" ", "_"),
                vendor=info.get("manufacturer", "Unknown"),
                is_active=True
            )
            db.add(new_inst)
            db.commit()
            db.refresh(new_inst)
            return new_inst.id
        except Exception as e:
            print(f"Auto-Reg Error: {e}")
            return -1
        finally:
            db.close()

    def _identify_instrument(self, idn: str) -> Dict[str, str]:
        """Maps an IDN string to hardware family metadata."""
        idn_upper = idn.upper()
        manifest = ManifestLoader.match_idn_string(idn)
        
        # Standard vendor mappings
        vendor = "Unknown"
        driver = "GenericSCPIDriver"
        role = "Unknown"
        model = "Unknown"
        
        parts = idn.split(',')
        if len(parts) > 1: model = parts[1]

        if "KEYSIGHT" in idn_upper or "AGILENT" in idn_upper:
            vendor = "Keysight"
            driver = "KeysightUniversalDriver"
            role = "Signal Generator"
        elif "ROHDE" in idn_upper or "R&S" in idn_upper:
            vendor = "R&S"
            driver = "RSUniversalDriver"
            role = "Spectrum Analyzer"
        elif manifest:
            vendor = manifest.manufacturer
            role = manifest.instrument_class
            driver = "GenericSCPIDriver"

        return {
            "manufacturer": vendor,
            "role": role,
            "suggested_driver": driver,
            "model": model,
            "instrument_class": role
        }

    async def background_discovery_task(self):
        """
        Adaptive polling loop:
        - 5s if zero instruments are connected.
        - 300s (5m) once hardware is found to minimize CPU usage.
        """
        await asyncio.sleep(5)  # Quick start
        while True:
            try:
                # Respect manual toggle from GUI
                if not config_service._config.get("discovery_active", True):
                    await asyncio.sleep(10)
                    continue

                # Execute scan
                await self.scan_network()
                
                # Big Day Strategy: Stop-After-One (if configured)
                # We check the actual database via config_service context
                primary_connected = False
                try:
                    # If we have at least one active instrument of any role, we might stop
                    sg_ip = config_service.get_instrument_ip("Signal Generator")
                    sa_ip = config_service.get_instrument_ip("Spectrum Analyzer")
                    if sg_ip or sa_ip:
                        primary_connected = True
                except: pass
                
                if config_service._config.get("discovery_stop_after_one", False) and primary_connected:
                    await self.broadcast_status("Discovery Paused: Hardware secured. System locked for performance.", level="INFO")
                    # We don't exit the loop, but we sleep much longer
                    await asyncio.sleep(60)
                    continue

                interval = 5 if not primary_connected else 300
                await asyncio.sleep(interval)
            except Exception as e:
                print(f"Discovery Loop Error: {e}")
                await asyncio.sleep(10)


discovery_service = DiscoveryService()
