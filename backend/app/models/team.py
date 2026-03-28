from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional
import enum

from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum, select, func
from sqlalchemy.orm import Mapped, mapped_column
from core.db import AsyncSession
from models.base import Base


class TeamColor(enum.Enum):
    BLUE = "blue"
    RED = "red"


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id"), nullable=False)
    room_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("rooms.id"), nullable=True)
    color: Mapped[TeamColor] = mapped_column(Enum(TeamColor), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        nullable=False
    )

    @classmethod
    async def create(
        cls,
        session: AsyncSession,
        name: str,
        event_id: int,
        color: TeamColor,
        room_id: Optional[int] = None,
    ):
        """팀 생성"""
        # Event 존재 확인
        from models.event import Event
        await Event.get_by_id(session, event_id)

        new_team = Team(
            name=name,
            event_id=event_id,
            room_id=room_id,
            color=color
        )
        session.add(new_team)
        await session.commit()
        await session.refresh(new_team)
        return new_team

    @classmethod
    async def get_by_id(cls, session: AsyncSession, team_id: int) -> Optional["Team"]:
        """ID로 팀 조회"""
        result = await session.get(cls, team_id)
        if not result:
            raise ValueError(f"Team ID {team_id}가 존재하지 않습니다.")
        return result

    @classmethod
    async def get_by_event(cls, session: AsyncSession, event_id: int):
        """이벤트별 팀 조회"""
        result = await session.execute(
            select(cls).where(cls.event_id == event_id)
        )
        return result.scalars().all()

    @classmethod
    async def get_by_room(cls, session: AsyncSession, room_id: int):
        """방별 팀 조회"""
        result = await session.execute(
            select(cls).where(cls.room_id == room_id)
        )
        return result.scalars().all()

    @classmethod
    async def get_team_members(cls, session: AsyncSession, team_id: int):
        """팀 소속 참가자 목록"""
        from models.event_attendee import EventAttendee
        result = await session.execute(
            select(EventAttendee).where(EventAttendee.team_id == team_id)
        )
        return result.scalars().all()

    @classmethod
    async def get_team_bingo_sum(cls, session: AsyncSession, team_id: int) -> int:
        """팀 소속 유저들의 총 빙고 개수 합산"""
        from models.event_attendee import EventAttendee
        from models.bingo import BingoBoards
        
        # 팀의 모든 참가자 user_id 가져오기
        attendees_result = await session.execute(
            select(EventAttendee.user_id).where(EventAttendee.team_id == team_id)
        )
        user_ids = [row[0] for row in attendees_result.all()]
        
        if not user_ids:
            return 0
        
        # 해당 user_id들의 빙고 개수 합산
        result = await session.execute(
            select(func.sum(BingoBoards.bingo_count)).where(
                BingoBoards.user_id.in_(user_ids)
            )
        )
        total = result.scalar()
        return total or 0
