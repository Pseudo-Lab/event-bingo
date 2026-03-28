from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from core.base_schema import BaseSchema


class JoinEventResponse(BaseSchema):
    attendee_id: int
    event_id: int
    user_id: int
    room_id: Optional[int] = None
    team_id: Optional[int] = None
    board: dict


class TeamStatusItem(BaseModel):
    team_id: int
    color: str
    name: str
    member_count: int


class RoomStatusResponse(BaseSchema):
    room_id: int
    room_number: int
    event_id: int
    is_open: bool
    participant_count: int
    max_capacity: int
    teams: list[TeamStatusItem] = []


class MyEventItem(BaseModel):
    event_id: int
    event_slug: str
    event_name: str
    game_mode: str
    room_id: Optional[int] = None
    team_id: Optional[int] = None
    team_color: Optional[str] = None
    bingo_count: int = 0
    joined_at: datetime


class MyEventsResponse(BaseSchema):
    events: list[MyEventItem]
