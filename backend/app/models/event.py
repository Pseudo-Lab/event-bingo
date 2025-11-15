
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum, JSON
from models.base import Base
import enum

class EventStatus(enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    admin_email = Column(String(100), nullable=False)
    bingo_size = Column(Integer, nullable=False, default=5)
    success_condition = Column(Integer, nullable=False, default=5)
    keywords = Column(JSON, nullable=True, default=list)

    @property
    def status(self) -> EventStatus:
        now = datetime.now()
        if now < self.start_time:
            return EventStatus.SCHEDULED
        elif self.start_time <= now <= self.end_time:
            return EventStatus.IN_PROGRESS
        else:
            return EventStatus.FINISHED
