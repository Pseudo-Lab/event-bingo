from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from models.base import Base


class EventAttendee(Base):
    __tablename__ = "event_attendees"

    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("bingo_user.user_id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    selected_keywords = Column(JSON, nullable=True, default=list)
    rating = Column(Integer, nullable=True)
    review = Column(String(500), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        nullable=False
    )
