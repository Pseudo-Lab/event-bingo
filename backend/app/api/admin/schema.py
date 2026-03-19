from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from core.base_schema import BaseSchema


AdminRoleLiteral = Literal["admin", "event_manager"]
PublishStateLiteral = Literal["draft", "published", "archived"]
EventStatusLiteral = Literal["scheduled", "in_progress", "ended"]
EventManagerRequestStatusLiteral = Literal["pending", "approved", "rejected"]


class AdminSessionInfo(BaseModel):
    id: int
    email: str
    name: str
    role: AdminRoleLiteral


class AdminLoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=4, max_length=100)


class AdminLoginResponse(BaseSchema):
    access_token: Optional[str] = None
    admin: Optional[AdminSessionInfo] = None


class AdminMemberItem(BaseModel):
    id: int
    email: str
    name: str
    phone: str
    created_at: datetime
    role: AdminRoleLiteral


class AdminMemberListResponse(BaseSchema):
    members: list[AdminMemberItem] = Field(default_factory=list)


class AdminMemberCreateRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=100)
    name: str = Field(..., min_length=1, max_length=100)
    role: AdminRoleLiteral


class AdminMemberResponse(BaseSchema):
    member: Optional[AdminMemberItem] = None


class AdminMemberDeleteResponse(BaseSchema):
    deleted_member_id: Optional[int] = None


class AdminEventManagerRequestItem(BaseModel):
    id: int
    name: str
    email: str
    organization: Optional[str] = None
    event_name: str
    event_purpose: str
    expected_event_date: Optional[datetime] = None
    expected_attendee_count: Optional[int] = None
    notes: Optional[str] = None
    status: EventManagerRequestStatusLiteral
    review_note: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by_name: Optional[str] = None
    created_at: datetime


class AdminEventManagerRequestListResponse(BaseSchema):
    requests: list[AdminEventManagerRequestItem] = Field(default_factory=list)
    pending_count: int = 0


class AdminEventManagerRequestUpdateRequest(BaseModel):
    status: EventManagerRequestStatusLiteral
    review_note: Optional[str] = Field(default=None, max_length=1000)


class AdminEventManagerRequestResponse(BaseSchema):
    request: Optional[AdminEventManagerRequestItem] = None


class AdminEventParticipantItem(BaseModel):
    id: int
    name: str
    email: str
    progress_percent: int
    keywords: list[str] = Field(default_factory=list)


class AdminEventBingoRow(BaseModel):
    line_label: str
    count: int
    rate: float
    is_complete: bool


class AdminEventKeywordRow(BaseModel):
    rank: int
    keyword: str
    count: int


class AdminEventAnalytics(BaseModel):
    review_participants: int
    average_review_score: float
    participation_rate: float
    total_keyword_selections: int
    operating_minutes: int
    bingo_rows: list[AdminEventBingoRow] = Field(default_factory=list)
    keyword_rows: list[AdminEventKeywordRow] = Field(default_factory=list)


class AdminEventSummary(BaseModel):
    id: int
    slug: str
    name: str
    created_by_id: int
    created_by_email: str
    created_by_name: str
    event_date: datetime
    admin_email: str
    board_size: int
    bingo_mission_count: int
    keywords: list[str] = Field(default_factory=list)
    participant_count: int
    progress_current: int
    progress_total: int
    status: EventStatusLiteral
    publish_state: PublishStateLiteral
    can_edit: bool


class AdminEventDetail(AdminEventSummary):
    public_path: str
    participants: list[AdminEventParticipantItem] = Field(default_factory=list)
    analytics: AdminEventAnalytics


class AdminEventListResponse(BaseSchema):
    events: list[AdminEventSummary] = Field(default_factory=list)


class AdminEventDetailResponse(BaseSchema):
    event: Optional[AdminEventDetail] = None


class AdminEventUpsertRequest(BaseModel):
    slug: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    event_date: datetime
    admin_email: str = Field(..., min_length=3, max_length=100)
    board_size: Literal[3, 5]
    bingo_mission_count: int = Field(..., ge=1, le=5)
    keywords: list[str] = Field(default_factory=list)
    publish_state: PublishStateLiteral = "draft"


class AdminEventResponse(BaseSchema):
    event: Optional[AdminEventDetail] = None


class AdminEventResetStats(BaseModel):
    deleted_attendees: int = 0
    deleted_teams: int = 0
    deleted_users: int = 0
    deleted_boards: int = 0
    deleted_interactions: int = 0
    skipped_shared_users: int = 0


class AdminEventResetResponse(BaseSchema):
    stats: AdminEventResetStats = Field(default_factory=AdminEventResetStats)
