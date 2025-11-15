
from sqlalchemy import Column, Integer, String, Enum
from models.base import Base
import enum

class AdminRole(enum.Enum):
    ADMIN = "admin"
    EVENT_MANAGER = "event_manager"

class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(100), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(Enum(AdminRole), nullable=False)
