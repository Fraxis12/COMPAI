"""
Gestor de conexiones WebSocket para dashboard en vivo de sensores.
"""
from fastapi import WebSocket
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Maneja conexiones WebSocket activas por usuario."""

    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, usuario_id: int, websocket: WebSocket):
        """Acepta nueva conexión WebSocket y la registra."""
        await websocket.accept()
        if usuario_id not in self.active_connections:
            self.active_connections[usuario_id] = []
        self.active_connections[usuario_id].append(websocket)
        logger.info(f"WebSocket conectado para usuario {usuario_id}")

    async def disconnect(self, usuario_id: int, websocket: WebSocket):
        """Desconecta WebSocket y lo elimina del registro."""
        if usuario_id in self.active_connections:
            self.active_connections[usuario_id].remove(websocket)
            if not self.active_connections[usuario_id]:
                del self.active_connections[usuario_id]
            logger.info(f"WebSocket desconectado para usuario {usuario_id}")

    async def broadcast_to_user(self, usuario_id: int, data: dict):
        """Envía datos a todos los WebSockets de un usuario."""
        if usuario_id in self.active_connections:
            for connection in self.active_connections[usuario_id]:
                try:
                    await connection.send_json(data)
                except Exception as e:
                    logger.error(f"Error enviando dato a WebSocket: {e}")


manager = ConnectionManager()
