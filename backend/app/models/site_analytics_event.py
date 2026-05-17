from datetime import datetime
from typing import Any, Optional
from zoneinfo import ZoneInfo

from sqlalchemy import Boolean, DateTime, Integer, JSON, String, select
from sqlalchemy.orm import Mapped, mapped_column

from core.db import AsyncSession
from models.base import Base


class SiteAnalyticsEvent(Base):
    __tablename__ = "site_analytics_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, nullable=False)
    event_id: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False)
    event_name: Mapped[str] = mapped_column(String(80), nullable=False)
    event_source: Mapped[str] = mapped_column(String(32), nullable=False)
    analytics_session_id: Mapped[str] = mapped_column(String(80), nullable=False)
    page_view_id: Mapped[str] = mapped_column(String(80), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        nullable=False,
    )
    app_version: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    route: Mapped[str] = mapped_column(String(120), nullable=False)
    hostname: Mapped[str] = mapped_column(String(253), nullable=False)
    environment: Mapped[str] = mapped_column(String(32), nullable=False)
    deployment_channel: Mapped[str] = mapped_column(String(32), nullable=False)
    is_production_domain: Mapped[bool] = mapped_column(Boolean, nullable=False)
    viewport_bucket: Mapped[str] = mapped_column(String(32), nullable=False)
    device_class: Mapped[str] = mapped_column(String(32), nullable=False)
    referrer_type: Mapped[str] = mapped_column(String(32), nullable=False)
    properties: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    experiments: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)

    @classmethod
    async def get_by_event_id(
        cls,
        session: AsyncSession,
        event_id: str,
    ) -> Optional["SiteAnalyticsEvent"]:
        result = await session.execute(select(cls).where(cls.event_id == event_id))
        return result.scalar_one_or_none()

    @classmethod
    async def create(
        cls,
        session: AsyncSession,
        **kwargs: Any,
    ) -> "SiteAnalyticsEvent":
        event = cls(**kwargs)
        session.add(event)
        await session.commit()
        await session.refresh(event)
        return event
