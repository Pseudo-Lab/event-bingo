import asyncio

from api.events.routes import (
    events_router,
    get_public_policy_template,
    normalize_event_manager_request_purpose,
)
from api.events.schema import EventManagerRequestCreateRequest
from models.policy_template import PLATFORM_PRIVACY_POLICY_UPDATED_AT


def test_events_router_exposes_public_catalog_and_application_endpoints():
    paths = {route.path for route in events_router.routes}

    assert "/events" in paths
    assert "/events/privacy-template" in paths
    assert "/events/consent-template" in paths
    assert "/events/{event_slug}/privacy-notice-template" in paths
    assert "/events/manager-requests" in paths
    assert "/events/{event_slug}" in paths


def test_public_platform_policy_endpoint_returns_code_defined_static_policy():
    response = asyncio.run(get_public_policy_template())

    assert response.template.updated_at == PLATFORM_PRIVACY_POLICY_UPDATED_AT
    assert "DevFactory 서비스 운영팀" in response.template.content
    assert "policy_templates" not in response.template.content


def test_event_manager_request_allows_missing_event_purpose():
    payload = EventManagerRequestCreateRequest(
        name="홍길동",
        email="organizer@example.com",
        event_name="테스트 행사",
    )

    assert payload.event_purpose is None


def test_event_manager_request_allows_short_event_purpose_placeholder():
    payload = EventManagerRequestCreateRequest(
        name="홍길동",
        email="organizer@example.com",
        event_name="테스트 행사",
        event_purpose="미입력",
    )

    assert payload.event_purpose == "미입력"


def test_event_manager_request_purpose_normalization_uses_placeholder_for_blank_value():
    assert normalize_event_manager_request_purpose(None) == "미입력"
    assert normalize_event_manager_request_purpose("   ") == "미입력"
    assert normalize_event_manager_request_purpose(" 내부 네트워킹 ") == "내부 네트워킹"
