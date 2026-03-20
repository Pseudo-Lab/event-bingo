from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional
import enum

from sqlalchemy import String, Enum, select
from sqlalchemy.orm import Mapped, mapped_column
from core.db import AsyncSession
from models.base import Base


class AdminRole(enum.Enum):
    ADMIN = "admin"
    EVENT_MANAGER = "event_manager"


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(primary_key=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Supabase 전환으로 미사용 (하위호환)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[AdminRole] = mapped_column(Enum(AdminRole), nullable=False, default=AdminRole.EVENT_MANAGER)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")).replace(tzinfo=None), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")).replace(tzinfo=None),
        onupdate=lambda: datetime.now(ZoneInfo("Asia/Seoul")).replace(tzinfo=None),
        nullable=False,
    )

    @classmethod
    async def create(
        cls,
        session: AsyncSession,
        email: str,
        name: str,
        role: AdminRole = AdminRole.EVENT_MANAGER
    ):
        """새 Admin 역할 등록 (인증은 Supabase에서 처리)"""
        existing = await cls.get_by_email(session, email)
        if existing:
            raise ValueError(f"{email}은 이미 존재하는 관리자입니다.")

        new_admin = Admin(
            email=email,
            name=name,
            role=role
        )
        session.add(new_admin)
        await session.commit()
        await session.refresh(new_admin)
        return new_admin

    @classmethod
    async def get_by_email(cls, session: AsyncSession, email: str) -> Optional["Admin"]:
        """이메일로 Admin 조회"""
        result = await session.execute(select(cls).where(cls.email == email))
        return result.scalar_one_or_none()

    @classmethod
    async def get_by_id(cls, session: AsyncSession, admin_id: int) -> Optional["Admin"]:
        """ID로 Admin 조회"""
        result = await session.get(cls, admin_id)
        if not result:
            raise ValueError(f"Admin ID {admin_id}가 존재하지 않습니다.")
        return result

    @classmethod
    async def get_all(cls, session: AsyncSession):
        """모든 Admin 조회"""
        result = await session.execute(select(cls))
        return result.scalars().all()

    @classmethod
    async def update(
        cls,
        session: AsyncSession,
        admin_id: int,
        name: Optional[str] = None,
        role: Optional[AdminRole] = None,
    ):
        """Admin 정보 수정"""
        admin = await cls.get_by_id(session, admin_id)

        if name is not None:
            admin.name = name
        if role is not None:
            admin.role = role

        await session.commit()
        await session.refresh(admin)
        return admin

    @classmethod
    async def delete(cls, session: AsyncSession, admin_id: int):
        """Admin 삭제"""
        admin = await cls.get_by_id(session, admin_id)
        await session.delete(admin)
        await session.commit()
        return True
