from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
from models.base import Base
import enum


class TeamColor(enum.Enum):
    BLUE = "blue"
    RED = "red"


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    color = Column(Enum(TeamColor), nullable=False)
