from fastapi import APIRouter, HTTPException, status

from core.db import AsyncSessionDepends
from models.event import Event, EventPublishState, EventStatus
from models.event_manager_request import EventManagerRequest
from models.policy_template import PolicyTemplate

from .schema import (
    EventManagerRequestCreateItem,
    EventManagerRequestCreateRequest,
    EventManagerRequestCreateResponse,
    PublicConsentTemplateItem,
    PublicConsentTemplateResponse,
    PublicEventListResponse,
    PublicEventProfileItem,
    PublicEventProfileResponse,
    PublicEventSummaryItem,
)


events_router = APIRouter(prefix="/events", tags=["events"])


def resolve_public_event_status(event: Event) -> str:
    if event.status == EventStatus.FINISHED:
        return "ended"
    if event.status == EventStatus.IN_PROGRESS:
        return "in_progress"
    return "scheduled"


@events_router.get(
    "",
    response_model=PublicEventListResponse,
    summary="공개 이벤트 목록 조회",
)
async def list_public_events(
    db: AsyncSessionDepends,
):
    events = await Event.get_all(db)
    published_events = [
        PublicEventSummaryItem(
            id=event.id,
            slug=event.slug,
            name=event.name,
            start_at=event.start_time,
            board_size=event.bingo_size,
            bingo_mission_count=event.success_condition,
            status=resolve_public_event_status(event),
        )
        for event in events
        if event.publish_state == EventPublishState.PUBLISHED
    ]

    return PublicEventListResponse(
        ok=True,
        message="공개 이벤트 목록을 불러왔습니다.",
        events=published_events,
    )


@events_router.post(
    "/manager-requests",
    response_model=EventManagerRequestCreateResponse,
    summary="이벤트 관리자 권한 신청",
)
async def create_event_manager_request(
    payload: EventManagerRequestCreateRequest,
    db: AsyncSessionDepends,
):
    created_request = await EventManagerRequest.create(
        db,
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        organization=payload.organization.strip() if payload.organization else None,
        event_name=payload.event_name.strip(),
        event_purpose=payload.event_purpose.strip(),
        expected_event_date=payload.expected_event_date,
        expected_attendee_count=payload.expected_attendee_count,
        notes=payload.notes.strip() if payload.notes else None,
    )

    return EventManagerRequestCreateResponse(
        ok=True,
        message="이벤트 관리자 신청을 접수했습니다.",
        request=EventManagerRequestCreateItem(
            id=created_request.id,
            status=created_request.status.value,
            created_at=created_request.created_at,
        ),
    )


@events_router.get(
    "/consent-template",
    response_model=PublicConsentTemplateResponse,
    summary="공개 동의 템플릿 조회",
)
async def get_public_consent_template(
    db: AsyncSessionDepends,
):
    template = await PolicyTemplate.ensure_consent_template(db)

    return PublicConsentTemplateResponse(
        ok=True,
        message="공개 동의 템플릿을 불러왔습니다.",
        template=PublicConsentTemplateItem(
            content=template.content_markdown,
            updated_at=template.updated_at,
        ),
    )


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
            location=event.location,
            event_team=event.event_team,
            start_at=event.start_time,
            end_at=event.end_time,
            board_size=event.bingo_size,
            bingo_mission_count=event.success_condition,
            keywords=[str(keyword) for keyword in (event.keywords or [])],
            publish_state=event.publish_state.value,
        ),
    )
