import re
from typing import Any
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Request, status

from core.db import AsyncSessionDepends
from models.site_analytics_event import SiteAnalyticsEvent

from .schema import (
    AnalyticsEventCreateItem,
    AnalyticsEventCreateRequest,
    AnalyticsEventCreateResponse,
)


analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])

ALLOWED_EVENT_NAMES = {
    "homepage_viewed",
    "homepage_section_viewed",
    "homepage_cta_clicked",
    "admin_login_clicked",
    "application_form_viewed",
    "application_form_started",
    "application_validation_failed",
    "application_submit_clicked",
    "application_submitted",
    "demo_keyword_selection_viewed",
    "demo_keyword_selection_ready",
    "demo_start_clicked",
    "demo_game_viewed",
    "demo_exchange_advanced",
    "demo_goal_completed",
    "demo_replay_clicked",
    "demo_invalid_game_entry_redirected",
    "site_route_changed",
    "site_session_checkpoint",
}

ALLOWED_ROUTES = {"/", "/demo/play", "/demo/play/game"}
ALLOWED_EVENT_SOURCES = {"frontend"}
ALLOWED_DEVICE_CLASSES = {"mobile", "tablet", "desktop"}
ALLOWED_VIEWPORT_BUCKETS = {"mobile", "tablet", "desktop-sm", "desktop-md", "desktop-lg"}
ALLOWED_REFERRER_TYPES = {"direct", "internal", "external", "unknown"}
ALLOWED_TRAFFIC_TYPES = {"public", "internal_qa"}
ALLOWED_UTM_PROPERTY_KEYS = {"utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"}
ALLOWED_REFERRER_DOMAIN_BUCKETS = {
    "direct",
    "internal",
    "luma",
    "google",
    "linkedin",
    "facebook",
    "instagram",
    "github",
    "other_external",
    "unknown",
}
HOST_ENVIRONMENT_MAP = {
    "bingo.pseudolab-devfactory.com": ("production", "bingo", True),
    "bingo-private.pseudolab-devfactory.com": ("private_dev", "bingo-private", False),
    "localhost": ("local", "localhost", False),
    "127.0.0.1": ("local", "localhost", False),
    "0.0.0.0": ("local", "localhost", False),
    "::1": ("local", "localhost", False),
}
LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
ANALYTICS_TOKEN_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_.-]{0,79}$")
DISALLOWED_PROPERTY_KEYS = {
    "email",
    "name",
    "phone",
    "user_email",
    "user_name",
    "participant_name",
    "sender_name",
    "receiver_name",
    "event_name",
    "event_slug",
    "free_text",
    "raw_url",
    "raw_query",
    "raw_user_agent",
    "user_agent",
    "ip",
    "ip_address",
    "text",
    "query",
    "search",
    "purpose",
    "notes",
}


def validate_low_cardinality_token(value: Any, path: str) -> None:
    if not isinstance(value, str) or not ANALYTICS_TOKEN_PATTERN.fullmatch(value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"허용되지 않은 analytics property 값입니다: {path}",
        )


def validate_known_property_value(key: str, value: Any, path: str) -> None:
    if key == "traffic_type":
        if value not in ALLOWED_TRAFFIC_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"허용되지 않은 traffic_type입니다: {path}",
            )
        return

    if key.startswith("utm_"):
        if key not in ALLOWED_UTM_PROPERTY_KEYS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"허용되지 않은 UTM analytics property입니다: {path}",
            )
        validate_low_cardinality_token(value, path)
        return

    if key in {"session_entry_utm_source", "session_entry_utm_medium", "session_entry_utm_campaign"}:
        validate_low_cardinality_token(value, path)
        return

    if key == "referrer_domain_bucket" or key == "session_entry_referrer_domain_bucket":
        if value not in ALLOWED_REFERRER_DOMAIN_BUCKETS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"허용되지 않은 referrer domain bucket입니다: {path}",
            )
        return

    if key == "session_entry_referrer_type":
        if value not in ALLOWED_REFERRER_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"허용되지 않은 session entry referrer type입니다: {path}",
            )
        return

    if key == "session_entry_route":
        if value not in ALLOWED_ROUTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"허용되지 않은 session entry route입니다: {path}",
            )


def normalize_hostname(hostname: str) -> str:
    return hostname.strip().lower().strip("[]")


def resolve_environment(hostname: str) -> tuple[str, str, bool]:
    normalized_hostname = normalize_hostname(hostname)
    if normalized_hostname not in HOST_ENVIRONMENT_MAP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="허용되지 않은 analytics hostname입니다.",
        )
    return HOST_ENVIRONMENT_MAP[normalized_hostname]


def resolve_header_hostname(request: Request) -> str | None:
    origin_or_referer = request.headers.get("origin") or request.headers.get("referer")
    if not origin_or_referer:
        return None

    parsed = urlparse(origin_or_referer)
    if not parsed.hostname:
        return None
    return normalize_hostname(parsed.hostname)


