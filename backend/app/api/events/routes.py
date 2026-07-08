from fastapi import APIRouter, HTTPException, status

from core.db import AsyncSessionDepends
from api.admin.console_services import (
    get_event_keyword_texts,
    get_event_keyword_translations,
    send_event_manager_request_admin_webhook,
    send_event_manager_request_received_email,
)
from models.event import Event, EventStatus
from models.event_manager_request import EventManagerRequest
from models.policy_template import (
    DEFAULT_PLATFORM_POLICY_TEMPLATE,
    PLATFORM_PRIVACY_POLICY_UPDATED_AT,
    PolicyTemplate,
)

from .schema import (
    EventManagerRequestCreateItem,
    EventManagerRequestCreateRequest,
    EventManagerRequestCreateResponse,
    PublicEventPrivacyNoticeItem,
    PublicEventPrivacyNoticeResponse,
    PublicEventListResponse,
    PublicEventProfileItem,
    PublicEventProfileResponse,
    PublicPolicyTemplateItem,
    PublicPolicyTemplateResponse,
)


events_router = APIRouter(prefix="/events", tags=["events"])


def resolve_public_event_status(event: Event) -> str:
    if event.status == EventStatus.FINISHED:
        return "ended"
    if event.status == EventStatus.IN_PROGRESS:
        return "in_progress"
    return "scheduled"


def normalize_event_manager_request_purpose(event_purpose: str | None) -> str:
    normalized_event_purpose = event_purpose.strip() if event_purpose else ""
    return normalized_event_purpose or "미입력"


def normalize_public_event_text(value: str | None, fallback: str) -> str:
    normalized_value = value.strip() if value else ""
    return normalized_value or fallback


@events_router.get(
    "",
    response_model=PublicEventListResponse,
    summary="공개 이벤트 목록 조회",
)
async def list_public_events():
    return PublicEventListResponse(
        ok=True,
        message="공개 이벤트 목록은 제공하지 않습니다.",
        events=[],
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
    normalized_name = payload.name.strip()
    normalized_email = payload.email.strip().lower()
    normalized_event_name = payload.event_name.strip()

    created_request = await EventManagerRequest.create(
        db,
        name=normalized_name,
        email=normalized_email,
        organization=payload.organization.strip() if payload.organization else None,
        event_name=normalized_event_name,
        event_purpose=normalize_event_manager_request_purpose(payload.event_purpose),
        expected_event_date=payload.expected_event_date,
        expected_attendee_count=payload.expected_attendee_count,
        notes=payload.notes.strip() if payload.notes else None,
    )
    send_event_manager_request_received_email(
        recipient_email=normalized_email,
        recipient_name=normalized_name,
        event_name=normalized_event_name,
        expected_event_date=payload.expected_event_date,
        expected_attendee_count=payload.expected_attendee_count,
    )
    send_event_manager_request_admin_webhook(
        request_id=created_request.id,
        event_name=normalized_event_name,
        expected_event_date=payload.expected_event_date,
        expected_attendee_count=payload.expected_attendee_count,
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
    "/privacy-template",
    response_model=PublicPolicyTemplateResponse,
    summary="공개 개인정보 처리 안내 조회",
)
@events_router.get(
    "/consent-template",
    response_model=PublicPolicyTemplateResponse,
    include_in_schema=False,
)
async def get_public_policy_template():
    return PublicPolicyTemplateResponse(
        ok=True,
        message="공개 개인정보처리방침을 불러왔습니다.",
        template=PublicPolicyTemplateItem(
            content=PolicyTemplate.render_platform_policy_content(DEFAULT_PLATFORM_POLICY_TEMPLATE),
            updated_at=PLATFORM_PRIVACY_POLICY_UPDATED_AT,
        ),
    )


@events_router.get(
    "/{event_slug}/privacy-notice-template",
    response_model=PublicEventPrivacyNoticeResponse,
    summary="행사 참가자 개인정보 처리 안내 조회",
)
async def get_public_event_privacy_notice(
    event_slug: str,
    db: AsyncSessionDepends,
):
    event = await Event.get_by_slug(db, event_slug.strip().lower())
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="이벤트를 찾을 수 없습니다.",
        )

    event_name = normalize_public_event_text(event.name, "이벤트")
    event_team = normalize_public_event_text(event.event_team, "Event Team")
    event_contact_email = normalize_public_event_text(event.admin_email, "devfactory.ops@gmail.com")

    template = await PolicyTemplate.ensure_consent_template(db)
    rendered_content = PolicyTemplate.render_participant_notice_content(
        template.content_markdown,
        event_name=event_name,
        event_team=event_team,
        event_contact_email=event_contact_email,
    )

    return PublicEventPrivacyNoticeResponse(
        ok=True,
        message="행사 참가자 개인정보 처리 안내를 불러왔습니다.",
        template=PublicEventPrivacyNoticeItem(
            event_slug=event.slug,
            event_name=event_name,
            event_team=event_team,
            contact_email=event_contact_email,
            content=rendered_content,
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

    event_name = normalize_public_event_text(event.name, "이벤트")
    event_location = normalize_public_event_text(event.location, "행사 장소")
    event_team = normalize_public_event_text(event.event_team, "Event Team")

    return PublicEventProfileResponse(
        ok=True,
        message="이벤트 설정을 불러왔습니다.",
        event=PublicEventProfileItem(
            id=event.id,
            slug=event.slug,
            name=event_name,
            location=event_location,
            event_team=event_team,
            start_at=event.start_time,
            end_at=event.end_time,
            board_size=event.bingo_size,
            bingo_mission_count=event.success_condition,
            restrict_before_start=event.restrict_before_start,
            english_support_enabled=getattr(event, "english_support_enabled", False),
            keywords=get_event_keyword_texts(event.keywords),
            keyword_translations=get_event_keyword_translations(event.keywords),
        ),
    )
