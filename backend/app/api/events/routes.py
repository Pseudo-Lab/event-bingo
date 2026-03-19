from fastapi import APIRouter, Depends, HTTPException, status

from core.db import AsyncSessionDepends
from models.event import Event

from .schema import PublicEventProfileItem, PublicEventProfileResponse


events_router = APIRouter(prefix="/events", tags=["events"])


@events_router.get(
    "/{event_slug}",
    response_model=PublicEventProfileResponse,
    summary="공개 이벤트 설정 조회",
)
async def get_public_event_profile(
    event_slug: str,
    db: AsyncSessionDepends,
):
    event = await Event.get_by_slug(db, event_slug.strip().lower())
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="이벤트를 찾을 수 없습니다.",
        )

    return PublicEventProfileResponse(
        ok=True,
        message="이벤트 설정을 불러왔습니다.",
        event=PublicEventProfileItem(
            id=event.id,
            slug=event.slug,
            name=event.name,
            start_at=event.start_time,
            board_size=event.bingo_size,
            bingo_mission_count=event.success_condition,
            keywords=[str(keyword) for keyword in (event.keywords or [])],
            publish_state=event.publish_state.value,
        ),
    )
