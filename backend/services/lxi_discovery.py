"""
FILE: services/lxi_discovery.py
ROLE: Low-Level Network Probing Engine.
TRIGGERS: backend/services/discovery_service.py.
TARGETS: Raw TCP Sockets and VXI-11 RPC ports on the subnet.
DESCRIPTION: Implements the low-level handshake logic to verify if a discovered IP hosts a valid SCPI instrument.
"""
import socket
import logging
from typing import List, Dict, Optional, Any
import struct

logger = logging.getLogger(__name__)

class LXIDiscoveryProtocol:
    """
    Advanced Discovery Service for LXI-compliant RF test instruments.
    Implements VXI-11 discovery broadcasts and mDNS (zeroconf/Bonjour)
    detecting instruments the moment they are plugged into the Ethernet switch.
    """

    # LXI Standard Port for VXI-11 Device Core
    # Configuration for multi-port discovery universe (SCPI, VXI-11, HiSLIP)
    PROBE_PORTS = [5025, 5024, 111, 4880, 49152] 
    # HiSLIP (High-Speed LAN Instrument Protocol) standard port
    HISLIP_PORT = 4880

    @classmethod
    def broadcast_vxi11_discover(cls, subnet_broadcast: str = "255.255.255.255") -> List[Dict[str, str]]:
        """
        Sends an ONC/RPC Portmapper broadcast to discover VXI-11 instruments on the local subnet.
        """
        discovered_devices = []
        
        # Standard RPC Portmap v2 CALL packet for 'getport' (Prog: 0x0607AF, Ver: 1, Proto: TCP)
        # 0x0607AF = 395183 (VXI-11 Device Core)
        rpc_call = struct.pack(">LLLLLLLLLLL", 
            0x12345678, # XID
            0,          # Call
            2,          # RPC Version
            100000,     # Program: Portmapper
            2,          # Version: 2
            3,          # Procedure: GETPORT
            0, 0,       # Credentials: NULL
            0, 0,       # Verifier: NULL
            395183,     # Prog: VXI-11
            1,          # Ver: 1
            6           # Proto: TCP
        )
        
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            sock.settimeout(1.5)
            
            sock.sendto(rpc_call, (subnet_broadcast, cls.VXI_11_PORT))
            
            while True:
                try:
                    data, addr = sock.recvfrom(1024)
                    ip_address = addr[0]
                    # Simple duplicate filter
                    if not any(d["ip"] == ip_address for d in discovered_devices):
                        discovered_devices.append({
                            "ip": ip_address,
                            "protocol": "VXI-11/LXI",
                            "resource": f"TCPIP0::{ip_address}::INSTR"
                        })
                except socket.timeout:
                    break
        except Exception as e:
            logger.debug(f"VXI-11 Broadcast skipped: {e}")
        finally:
            sock.close()
            
        return discovered_devices
        
    @classmethod
    def start_mdns_listener(cls, callback: Optional[Any] = None):
        """
        Starts an mDNS/zeroconf background listener for '_lxi._tcp.local.'
        Detects instruments the instant they are plugged into the network.
        """
        try:
            from zeroconf import Zeroconf, ServiceBrowser, ServiceListener

            class LXIListener(ServiceListener):
                def add_service(self, zc: Zeroconf, type_: str, name: str):
                    info = zc.get_service_info(type_, name)
                    if info:
                        addresses = [socket.inet_ntoa(addr) for addr in info.addresses]
                        ip = addresses[0] if addresses else "Unknown"
                        port = info.port
                        logger.info(f"[mDNS] LXI Device discovered: {name} at {ip}:{port}")
                        
                        # Extract IDN from TXT record if available
                        idn = "Unknown"
                        if info.properties:
                            # properties often contain idn, model, etc
                            idn_bytes = info.properties.get(b'idn', b'Unknown')
                            idn = idn_bytes.decode(errors='replace')

                        if callback:
                            import asyncio
                            # Schedule the async callback
                            try:
                                loop = asyncio.get_running_loop()
                                loop.create_task(callback(ip, port, idn))
                            except RuntimeError:
                                # Not in an event loop
                                pass

                def update_service(self, zc: Zeroconf, type_: str, name: str):
                    pass

                def remove_service(self, zc: Zeroconf, type_: str, name: str):
                    logger.info(f"[mDNS] LXI Device removed: {name}")

            zc = Zeroconf()
            browser = ServiceBrowser(zc, "_lxi._tcp.local.", LXIListener())
            logger.info("mDNS LXI Sentry: ACTIVE (Listening for _lxi._tcp.local.)")
            return zc, browser
        except Exception as e:
            logger.error(f"Failed to start mDNS listener: {e}")
            return None, None

lxi_discovery = LXIDiscoveryProtocol()
