import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import api.analytics.routes as analytics_routes
from api.analytics.routes import analytics_router, validate_analytics_event_payload
from api.analytics.schema import AnalyticsEventCreateRequest


def _request_payload(**overrides):
    payload = {
        "event_id": "event-123456",
        "schema_version": 1,
        "event_name": "homepage_viewed",
        "event_source": "frontend",
        "analytics_session_id": "session-123456",
        "page_view_id": "page-123456",
        "occurred_at": datetime(2026, 5, 18, tzinfo=timezone.utc),
        "route": "/",
        "hostname": "bingo.pseudolab-devfactory.com",
        "environment": "production",
        "deployment_channel": "bingo",
        "is_production_domain": True,
        "viewport_bucket": "desktop-lg",
        "device_class": "desktop",
        "referrer_type": "direct",
        "properties": {"entry_path": "/", "section_id": "hero"},
        "experiments": [],
    }
    payload.update(overrides)
    return AnalyticsEventCreateRequest(**payload)


def _request(headers=None):
    return SimpleNamespace(headers=headers or {})


def test_analytics_router_exposes_event_collection_endpoint():
    paths = {route.path for route in analytics_router.routes}

    assert "/analytics/events" in paths


def test_validate_analytics_event_payload_accepts_production_domain():
    validated = validate_analytics_event_payload(
        _request_payload(),
        _request(headers={"origin": "https://bingo.pseudolab-devfactory.com"}),
    )

    assert validated["hostname"] == "bingo.pseudolab-devfactory.com"
    assert validated["environment"] == "production"
    assert validated["deployment_channel"] == "bingo"
    assert validated["is_production_domain"] is True


def test_validate_analytics_event_payload_rejects_unknown_hostname():
    with pytest.raises(HTTPException) as exc_info:
        validate_analytics_event_payload(
            _request_payload(
                hostname="example.com",
                environment="unknown",
                deployment_channel="other",
                is_production_domain=False,
            ),
            _request(),
        )

    assert exc_info.value.status_code == 400


def test_validate_analytics_event_payload_rejects_mismatched_origin():
    with pytest.raises(HTTPException) as exc_info:
        validate_analytics_event_payload(
            _request_payload(),
            _request(headers={"origin": "https://bingo-private.pseudolab-devfactory.com"}),
        )

    assert exc_info.value.status_code == 403


def test_validate_analytics_event_payload_rejects_personal_information_properties():
    with pytest.raises(HTTPException) as exc_info:
        validate_analytics_event_payload(
            _request_payload(properties={"email": "organizer@example.com"}),
            _request(),
        )

    assert exc_info.value.status_code == 400


def test_validate_analytics_event_payload_accepts_campaign_and_qa_properties():
    properties = {
        "entry_path": "/",
        "traffic_type": "internal_qa",
        "utm_source": "luma",
        "utm_medium": "event_page",
        "utm_campaign": "networking_promo_20260521",
        "utm_content": "poster_a",
        "referrer_domain_bucket": "luma",
        "session_entry_route": "/",
        "session_entry_referrer_type": "external",
        "session_entry_referrer_domain_bucket": "luma",
        "session_entry_utm_source": "luma",
        "session_entry_utm_medium": "event_page",
        "session_entry_utm_campaign": "networking_promo_20260521",
    }

    validated = validate_analytics_event_payload(
        _request_payload(properties=properties, referrer_type="external"),
        _request(headers={"origin": "https://bingo.pseudolab-devfactory.com"}),
    )

    assert validated["properties"] == properties


def test_validate_analytics_event_payload_rejects_invalid_traffic_type():
    with pytest.raises(HTTPException) as exc_info:
        validate_analytics_event_payload(
            _request_payload(properties={"traffic_type": "developer"}),
            _request(),
        )

    assert exc_info.value.status_code == 400


def test_validate_analytics_event_payload_rejects_unknown_utm_property():
    with pytest.raises(HTTPException) as exc_info:
        validate_analytics_event_payload(
            _request_payload(properties={"utm_raw_url": "https_example.com"}),
            _request(),
        )

    assert exc_info.value.status_code == 400


def test_validate_analytics_event_payload_rejects_unsafe_campaign_value():
    with pytest.raises(HTTPException) as exc_info:
        validate_analytics_event_payload(
            _request_payload(properties={"utm_campaign": "networking promo 20260521"}),
            _request(),
        )

    assert exc_info.value.status_code == 400


def test_create_analytics_event_returns_duplicate_without_second_insert(monkeypatch):
    calls = {"create": 0}

    async def fake_get_by_event_id(_session, event_id):
        return SimpleNamespace(event_id=event_id)

    async def fake_create(_session, **_kwargs):
        calls["create"] += 1

    monkeypatch.setattr(analytics_routes.SiteAnalyticsEvent, "get_by_event_id", fake_get_by_event_id)
    monkeypatch.setattr(analytics_routes.SiteAnalyticsEvent, "create", fake_create)

    response = asyncio.run(
        analytics_routes.create_analytics_event(
            _request_payload(),
            _request(headers={"origin": "https://bingo.pseudolab-devfactory.com"}),
            object(),
        )
    )

    assert response.ok is True
    assert response.event.status == "duplicate"
    assert calls["create"] == 0
