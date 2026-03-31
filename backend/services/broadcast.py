from typing import List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"WS: Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"WS: Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        # We use a copy of the list to avoid issues with concurrent modification
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"WS: Failed to send to connection: {e}")
                self.disconnect(connection)

# Global instance
manager = ConnectionManager()
