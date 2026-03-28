from typing import Optional
from pydantic import BaseModel
from core.base_schema import BaseSchema


class JoinEventResponse(BaseSchema):
    attendee_id: int
    event_id: int
    user_id: int
    room_id: Optional[int] = None
    team_id: Optional[int] = None
    board: dict
