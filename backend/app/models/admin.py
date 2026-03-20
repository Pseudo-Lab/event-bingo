from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional
import enum

from sqlalchemy import Boolean, DateTime, Enum, String, select
from sqlalchemy.orm import Mapped, mapped_column
from core.db import AsyncSession
from models.base import Base
import bcrypt


class AdminRole(enum.Enum):
    ADMIN = "admin"
    EVENT_MANAGER = "event_manager"


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(primary_key=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)  # bcrypt hash는 60자이지만 여유있게
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[AdminRole] = mapped_column(Enum(AdminRole), nullable=False, default=AdminRole.EVENT_MANAGER)
    password_setup_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    invite_token_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    invite_token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    invitation_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        onupdate=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        nullable=False,
    )

    @classmethod
    async def create(
        cls, 
        session: AsyncSession, 
        email: str, 
        password: str, 
        name: str, 
        role: AdminRole = AdminRole.EVENT_MANAGER,
        password_setup_required: bool = False,
        invite_token_hash: Optional[str] = None,
        invite_token_expires_at: Optional[datetime] = None,
        invitation_sent_at: Optional[datetime] = None,
    ):
        """새 Admin 생성 (비밀번호 자동 해싱)"""
        # 이메일 중복 체크
        existing = await cls.get_by_email(session, email)
        if existing:
            raise ValueError(f"{email}은 이미 존재하는 관리자입니다.")
        
        # 비밀번호 해싱
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        new_admin = Admin(
            email=email,
            password=password_hash,
            name=name,
            role=role,
            password_setup_required=password_setup_required,
            invite_token_hash=invite_token_hash,
            invite_token_expires_at=invite_token_expires_at,
            invitation_sent_at=invitation_sent_at,
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
        password: Optional[str] = None,
        password_setup_required: Optional[bool] = None,
        invite_token_hash: Optional[str] = None,
        invite_token_expires_at: Optional[datetime] = None,
        invitation_sent_at: Optional[datetime] = None,
    ):
        """Admin 정보 수정"""
        admin = await cls.get_by_id(session, admin_id)
        
        if name is not None:
            admin.name = name
        if role is not None:
            admin.role = role
        if password is not None:
            admin.password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        if password_setup_required is not None:
            admin.password_setup_required = password_setup_required
        admin.invite_token_hash = invite_token_hash
        admin.invite_token_expires_at = invite_token_expires_at
        admin.invitation_sent_at = invitation_sent_at
        
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

    @classmethod
    async def get_by_invite_token_hash(
        cls,
        session: AsyncSession,
        invite_token_hash: str,
    ) -> Optional["Admin"]:
        result = await session.execute(
            select(cls).where(cls.invite_token_hash == invite_token_hash)
        )
        return result.scalar_one_or_none()

    @classmethod
    async def store_invitation(
        cls,
        session: AsyncSession,
        admin_id: int,
        *,
        invite_token_hash: str,
        invite_token_expires_at: datetime,
        password_setup_required: bool = True,
    ) -> "Admin":
        admin = await cls.get_by_id(session, admin_id)
        admin.password_setup_required = password_setup_required
        admin.invite_token_hash = invite_token_hash
        admin.invite_token_expires_at = invite_token_expires_at
        admin.invitation_sent_at = None
        await session.commit()
        await session.refresh(admin)
        return admin

    @classmethod
    async def mark_invitation_sent(
        cls,
        session: AsyncSession,
        admin_id: int,
        *,
        sent_at: datetime,
    ) -> "Admin":
        admin = await cls.get_by_id(session, admin_id)
        admin.invitation_sent_at = sent_at
        await session.commit()
        await session.refresh(admin)
        return admin

    @classmethod
    async def complete_password_setup(
        cls,
        session: AsyncSession,
        admin_id: int,
        *,
        password: str,
    ) -> "Admin":
        admin = await cls.get_by_id(session, admin_id)
        admin.password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        admin.password_setup_required = False
        admin.invite_token_hash = None
        admin.invite_token_expires_at = None
        await session.commit()
        await session.refresh(admin)
        return admin

    def verify_password(self, password: str) -> bool:
        """비밀번호 검증"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password.encode('utf-8'))
