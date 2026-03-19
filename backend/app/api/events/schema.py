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
