from datetime import datetime
from typing import AsyncIterator, Optional, List
from zoneinfo import ZoneInfo

import pandas as pd
from core.db import AsyncSession
from core.log import logger
from sqlalchemy import Boolean, DateTime, Integer, Sequence, String, JSON, select
from sqlalchemy.orm import mapped_column

from models.base import Base
from integrations.omoh.verification import verify_email_in_attendances



class BingoUser(Base):
    __tablename__ = "bingo_user"
    user_id = mapped_column(Integer, primary_key=True, nullable=False)
    user_name = mapped_column(String(100), nullable=False)
    user_email = mapped_column(String(100), nullable=False)
    umoh_id = mapped_column(Integer, nullable=True)
    rating = mapped_column(Integer, nullable=True)
    review = mapped_column(String(500), nullable=True)
    selected_words = mapped_column(JSON, nullable=True, default=list)
    privacy_agreed = mapped_column(Boolean, nullable=False, default=False)
    created_at = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(ZoneInfo("Asia/Seoul")), nullable=False
    )
    agreement_at = mapped_column(DateTime(timezone=True),  nullable=True)

    @classmethod
    async def create(cls, session: AsyncSession, email: str):
        user_name = verify_email_in_attendances(email) or None
        is_user = await session.execute(select(cls).where(cls.user_email == email))
        is_user = is_user.one_or_none()
        if is_user:
            raise ValueError(f"{email}은 이미 존재하는 유저입니다. 다른 email을 사용해주세요.")
        new_user = BingoUser(
            user_name=user_name, 
            user_email=email, 
            privacy_agreed=True,
            agreement_at=datetime.now(ZoneInfo("Asia/Seoul"))
        )
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        return new_user
    
    @classmethod
    async def create_new(cls, session: AsyncSession, email: str, user_name: str):
        is_user = await session.execute(select(cls).where(cls.user_email == email))
        is_user = is_user.one_or_none()
        if is_user:
            raise ValueError(f"{email}은 이미 존재하는 유저입니다. 다른 email을 사용해주세요.")
        new_user = BingoUser(
            user_name=user_name, 
            user_email=email, 
            privacy_agreed=True,
            agreement_at=datetime.now(ZoneInfo("Asia/Seoul"))
        )
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        return new_user

    @classmethod
    async def get_user_by_email(cls, session, email: str):
        res = await session.execute(select(cls).where(cls.user_email == email))
        return res.scalar_one_or_none()

    @classmethod
    async def get_user_by_name(cls, session: AsyncSession, user_name: str):
        res = await session.execute(select(cls).where(cls.user_name == user_name))
        user = res.scalars().first()
        return user

    @classmethod
    async def get_user_by_id(cls, session: AsyncSession, user_id: int):
        res = await session.execute(select(cls).where(cls.user_id == user_id))
        user = res.scalars().first()
        if not user:
            raise ValueError(f"{user_id} 의 빙고 유저가 존재하지 않습니다.")
        return user

    @classmethod
    async def get_user_by_id(cls, session: AsyncSession, user_id: int):
        res = await session.get(cls, user_id)
        if not res:
            raise ValueError(f"{user_id} 의 빙고 유저가 존재하지 않습니다.")
        return res

    @classmethod
    async def update_review(cls, session: AsyncSession, user_id: int, rating: int, review: Optional[str] = None):
        user = await cls.get_user_by_id(session, user_id)
        user.rating = rating
        if review is not None:
            user.review = review
        
        await session.commit()
        await session.refresh(user)
        return user

    @classmethod
    async def update_selected_words(cls, session: AsyncSession, user_id: int, words: List[str]):
        logger.info(f"update_selected_words: {words}")
        user = await cls.get_user_by_id(session, user_id)
        user.selected_words = words
        return user
    
    @classmethod
    async def update_privacy_agreement(cls, session: AsyncSession, email: str):
        user = await cls.get_user_by_email(session, email)
        user.privacy_agreed = True
        user.agreement_at = datetime.now(ZoneInfo("Asia/Seoul"))
        await session.commit()
        await session.refresh(user)
        return user
