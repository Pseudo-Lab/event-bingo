from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

from sqlalchemy import Integer, Boolean, DateTime, ForeignKey, UniqueConstraint, select, func
from sqlalchemy.orm import Mapped, mapped_column
from core.db import AsyncSession
from models.base import Base


class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (
        UniqueConstraint("event_id", "room_number", name="uq_rooms_event_room_number"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id"), nullable=False)
    room_number: Mapped[int] = mapped_column(Integer, nullable=False)
    is_open: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        nullable=False,
    )

    @classmethod
    async def get_by_id(cls, session: AsyncSession, room_id: int) -> "Room":
        result = await session.get(cls, room_id)
        if not result:
            raise ValueError(f"Room ID {room_id}가 존재하지 않습니다.")
        return result

    @classmethod
    async def get_by_event(cls, session: AsyncSession, event_id: int):
        result = await session.execute(
            select(cls).where(cls.event_id == event_id).order_by(cls.room_number)
        )
        return result.scalars().all()

    @classmethod
    async def get_or_create_open_room(cls, session: AsyncSession, event_id: int, max_per_room: int) -> "Room":
        """열린 방을 찾거나 새로 생성. Race condition 방지를 위해 FOR UPDATE 사용."""
        from models.event_attendee import EventAttendee

        # 열린 방 찾기 (FOR UPDATE로 동시 접근 방지)
        stmt = (
            select(cls)
            .where(cls.event_id == event_id, cls.is_open == True)
            .order_by(cls.room_number)
            .limit(1)
            .with_for_update()
        )
        result = await session.execute(stmt)
        room = result.scalar_one_or_none()

        if room:
            return room

        # 새 방 생성
        max_num_result = await session.execute(
            select(func.coalesce(func.max(cls.room_number), 0)).where(cls.event_id == event_id)
        )
        next_number = max_num_result.scalar() + 1

        new_room = Room(event_id=event_id, room_number=next_number, is_open=True)
        session.add(new_room)
        await session.flush()
        return new_room

    @classmethod
    async def get_participant_count(cls, session: AsyncSession, room_id: int) -> int:
        from models.event_attendee import EventAttendee
        result = await session.execute(
            select(func.count(EventAttendee.id)).where(EventAttendee.room_id == room_id)
        )
        return result.scalar() or 0

    @classmethod
    async def mark_full(cls, session: AsyncSession, room_id: int):
        room = await cls.get_by_id(session, room_id)
        room.is_open = False

