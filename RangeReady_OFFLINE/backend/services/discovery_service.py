import socket
import concurrent.futures
from typing import List, Dict, Any
import asyncio
from services.visa_service import visa_service
from services.config_service import config_service
from services.broadcast import manager
from drivers.manifest_loader import ManifestLoader

class DiscoveryService:
    """
    Scans network subnets for valid VISA instruments.
    """
    def __init__(self, subnet: str = None):
        if subnet is None:
            # Detect local IP and set subnet
            try:
                hostname = socket.gethostname()
                local_ip = socket.gethostbyname(hostname)
                self.subnet = ".".join(local_ip.split(".")[:-1]) + "."
            except:
                self.subnet = "192.168.1."
        else:
            self.subnet = subnet

    async def broadcast_status(self, message: str, level: str = "INFO"):
        await manager.broadcast({
            "type": "discovery_status",
            "message": message,
            "level": level
        })

    async def scan_network(self) -> List[Dict[str, Any]]:
        """
        Scans a given subnet on standard VISA port (5025).
        Returns a list of discovered and identified instruments.
        """
        scan_msg = f"Scanning subnet {self.subnet}x for instruments..."
        print(scan_msg)
        await self.broadcast_status(scan_msg)
        
        discovered = []

        # If we are in mock mode, immediately return the dummy device
        if visa_service.use_mock:
            dummy_ip = "192.168.1.100"
            visa_service.connect(dummy_ip, as_mock=True)
            idn = visa_service.identify(dummy_ip)
            manifest = ManifestLoader.match_idn_string(idn)
            
            if manifest:
                discovered.append({
                    "ip": dummy_ip,
                    "idn": idn,
                    "manifest_id": manifest.id,
                    "model": manifest.instrument_class,
                    "manufacturer": manifest.manufacturer
                })
            return discovered

        # Actual Subnet Scanning (ThreadPool for speed)
        def check_port(ip: str) -> bool:
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.settimeout(0.2) # Fast timeout for local network
                    s.connect((ip, 5025))
                    return True
            except (socket.timeout, ConnectionRefusedError, OSError):
                return False

        ips_to_scan = [f"{self.subnet}{i}" for i in range(1, 255)]
        active_ips = []
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
            results = executor.map(check_port, ips_to_scan)
            for ip, is_active in zip(ips_to_scan, results):
                if is_active:
                    active_ips.append(ip)

        active_count = len(active_ips)
        await self.broadcast_status(f"Found {active_count} potential devices. Interrogating...", level="INFO")

        for ip in active_ips:
            await self.broadcast_status(f"Attempting handshake with {ip}...")
            if visa_service.connect(ip):
                idn = visa_service.identify(ip)
                if idn:
                    await self.broadcast_status(f"Success! Identified {ip} as: {idn}", level="SUCCESS")
                    # Auto-assign roles based on manifests
                    manifest = ManifestLoader.match_idn_string(idn)
                    role = "Unknown"
                    if manifest:
                        role = manifest.instrument_class
                        config_service.set_instrument_ip(role, ip)
                        await self.broadcast_status(f"Auto-mapped {ip} to role: {role}", level="SUCCESS")
                    else:
                        # Fallback simple matching
                        idn_upper = idn.upper()
                        if "ROHDE" in idn_upper or "R&S" in idn_upper:
                            role = "Spectrum Analyzer"
                        elif "KEYSIGHT" in idn_upper or "AGILENT" in idn_upper:
                            role = "Signal Generator"
                        
                        if role != "Unknown":
                            config_service.set_instrument_ip(role, ip)
                            await self.broadcast_status(f"Fallback matched {ip} to role: {role}", level="SUCCESS")

                    discovered.append({
                        "ip": ip,
                        "idn": idn,
                        "role": role,
                        "manifest_id": manifest.id if manifest else "Unknown",
                        "model": manifest.instrument_class if manifest else role,
                        "manufacturer": manifest.manufacturer if manifest else "Unknown"
                    })
                else:
                    await self.broadcast_status(f"Connected to {ip} but failed to read *IDN?", level="WARN")
                visa_service.disconnect(ip) # Disconnect after identification scan
            else:
                await self.broadcast_status(f"Handshake failed with {ip}.", level="WARN")

        await self.broadcast_status(f"Discovery complete. Configured {len(discovered)} instruments.", level="SUCCESS")
        return discovered

discovery_service = DiscoveryService()
