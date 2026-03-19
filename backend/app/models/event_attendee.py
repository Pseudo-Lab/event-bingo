from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional, List
import random

from sqlalchemy import Integer, String, ForeignKey, JSON, DateTime, select
from sqlalchemy.orm import Mapped, mapped_column
from core.db import AsyncSession
from models.base import Base


class EventAttendee(Base):
    __tablename__ = "event_attendees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, nullable=False)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("bingo_user.user_id"), nullable=False)
    team_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("teams.id"), nullable=True)
    selected_keywords: Mapped[list] = mapped_column(JSON, nullable=True, default=list)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    review: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        nullable=False
    )

    @classmethod
    async def create(
        cls,
        session: AsyncSession,
        event_id: int,
        user_id: int,
        team_id: Optional[int] = None,
        selected_keywords: Optional[List[str]] = None
    ):
        """참가자 등록"""
        # Event 존재 확인
        from models.event import Event
        await Event.get_by_id(session, event_id)
        
        # User 존재 확인
        from models.user import BingoUser
        await BingoUser.get_user_by_id(session, user_id)
        
        # 중복 등록 체크
        existing = await session.execute(
            select(cls).where(
                cls.event_id == event_id,
                cls.user_id == user_id
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"User {user_id}는 이미 Event {event_id}에 등록되어 있습니다.")
        
        if selected_keywords is None:
            selected_keywords = []
        
        new_attendee = EventAttendee(
            event_id=event_id,
            user_id=user_id,
            team_id=team_id,
            selected_keywords=selected_keywords
        )
        session.add(new_attendee)
        await session.commit()
        await session.refresh(new_attendee)
        return new_attendee

    @classmethod
    async def get_by_id(cls, session: AsyncSession, attendee_id: int) -> Optional["EventAttendee"]:
        """ID로 참가자 조회"""
        result = await session.get(cls, attendee_id)
        if not result:
            raise ValueError(f"Attendee ID {attendee_id}가 존재하지 않습니다.")
        return result

    @classmethod
    async def get_by_event(cls, session: AsyncSession, event_id: int):
        """이벤트별 참가자 조회"""
        result = await session.execute(
            select(cls).where(cls.event_id == event_id)
        )
        return result.scalars().all()

    @classmethod
    async def get_by_user(cls, session: AsyncSession, user_id: int):
        """유저별 참가 이벤트 조회"""
        result = await session.execute(
            select(cls).where(cls.user_id == user_id)
        )
        return result.scalars().all()

    @classmethod
    async def assign_team(cls, session: AsyncSession, attendee_id: int, team_id: int):
        """팀 배정 (수동)"""
        attendee = await cls.get_by_id(session, attendee_id)
        
        # Team 존재 확인 및 같은 이벤트인지 확인
        from models.team import Team
        team = await Team.get_by_id(session, team_id)
        if team.event_id != attendee.event_id:
            raise ValueError(f"Team {team_id}는 Event {attendee.event_id}에 속하지 않습니다.")
        
        attendee.team_id = team_id
        await session.commit()
        await session.refresh(attendee)
        return attendee

    @classmethod
    async def update_review(
        cls,
        session: AsyncSession,
        attendee_id: int,
        rating: Optional[int] = None,
        review: Optional[str] = None
    ):
        """리뷰 업데이트"""
        attendee = await cls.get_by_id(session, attendee_id)
        
        if rating is not None:
            attendee.rating = rating
        if review is not None:
            attendee.review = review
        
        await session.commit()
        await session.refresh(attendee)
        return attendee

    @classmethod
    async def auto_assign_teams(cls, session: AsyncSession, event_id: int):
        """
        이벤트의 모든 참가자를 자동으로 blue/red 팀에 균등 배치
        
        1. 이벤트에 blue/red 팀이 있는지 확인하고 없으면 생성
        2. 팀이 배정되지 않은 참가자들을 랜덤하게 섞어서 균등 배치
        """
        from models.team import Team, TeamColor
        
        # 이벤트의 팀들 가져오기
        teams = await Team.get_by_event(session, event_id)
        team_dict = {team.color: team for team in teams}
        
        # Blue, Red 팀이 없으면 생성
        if TeamColor.BLUE not in team_dict:
            blue_team = await Team.create(
                session, 
                name="파랑 팀", 
                event_id=event_id, 
                color=TeamColor.BLUE
            )
            team_dict[TeamColor.BLUE] = blue_team
        
        if TeamColor.RED not in team_dict:
            red_team = await Team.create(
                session, 
                name="빨강 팀", 
                event_id=event_id, 
                color=TeamColor.RED
            )
            team_dict[TeamColor.RED] = red_team
        
        # 팀이 배정되지 않은 참가자들 가져오기
        unassigned = await session.execute(
            select(cls).where(
                cls.event_id == event_id,
                cls.team_id.is_(None)
            )
        )
        unassigned_attendees = list(unassigned.scalars().all())
        
        if not unassigned_attendees:
            return {"message": "배정할 참가자가 없습니다.", "assigned_count": 0}
        
        # 랜덤하게 섞기
        random.shuffle(unassigned_attendees)
        
        # 균등 배치
        blue_team_id = team_dict[TeamColor.BLUE].id
        red_team_id = team_dict[TeamColor.RED].id
        
        for idx, attendee in enumerate(unassigned_attendees):
            attendee.team_id = blue_team_id if idx % 2 == 0 else red_team_id
        
        await session.commit()
        
        return {
            "message": f"{len(unassigned_attendees)}명의 참가자를 팀에 배정했습니다.",
            "assigned_count": len(unassigned_attendees),
            "blue_team_id": blue_team_id,
            "red_team_id": red_team_id
        }
