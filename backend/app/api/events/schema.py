from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from core.base_schema import BaseSchema


class PublicEventProfileItem(BaseModel):
    id: int
    slug: str
    name: str
    location: str
    event_team: str
    start_at: datetime
    end_at: datetime
    board_size: int
    bingo_mission_count: int
    restrict_before_start: bool = True
    english_support_enabled: bool = False
    keywords: list[str] = Field(default_factory=list)
    keyword_translations: dict[str, str] = Field(default_factory=dict)


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


class PublicPolicyTemplateItem(BaseModel):
    content: str
    updated_at: datetime


class PublicPolicyTemplateResponse(BaseSchema):
    template: Optional[PublicPolicyTemplateItem] = None


class PublicEventPrivacyNoticeItem(BaseModel):
    event_slug: str
    event_name: str
    event_team: str
    contact_email: str
    content: str
    updated_at: datetime


class PublicEventPrivacyNoticeResponse(BaseSchema):
    template: Optional[PublicEventPrivacyNoticeItem] = None


class EventManagerRequestCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=3, max_length=100)
    organization: Optional[str] = Field(default=None, max_length=120)
    event_name: str = Field(..., min_length=1, max_length=120)
    event_purpose: Optional[str] = Field(default=None, max_length=2000)
    expected_event_date: Optional[datetime] = None
    expected_attendee_count: Optional[int] = Field(default=None, ge=1, le=100000)
    notes: Optional[str] = Field(default=None, max_length=2000)


class EventManagerRequestCreateItem(BaseModel):
    id: int
    status: str
    created_at: datetime


class EventManagerRequestCreateResponse(BaseSchema):
    request: Optional[EventManagerRequestCreateItem] = None