def validate_origin_hostname(payload_hostname: str, request: Request) -> None:
    header_hostname = resolve_header_hostname(request)
    if not header_hostname:
        return

    if header_hostname not in HOST_ENVIRONMENT_MAP:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="허용되지 않은 analytics origin입니다.",
        )

    payload_hostname = normalize_hostname(payload_hostname)
    if header_hostname == payload_hostname:
        return
    if header_hostname in LOCAL_HOSTS and payload_hostname in LOCAL_HOSTS:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="analytics origin과 hostname이 일치하지 않습니다.",
    )


def validate_safe_properties(value: Any, path: str = "properties") -> None:
    if isinstance(value, dict):
        if len(value) > 60:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{path} 항목 수가 너무 많습니다.",
            )
        for key, nested_value in value.items():
            normalized_key = str(key).strip().lower()
            if normalized_key in DISALLOWED_PROPERTY_KEYS or normalized_key.startswith("raw_"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"개인정보 또는 원문 로그로 판단되는 필드는 저장할 수 없습니다: {path}.{key}",
                )
            validate_known_property_value(normalized_key, nested_value, f"{path}.{key}")
            validate_safe_properties(nested_value, f"{path}.{key}")
        return

    if isinstance(value, list):
        if len(value) > 30:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{path} 배열 길이가 너무 깁니다.",
            )
        for index, nested_value in enumerate(value):
            validate_safe_properties(nested_value, f"{path}[{index}]")
        return

    if isinstance(value, str):
        if len(value) > 300:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{path} 문자열이 너무 깁니다.",
            )
        if EMAIL_PATTERN.match(value.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"이메일 형식 값은 analytics properties에 저장할 수 없습니다: {path}",
            )
        return

    if value is None or isinstance(value, (bool, int, float)):
        return

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"지원하지 않는 analytics property 타입입니다: {path}",
    )


def validate_analytics_event_payload(payload: AnalyticsEventCreateRequest, request: Request) -> dict[str, Any]:
    if payload.event_name not in ALLOWED_EVENT_NAMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="허용되지 않은 analytics event_name입니다.",
        )
    if payload.event_source not in ALLOWED_EVENT_SOURCES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="허용되지 않은 analytics event_source입니다.",
        )
    if payload.route not in ALLOWED_ROUTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="허용되지 않은 analytics route입니다.",
        )
    if payload.device_class not in ALLOWED_DEVICE_CLASSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="허용되지 않은 device_class입니다.",
        )
    if payload.viewport_bucket not in ALLOWED_VIEWPORT_BUCKETS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="허용되지 않은 viewport_bucket입니다.",
        )
    if payload.referrer_type not in ALLOWED_REFERRER_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="허용되지 않은 referrer_type입니다.",
        )

    validate_origin_hostname(payload.hostname, request)
    environment, deployment_channel, is_production_domain = resolve_environment(payload.hostname)
    if (
        payload.environment != environment
        or payload.deployment_channel != deployment_channel
        or payload.is_production_domain != is_production_domain
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="analytics hostname 환경 정보가 일치하지 않습니다.",
        )

    validate_safe_properties(payload.properties)
    validate_safe_properties({"experiments": payload.experiments})

    return {
        "event_id": payload.event_id,
        "schema_version": payload.schema_version,
        "event_name": payload.event_name,
        "event_source": payload.event_source,
        "analytics_session_id": payload.analytics_session_id,
        "page_view_id": payload.page_view_id,
        "occurred_at": payload.occurred_at,
        "app_version": payload.app_version,
        "route": payload.route,
        "hostname": normalize_hostname(payload.hostname),
        "environment": environment,
        "deployment_channel": deployment_channel,
        "is_production_domain": is_production_domain,
        "viewport_bucket": payload.viewport_bucket,
        "device_class": payload.device_class,
        "referrer_type": payload.referrer_type,
        "properties": payload.properties,
        "experiments": payload.experiments,
    }


@analytics_router.post(
    "/events",
    response_model=AnalyticsEventCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="홈페이지 및 데모 analytics 이벤트 수집",
)
async def create_analytics_event(
    payload: AnalyticsEventCreateRequest,
    request: Request,
    db: AsyncSessionDepends,
):
    create_kwargs = validate_analytics_event_payload(payload, request)
    existing_event = await SiteAnalyticsEvent.get_by_event_id(db, payload.event_id)
    if existing_event:
        return AnalyticsEventCreateResponse(
            ok=True,
            message="이미 수집된 analytics 이벤트입니다.",
            event=AnalyticsEventCreateItem(event_id=payload.event_id, status="duplicate"),
        )

    created_event = await SiteAnalyticsEvent.create(db, **create_kwargs)
    return AnalyticsEventCreateResponse(
        ok=True,
        message="analytics 이벤트를 수집했습니다.",
        event=AnalyticsEventCreateItem(event_id=created_event.event_id, status="accepted"),
    )
