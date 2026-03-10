from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional
import enum

from sqlalchemy import String, Integer, DateTime, Enum, JSON, ForeignKey, select, func
from sqlalchemy.orm import mapped_column
from core.db import AsyncSession
from models.base import Base


class EventStatus(enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"


class Event(Base):
    __tablename__ = "events"

    id: int = mapped_column(Integer, primary_key=True, nullable=False)
    name: str = mapped_column(String(100), nullable=False)
    start_time: datetime = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: datetime = mapped_column(DateTime(timezone=True), nullable=False)
    admin_id: int = mapped_column(Integer, ForeignKey("admins.id"), nullable=False)
    admin_email: str = mapped_column(String(100), nullable=False)  # 중복 저장 (조회 편의성)
    bingo_size: int = mapped_column(Integer, nullable=False, default=5)
    success_condition: int = mapped_column(Integer, nullable=False, default=5)
    keywords: list = mapped_column(JSON, nullable=True, default=list)
    created_at: datetime = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        nullable=False
    )
    updated_at: datetime = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        onupdate=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        nullable=False,
    )

    @property
    def status(self) -> EventStatus:
        """현재 시간 기준으로 이벤트 상태 계산"""
        now = datetime.now(ZoneInfo("Asia/Seoul"))
        if now < self.start_time.replace(tzinfo=ZoneInfo("Asia/Seoul")) if self.start_time.tzinfo is None else self.start_time:
            return EventStatus.SCHEDULED
        elif self.start_time <= now <= self.end_time:
            return EventStatus.IN_PROGRESS
        else:
            return EventStatus.FINISHED

    @classmethod
    async def create(
        cls,
        session: AsyncSession,
        name: str,
        start_time: datetime,
        end_time: datetime,
        admin_id: int,
        admin_email: str,
        bingo_size: int = 5,
        success_condition: int = 5,
        keywords: list = None
    ):
        """새 이벤트 생성"""
        if keywords is None:
            keywords = []
        
        # Admin 존재 확인
        from models.admin import Admin
        await Admin.get_by_id(session, admin_id)
        
        new_event = Event(
            name=name,
            start_time=start_time,
            end_time=end_time,
            admin_id=admin_id,
            admin_email=admin_email,
            bingo_size=bingo_size,
            success_condition=success_condition,
            keywords=keywords
        )
        session.add(new_event)
        await session.commit()
        await session.refresh(new_event)
        return new_event

    @classmethod
    async def get_by_id(cls, session: AsyncSession, event_id: int) -> Optional["Event"]:
        """ID로 이벤트 조회"""
        result = await session.get(cls, event_id)
        if not result:
            raise ValueError(f"Event ID {event_id}가 존재하지 않습니다.")
        return result

    @classmethod
    async def get_all(cls, session: AsyncSession):
        """모든 이벤트 조회"""
        result = await session.execute(select(cls).order_by(cls.start_time.desc()))
        return result.scalars().all()

    @classmethod
    async def update(
        cls,
        session: AsyncSession,
        event_id: int,
        name: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        bingo_size: Optional[int] = None,
        success_condition: Optional[int] = None,
        keywords: Optional[list] = None
    ):
        """이벤트 정보 수정"""
        event = await cls.get_by_id(session, event_id)
        
        if name is not None:
            event.name = name
        if start_time is not None:
            event.start_time = start_time
        if end_time is not None:
            event.end_time = end_time
        if bingo_size is not None:
            event.bingo_size = bingo_size
        if success_condition is not None:
            event.success_condition = success_condition
        if keywords is not None:
            event.keywords = keywords
        
        await session.commit()
        await session.refresh(event)
        return event

    @classmethod
    async def delete(cls, session: AsyncSession, event_id: int):
        """이벤트 삭제"""
        event = await cls.get_by_id(session, event_id)
        await session.delete(event)
        await session.commit()
        return True

    @classmethod
    async def get_participant_count(cls, session: AsyncSession, event_id: int) -> int:
        """이벤트 참가자 수 조회"""
        from models.event_attendee import EventAttendee
        result = await session.execute(
            select(func.count(EventAttendee.id)).where(EventAttendee.event_id == event_id)
        )
        return result.scalar() or 0

    @classmethod
    async def get_completion_rate(cls, session: AsyncSession, event_id: int) -> float:
        """빙고 완성률 계산 (성공 조건 이상 달성한 참가자 비율)"""
        event = await cls.get_by_id(session, event_id)
        total_participants = await cls.get_participant_count(session, event_id)
        
        if total_participants == 0:
            return 0.0
        
        from models.event_attendee import EventAttendee
        from models.bingo import BingoBoards
        
        # 이벤트 참가자들의 user_id 가져오기
        attendees_result = await session.execute(
            select(EventAttendee.user_id).where(EventAttendee.event_id == event_id)
        )
        user_ids = [row[0] for row in attendees_result.all()]
        
        # 성공 조건 이상의 빙고를 가진 참가자 수
        completed_result = await session.execute(
            select(func.count(BingoBoards.user_id)).where(
                BingoBoards.user_id.in_(user_ids),
                BingoBoards.bingo_count >= event.success_condition
            )
        )
        completed_count = completed_result.scalar() or 0
        
        return (completed_count / total_participants) * 100

