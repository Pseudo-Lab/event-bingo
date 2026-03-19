from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from core.base_schema import BaseSchema


class PublicEventProfileItem(BaseModel):
    id: int
    slug: str
    name: str
    start_at: datetime
    board_size: int
    bingo_mission_count: int
    keywords: list[str] = Field(default_factory=list)
    publish_state: str


class PublicEventProfileResponse(BaseSchema):
    event: Optional[PublicEventProfileItem] = None


class PublicEventSummaryItem(BaseModel):
    id: int
    slug: str
    name: str
    start_at: datetime
    board_size: int
    bingo_mission_count: int
    status: str


class PublicEventListResponse(BaseSchema):
    events: list[PublicEventSummaryItem] = Field(default_factory=list)


class EventManagerRequestCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=3, max_length=100)
    organization: Optional[str] = Field(default=None, max_length=120)
    event_name: str = Field(..., min_length=1, max_length=120)
    event_purpose: str = Field(..., min_length=5, max_length=2000)
    expected_event_date: Optional[datetime] = None
    expected_attendee_count: Optional[int] = Field(default=None, ge=1, le=100000)
    notes: Optional[str] = Field(default=None, max_length=2000)


class EventManagerRequestCreateItem(BaseModel):
    id: int
    status: str
    created_at: datetime


class EventManagerRequestCreateResponse(BaseSchema):
    request: Optional[EventManagerRequestCreateItem] = None
