from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.room import Room, RoomMember
from app.models.document import Document
from app.models.user import User
import random
import string

router = APIRouter(prefix="/rooms", tags=["rooms"])


async def generate_unique_code(db: AsyncSession) -> str:
    while True:
        code = ''.join(
            random.choices(
                string.ascii_uppercase + string.digits,
                k=6
            )
        )

        result = await db.execute(
            select(Room).where(Room.code == code)
        )

        if not result.scalar_one_or_none():
            return code


class CreateRoomRequest(BaseModel):
    name: str


class JoinRoomRequest(BaseModel):
    code: str


@router.post("/create")
async def create_room(
    req: CreateRoomRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    code = await generate_unique_code(db)

    room = Room(
        name=req.name,
        code=code,
        created_by=current_user.id
    )

    db.add(room)
    await db.flush()

    member = RoomMember(
        room_id=room.id,
        user_id=current_user.id
    )

    db.add(member)

    doc = Document(
        room_id=room.id,
        text_content="",
        canvas_content=[]
    )

    db.add(doc)

    await db.commit()
    await db.refresh(room)

    return {
        "id": room.id,
        "name": room.name,
        "code": room.code
    }


@router.post("/join")
async def join_room(
    req: JoinRoomRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Room).where(Room.code == req.code)
    )

    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    existing = await db.execute(
        select(RoomMember).where(
            RoomMember.room_id == room.id,
            RoomMember.user_id == current_user.id
        )
    )

    if not existing.scalar_one_or_none():
        member = RoomMember(
            room_id=room.id,
            user_id=current_user.id
        )

        db.add(member)
        await db.commit()

    return {
        "id": room.id,
        "name": room.name,
        "code": room.code
    }


@router.get("/my")
async def my_rooms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Room)
        .join(RoomMember)
        .where(RoomMember.user_id == current_user.id)
    )

    rooms = result.scalars().all()

    return [
        {
            "id": r.id,
            "name": r.name,
            "code": r.code
        }
        for r in rooms
    ]
