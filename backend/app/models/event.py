from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional
import enum

from sqlalchemy import String, Integer, DateTime, Enum, JSON, ForeignKey, select, func
from sqlalchemy.orm import Mapped, mapped_column
from core.db import AsyncSession
from models.base import Base


class EventStatus(enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"


class EventPublishState(enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class GameMode(enum.Enum):
    INDIVIDUAL = "individual"
    TEAM = "team"


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False, default="행사 장소")
    event_team: Mapped[str] = mapped_column(String(120), nullable=False, default="Event Team")
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    admin_id: Mapped[int] = mapped_column(Integer, ForeignKey("admins.id"), nullable=False)
    admin_email: Mapped[str] = mapped_column(String(100), nullable=False)  # 중복 저장 (조회 편의성)
    bingo_size: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    success_condition: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    keywords: Mapped[list] = mapped_column(JSON, nullable=True, default=list)
    game_mode: Mapped[GameMode] = mapped_column(
        Enum(GameMode), nullable=False, default=GameMode.INDIVIDUAL
    )
    team_size: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    publish_state: Mapped[EventPublishState] = mapped_column(
        Enum(EventPublishState),
        nullable=False,
        default=EventPublishState.DRAFT,
    )
    first_published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        onupdate=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        nullable=False,
    )

    @property
    def status(self) -> EventStatus:
        """현재 시간 기준으로 이벤트 상태 계산"""
        timezone = ZoneInfo("Asia/Seoul")
        now = datetime.now(timezone)
        start_time = (
            self.start_time.replace(tzinfo=timezone)
            if self.start_time.tzinfo is None
            else self.start_time.astimezone(timezone)
        )
        end_time = (
            self.end_time.replace(tzinfo=timezone)
            if self.end_time.tzinfo is None
            else self.end_time.astimezone(timezone)
        )

        if now < start_time:
            return EventStatus.SCHEDULED
        elif start_time <= now <= end_time:
            return EventStatus.IN_PROGRESS
        else:
            return EventStatus.FINISHED

    @classmethod
    async def create(
        cls,
        session: AsyncSession,
        name: str,
        slug: str,
        location: str,
        event_team: str,
        start_time: datetime,
        end_time: datetime,
        admin_id: int,
        admin_email: str,
        bingo_size: int = 5,
        success_condition: int = 5,
        keywords: list = None,
        game_mode: "GameMode" = None,
        team_size: int = 1,
        publish_state: EventPublishState = EventPublishState.DRAFT,
        first_published_at: Optional[datetime] = None,
    ):
        """새 이벤트 생성"""
        if keywords is None:
            keywords = []
        if game_mode is None:
            game_mode = GameMode.INDIVIDUAL

        # Admin 존재 확인
        from models.admin import Admin
        await Admin.get_by_id(session, admin_id)

        new_event = Event(
            name=name,
            slug=slug,
            location=location,
            event_team=event_team,
            start_time=start_time,
            end_time=end_time,
            admin_id=admin_id,
            admin_email=admin_email,
            bingo_size=bingo_size,
            success_condition=success_condition,
            keywords=keywords,
            game_mode=game_mode,
            team_size=team_size,
            publish_state=publish_state,
            first_published_at=first_published_at,
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
    async def get_by_slug(cls, session: AsyncSession, slug: str) -> Optional["Event"]:
        result = await session.execute(select(cls).where(cls.slug == slug))
        return result.scalar_one_or_none()

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
        slug: Optional[str] = None,
        location: Optional[str] = None,
        event_team: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        bingo_size: Optional[int] = None,
        success_condition: Optional[int] = None,
        keywords: Optional[list] = None,
        admin_email: Optional[str] = None,
        game_mode: Optional["GameMode"] = None,
        team_size: Optional[int] = None,
        publish_state: Optional[EventPublishState] = None,
        first_published_at: Optional[datetime] = None,
    ):
        """이벤트 정보 수정"""
        event = await cls.get_by_id(session, event_id)

        if name is not None:
            event.name = name
        if slug is not None:
            event.slug = slug
        if location is not None:
            event.location = location
        if event_team is not None:
            event.event_team = event_team
        if start_time is not None:
            event.start_time = start_time
        if end_time is not None:
            event.end_time = end_time
        if admin_email is not None:
            event.admin_email = admin_email
        if bingo_size is not None:
            event.bingo_size = bingo_size
        if success_condition is not None:
            event.success_condition = success_condition
        if keywords is not None:
            event.keywords = keywords
        if game_mode is not None:
            event.game_mode = game_mode
        if team_size is not None:
            event.team_size = team_size
        if publish_state is not None:
            event.publish_state = publish_state
        if first_published_at is not None:
            event.first_published_at = first_published_at

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
