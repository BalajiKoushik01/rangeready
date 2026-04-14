from typing import List
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
        """
        Sends a JSON-formatted message to all currently connected clients.
        
        Handles individual connection failures by disconnecting the faulty client.
        
        Args:
            message: A dictionary to be sent as JSON.
        """
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                # Catching any connection-related errors to ensure loop continuity
                print(f"WS: Failed to send to connection: {e}")
                self.disconnect(connection)

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
