from typing import List
"""
FILE: services/broadcast.py
ROLE: WebSocket Connection Manager.
TRIGGERS: backend/routers/commands.py, backend/services/status_poller.py.
TARGETS: All connected frontend clients.
DESCRIPTION: Manages active WebSocket connections and broadcasts telemetry packets and status updates in real-time.
"""
from fastapi import WebSocket

class ConnectionManager:
    """
    Manages active WebSocket connections for real-time telemetry broadcasting.
    
    This manager tracks all connected clients and provide methods to broadcast
    different types of messages (traces, status updates, etc.) to all of them.
    """
    def __init__(self):
        """Initializes the manager with an empty list of active connections."""
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """
        Accepts a new WebSocket connection and adds it to the active list.
        
        Args:
            websocket: The incoming WebSocket connection from FastAPI.
        """
        try:
            await websocket.accept()
            self.active_connections.append(websocket)
            print(f"WS: Client connected. Total: {len(self.active_connections)}")
        except Exception as e:
            print(f"WS: Connection acceptance failed: {e}")

    def disconnect(self, websocket: WebSocket):
        """
        Removes a WebSocket connection from the active list.
        
        Args:
            websocket: The WebSocket connection to remove.
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"WS: Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Standard JSON broadcast to all active subscribers."""
        if not self.active_connections:
            return
        
        # Add timestamp if missing
        if "timestamp" not in message:
            import datetime
            message["timestamp"] = datetime.datetime.now().isoformat()

        dead_links = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_links.append(connection)
        
        for dead in dead_links:
            self.disconnect(dead)

    async def broadcast_bytes(self, data: bytes):
        """High-Performance Binary broadcast to all active subscribers."""
        if not self.active_connections:
            return
            
        dead_links = []
        for connection in self.active_connections:
            try:
                await connection.send_bytes(data)
            except Exception:
                dead_links.append(connection)
        
        for dead in dead_links:
            self.disconnect(dead)

    async def broadcast_log(self, level: str, message: str, logger_name: str):
        """Specialized broadcast for industrial backend logs."""
        await self.broadcast({
            "type": "system_log",
            "level": level,
            "message": message,
            "source": logger_name
        })

    async def broadcast_trace(self, trace_data: List[float], metadata: dict = None):
        """
        Broadcasts high-density RF trace telemetry data.
        
        This is optimized for the frontend UPlotChart component.
        
        Args:
            trace_data: List of amplitude points.
            metadata: Optional dictionary with additional context (e.g., step name).
        """
        message = {
            "type": "trace_update",
            "data": trace_data,
            "metadata": metadata or {}
        }
        await self.broadcast(message)

    async def broadcast_binary_trace(self, trace_data: List[float], instrument_id: str = "SA1"):
        """
        Ultra-High Speed: Broadcasts trace as a raw binary blob.
        Packet Structure: [Header: 4 chars][ID length: 1 byte][ID][Point Count: 4 bytes][Payload: Float32s]
        """
        import struct
        header = b"TRCE"
        id_bytes = instrument_id.encode()
        payload = struct.pack(f"<{len(trace_data)}f", *trace_data)
        
        packet = header + struct.pack("B", len(id_bytes)) + id_bytes + struct.pack("<I", len(trace_data)) + payload
        await self.broadcast_bytes(packet)
        
    async def broadcast_status(self, status_msg: str):
        """
        Broadcasts a simple status or event message to the UI.
        
        Args:
            status_msg: The string message to broadcast.
        """
        message = {
            "type": "status_update",
            "message": status_msg
        }
        await self.broadcast(message)

# Global singleton instance for use across the application
manager = ConnectionManager()
