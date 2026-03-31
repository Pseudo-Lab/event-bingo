from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

from models.base import Base
from sqlalchemy import Integer, DateTime, String, ForeignKey, select
from sqlalchemy.orm import mapped_column

from core.db import AsyncSession


class BingoInteraction(Base):
    __tablename__ = "bingo_interaction"

    interaction_id = mapped_column(Integer, primary_key=True, autoincrement=True)
    word_id_list = mapped_column(String(200), nullable=False)
    send_user_id = mapped_column(Integer, nullable=False)
    receive_user_id = mapped_column(Integer, nullable=False)
    event_id = mapped_column(Integer, ForeignKey("events.id"), nullable=False)
    created_at = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(ZoneInfo("Asia/Seoul")), nullable=False
    )

    @classmethod
    async def create(cls, session: AsyncSession, word_id_list, send_user_id, receive_user_id, event_id: Optional[int] = None):
        new_interaction = BingoInteraction(
            word_id_list=word_id_list, send_user_id=send_user_id, receive_user_id=receive_user_id,
            event_id=event_id,
        )
        session.add(new_interaction)
        await session.flush()
        return new_interaction

    @classmethod
    async def has_directional_interaction(
        cls,
        session: AsyncSession,
        *,
        send_user_id: int,
        receive_user_id: int,
    ) -> bool:
        stmt = select(cls.interaction_id).where(
            cls.send_user_id == send_user_id,
            cls.receive_user_id == receive_user_id,
        ).limit(1)
        res = await session.execute(stmt)
        return res.scalar_one_or_none() is not None

    @classmethod
    async def get_user_latest_interaction(cls, session: AsyncSession, user_id: int, limit: int):
        stmt = select(cls).where(cls.receive_user_id == user_id).order_by(cls.created_at.desc())

        if limit:
            stmt = stmt.limit(limit)

        res = await session.execute(stmt)
        return res.scalars().all()

    @classmethod
    async def get_user_all_interactions(
        cls,
        session: AsyncSession,
        user_id: int,
        after_interaction_id: int | None = None,
    ):
        stmt = (
            select(cls)
            .where((cls.receive_user_id == user_id) | (cls.send_user_id == user_id))
            .order_by(cls.created_at.desc(), cls.interaction_id.desc())
        )

        if after_interaction_id is not None:
            stmt = stmt.where(cls.interaction_id > after_interaction_id)

        res = await session.execute(stmt)
        return res.scalars().all()
