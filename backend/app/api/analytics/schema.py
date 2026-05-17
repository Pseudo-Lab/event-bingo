from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from core.base_schema import BaseSchema


class AnalyticsEventCreateRequest(BaseModel):
    event_id: str = Field(..., min_length=8, max_length=80)
    schema_version: int = Field(..., ge=1, le=1)
    event_name: str = Field(..., min_length=3, max_length=80)
    event_source: str = Field(..., min_length=3, max_length=32)
    analytics_session_id: str = Field(..., min_length=8, max_length=80)
    page_view_id: str = Field(..., min_length=8, max_length=80)
    occurred_at: datetime
    app_version: Optional[str] = Field(default=None, max_length=120)
    route: str = Field(..., min_length=1, max_length=120)
    hostname: str = Field(..., min_length=1, max_length=253)
    environment: str = Field(..., min_length=1, max_length=32)
    deployment_channel: str = Field(..., min_length=1, max_length=32)
    is_production_domain: bool
    viewport_bucket: str = Field(..., min_length=1, max_length=32)
    device_class: str = Field(..., min_length=1, max_length=32)
    referrer_type: str = Field(..., min_length=1, max_length=32)
    properties: dict[str, Any] = Field(default_factory=dict)
    experiments: list[dict[str, Any]] = Field(default_factory=list)


class AnalyticsEventCreateItem(BaseModel):
    event_id: str
    status: str


class AnalyticsEventCreateResponse(BaseSchema):
    event: AnalyticsEventCreateItem
