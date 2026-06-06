from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, select
from sqlalchemy.orm import Mapped, mapped_column

from core.db import AsyncSession
from models.base import Base


class EventCoHost(Base):
    __tablename__ = "event_co_hosts"
    __table_args__ = (
        UniqueConstraint("event_id", "admin_id", name="uq_event_co_hosts_event_admin"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, nullable=False)
    event_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
    )
    admin_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("admins.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        nullable=False,
    )

    @classmethod
    async def create(
        cls,
        session: AsyncSession,
        event_id: int,
        admin_id: int,
    ) -> "EventCoHost":
        from models.admin import Admin
        from models.event import Event

        await Event.get_by_id(session, event_id)
        await Admin.get_by_id(session, admin_id)

        existing = await session.execute(
            select(cls).where(cls.event_id == event_id, cls.admin_id == admin_id)
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"Admin {admin_id}는 이미 Event {event_id}의 co-host입니다.")

        co_host = EventCoHost(event_id=event_id, admin_id=admin_id)
        session.add(co_host)
        await session.commit()
        await session.refresh(co_host)
        return co_host

    @classmethod
    async def get_by_event(cls, session: AsyncSession, event_id: int) -> list["EventCoHost"]:
        result = await session.execute(select(cls).where(cls.event_id == event_id))
        return list(result.scalars().all())

    @classmethod
    async def get_by_admin(cls, session: AsyncSession, admin_id: int) -> list["EventCoHost"]:
        result = await session.execute(select(cls).where(cls.admin_id == admin_id))
        return list(result.scalars().all())

    @classmethod
    async def get_by_event_and_admin(
        cls,
        session: AsyncSession,
        event_id: int,
        admin_id: int,
    ) -> Optional["EventCoHost"]:
        result = await session.execute(
            select(cls).where(cls.event_id == event_id, cls.admin_id == admin_id)
        )
        return result.scalar_one_or_none()
