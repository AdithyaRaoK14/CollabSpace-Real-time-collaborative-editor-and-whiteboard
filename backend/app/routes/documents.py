from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError, jwt
from app.core.database import get_db, AsyncSessionLocal
from app.core.config import settings
from app.core.redis import get_redis
from app.core.websocket_manager import manager
from app.models.document import Document
from app.models.room import RoomMember
from app.models.user import User
import json
import time
import asyncio

router = APIRouter(prefix="/documents", tags=["documents"])

room_listeners: dict[str, asyncio.Task] = {}


async def get_user_from_token(token: str, db: AsyncSession):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY,
                             algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    except Exception:
        return None


@router.get("/{room_id}")
async def get_document(room_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.room_id == room_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"text_content": doc.text_content, "canvas_content": doc.canvas_content, "version": doc.version}


@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: int, token: str):
    async with AsyncSessionLocal() as db:
        user = await get_user_from_token(token, db)
        if not user:
            await websocket.close(code=4001)
            return

        member_result = await db.execute(
            select(RoomMember).where(RoomMember.room_id ==
                                     room_id, RoomMember.user_id == user.id)
        )
        if not member_result.scalar_one_or_none():
            await websocket.close(code=4003)
            return

    await manager.connect(websocket, str(room_id), user.id, user.username)
    redis = await get_redis()

    if str(room_id) not in room_listeners or room_listeners[str(room_id)].done():
        task = asyncio.create_task(manager.listen_to_room(str(room_id)))
        room_listeners[str(room_id)] = task

    presence_key = f"room:{room_id}:presence"
    await redis.hset(presence_key, str(user.id), user.username)
    await redis.expire(presence_key, 3600)

    presence = await redis.hgetall(presence_key)
    await manager.publish(redis, str(room_id), {
        "type": "presence",
        "users": presence
    })

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type")

            if msg_type == "text_edit":
                async with AsyncSessionLocal() as write_db:
                    result = await write_db.execute(select(Document).where(Document.room_id == room_id))
                    doc = result.scalar_one_or_none()
                    if doc:
                        doc.text_content = msg.get("content", "")
                        doc.version += 1
                        version = doc.version
                        await write_db.commit()
                await manager.publish(redis, str(room_id), {
                    "type": "text_edit",
                    "content": msg.get("content"),
                    "sender": user.username,
                    "sender_id": user.id,
                    "version": version,
                    "timestamp": time.time()
                })

            elif msg_type == "canvas_edit":
                async with AsyncSessionLocal() as write_db:
                    result = await write_db.execute(select(Document).where(Document.room_id == room_id))
                    doc = result.scalar_one_or_none()
                    if doc:
                        doc.canvas_content = msg.get("content", [])
                        doc.version += 1
                        await write_db.commit()
                await manager.publish(redis, str(room_id), {
                    "type": "canvas_edit",
                    "content": msg.get("content"),
                    "sender": user.username,
                    "sender_id": user.id,
                    "timestamp": time.time()
                })

            elif msg_type == "typing":
                await manager.publish(redis, str(room_id), {
                    "type": "typing",
                    "user": user.username,
                    "sender_id": user.id,
                    "is_typing": msg.get("is_typing", False)
                })

            elif msg_type == "cursor":
                await manager.publish(redis, str(room_id), {
                    "type": "cursor",
                    "user": user.username,
                    "sender_id": user.id,
                    "position": msg.get("position")
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket, str(room_id))
        await redis.hdel(presence_key, str(user.id))
        presence = await redis.hgetall(presence_key)
        await manager.publish(redis, str(room_id), {
            "type": "presence",
            "users": presence
        })
        if manager.get_connection_count(str(room_id)) == 0:
            if str(room_id) in room_listeners:
                room_listeners[str(room_id)].cancel()
                del room_listeners[str(room_id)]
