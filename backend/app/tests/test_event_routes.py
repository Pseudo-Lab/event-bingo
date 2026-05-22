import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

import api.events.routes as event_routes
from api.events.routes import (
    events_router,
    get_public_policy_template,
    list_public_events,
    normalize_event_manager_request_purpose,
)
from api.events.schema import EventManagerRequestCreateRequest
from models.event import Event
from models.event_manager_request import EventManagerRequest, EventManagerRequestStatus
from models.policy_template import PLATFORM_PRIVACY_POLICY_UPDATED_AT


def test_events_router_exposes_public_catalog_and_application_endpoints():
    paths = {route.path for route in events_router.routes}

    assert "/events" in paths
    assert "/events/privacy-template" in paths
    assert "/events/consent-template" in paths
    assert "/events/{event_slug}/privacy-notice-template" in paths
    assert "/events/manager-requests" in paths
    assert "/events/{event_slug}" in paths


def test_public_catalog_does_not_enumerate_events(monkeypatch):
    async def fail_get_all(_session):
        raise AssertionError("public catalog must not enumerate all events")

    monkeypatch.setattr(Event, "get_all", fail_get_all)

    response = asyncio.run(list_public_events())

    assert response.ok is True
    assert response.events == []


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


def test_create_event_manager_request_sends_receipt_email(monkeypatch):
    created_at = datetime(2026, 5, 14, tzinfo=timezone.utc)
    create_payload = {}
    sent_payload = {}

    async def fake_create(_session, **kwargs):
        create_payload.update(kwargs)
        return SimpleNamespace(
            id=42,
            status=EventManagerRequestStatus.PENDING,
            created_at=created_at,
        )

    def fake_send_event_manager_request_received_email(**kwargs):
        sent_payload.update(kwargs)
        return True

    monkeypatch.setattr(EventManagerRequest, "create", fake_create)
    monkeypatch.setattr(
        event_routes,
        "send_event_manager_request_received_email",
        fake_send_event_manager_request_received_email,
    )

    response = asyncio.run(
        event_routes.create_event_manager_request(
            EventManagerRequestCreateRequest(
                name=" 홍길동 ",
                email=" Organizer@Example.COM ",
                event_name=" 네트워킹 데이 ",
                event_purpose=" ",
                expected_event_date=datetime(2026, 6, 1, tzinfo=timezone.utc),
                expected_attendee_count=100,
            ),
            object(),
        )
    )

    assert response.ok is True
    assert response.request.id == 42
    assert create_payload["name"] == "홍길동"
    assert create_payload["email"] == "organizer@example.com"
    assert create_payload["event_name"] == "네트워킹 데이"
    assert create_payload["event_purpose"] == "미입력"
    assert sent_payload == {
        "recipient_email": "organizer@example.com",
        "recipient_name": "홍길동",
        "event_name": "네트워킹 데이",
        "expected_event_date": datetime(2026, 6, 1, tzinfo=timezone.utc),
        "expected_attendee_count": 100,
    }
