from datetime import datetime
from typing import Optional, List
from zoneinfo import ZoneInfo
import secrets

import bcrypt
from core.db import AsyncSession
from core.log import logger
from sqlalchemy import Boolean, DateTime, Integer, Sequence, String, JSON, select
from sqlalchemy.orm import mapped_column

from models.base import Base


LOGIN_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
LOGIN_ID_LENGTH = 6


class BingoUser(Base):
    __tablename__ = "bingo_user"
    user_id = mapped_column(Integer, primary_key=True, nullable=False)
    user_name = mapped_column(String(100), nullable=False)
    user_email = mapped_column(String(100), nullable=False)
    login_id = mapped_column(String(32), nullable=False, unique=True)
    password_hash = mapped_column(String(255), nullable=False)
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
    async def _generate_login_id(cls, session: AsyncSession) -> str:
        for _ in range(32):
            login_id = "".join(
                secrets.choice(LOGIN_ID_ALPHABET) for _ in range(LOGIN_ID_LENGTH)
            )
            if await cls.get_user_by_login_id(session, login_id) is None:
                return login_id

        raise ValueError("로그인 코드를 생성하지 못했습니다. 다시 시도해주세요.")

    @classmethod
    def hash_password(cls, password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    @classmethod
    def verify_password(cls, password: str, password_hash: str) -> bool:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))

    @classmethod
    async def create(cls, session: AsyncSession, user_name: str, password: str):
        login_id = await cls._generate_login_id(session)
        password_hash = cls.hash_password(password)

        new_user = BingoUser(
            user_name=user_name, 
            user_email=login_id,
            login_id=login_id,
            password_hash=password_hash,
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
    async def get_user_by_login_id(cls, session: AsyncSession, login_id: str):
        res = await session.execute(select(cls).where(cls.login_id == login_id))
        return res.scalar_one_or_none()

    @classmethod
    async def get_user_by_name(cls, session: AsyncSession, user_name: str):
        res = await session.execute(select(cls).where(cls.user_name == user_name))
        user = res.scalars().first()
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
    async def update_privacy_agreement(cls, session: AsyncSession, user_id: int):
        user = await cls.get_user_by_id(session, user_id)
        user.privacy_agreed = True
        user.agreement_at = datetime.now(ZoneInfo("Asia/Seoul"))
        await session.commit()
        await session.refresh(user)
        return user
