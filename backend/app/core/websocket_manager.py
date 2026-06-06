import json
import asyncio
from fastapi import WebSocket
import redis.asyncio as aioredis
from app.core.config import settings


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[dict]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, user_id: int, username: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append({
            "ws": websocket,
            "user_id": user_id,
            "username": username
        })

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id] = [
                c for c in self.active_connections[room_id]
                if c["ws"] != websocket
            ]

    async def publish(self, redis: aioredis.Redis, room_id: str, message: dict):
        await redis.publish(f"room:{room_id}", json.dumps(message))

    async def broadcast_local(self, room_id: str, message: dict):
        if room_id not in self.active_connections:
            return
        for conn in self.active_connections[room_id]:
            try:
                await conn["ws"].send_text(json.dumps(message))
            except Exception:
                pass

    async def listen_to_room(self, room_id: str):
        print(f"[PUBSUB] Starting listener for room {room_id}")
        subscriber = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = subscriber.pubsub()
        await pubsub.subscribe(f"room:{room_id}")
        print(f"[PUBSUB] Subscribed to room:{room_id}")
        try:
            async for raw_message in pubsub.listen():
                print(f"[PUBSUB] Got message: {raw_message}")
                if raw_message["type"] == "message":
                    message = json.loads(raw_message["data"])
                    print(
                        f"[PUBSUB] Broadcasting to {len(self.active_connections.get(room_id, []))} local connections")
                    await self.broadcast_local(room_id, message)
        except asyncio.CancelledError:
            await pubsub.unsubscribe(f"room:{room_id}")
            await subscriber.aclose()

    def get_connection_count(self, room_id: str) -> int:
        return len(self.active_connections.get(room_id, []))


manager = ConnectionManager()
