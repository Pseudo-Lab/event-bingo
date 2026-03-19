from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional
import enum

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, select
from sqlalchemy.orm import Mapped, mapped_column

from core.db import AsyncSession
from models.base import Base


class EventManagerRequestStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class EventManagerRequest(Base):
    __tablename__ = "event_manager_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    organization: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    event_name: Mapped[str] = mapped_column(String(120), nullable=False)
    event_purpose: Mapped[str] = mapped_column(Text, nullable=False)
    expected_event_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expected_attendee_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[EventManagerRequestStatus] = mapped_column(
        Enum(EventManagerRequestStatus),
        nullable=False,
        default=EventManagerRequestStatus.PENDING,
    )
    review_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by_admin_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("admins.id"),
        nullable=True,
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        onupdate=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        nullable=False,
    )

    @classmethod
    async def create(
        cls,
        session: AsyncSession,
        *,
        name: str,
        email: str,
        organization: Optional[str],
        event_name: str,
        event_purpose: str,
        expected_event_date: Optional[datetime],
        expected_attendee_count: Optional[int],
        notes: Optional[str],
    ) -> "EventManagerRequest":
        request = cls(
            name=name,
            email=email,
            organization=organization,
            event_name=event_name,
            event_purpose=event_purpose,
            expected_event_date=expected_event_date,
            expected_attendee_count=expected_attendee_count,
            notes=notes,
        )
        session.add(request)
        await session.commit()
        await session.refresh(request)
        return request

    @classmethod
    async def get_by_id(
        cls,
        session: AsyncSession,
        request_id: int,
    ) -> "EventManagerRequest":
        request = await session.get(cls, request_id)
        if not request:
            raise ValueError(f"신청 ID {request_id}를 찾을 수 없습니다.")
        return request

    @classmethod
    async def get_all(cls, session: AsyncSession) -> list["EventManagerRequest"]:
        result = await session.execute(select(cls).order_by(cls.created_at.desc()))
        items = list(result.scalars().all())
        status_priority = {
            EventManagerRequestStatus.PENDING: 0,
            EventManagerRequestStatus.APPROVED: 1,
            EventManagerRequestStatus.REJECTED: 2,
        }
        return sorted(
            items,
            key=lambda item: (
                status_priority.get(item.status, 99),
                -item.created_at.timestamp(),
            ),
        )

    @classmethod
    async def update_review(
        cls,
        session: AsyncSession,
        request_id: int,
        *,
        status: EventManagerRequestStatus,
        review_note: Optional[str],
        reviewed_by_admin_id: int,
    ) -> "EventManagerRequest":
        request = await cls.get_by_id(session, request_id)
        request.status = status
        request.review_note = review_note
        request.reviewed_by_admin_id = reviewed_by_admin_id
        request.reviewed_at = datetime.now(ZoneInfo("Asia/Seoul"))
        await session.commit()
        await session.refresh(request)
        return request
