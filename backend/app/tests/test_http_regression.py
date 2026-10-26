"""Exercise the real ASGI routing/middleware stack without a production DB or auth service."""
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest

from api.admin import auth as admin_auth, routes as admin_routes
from api.auth.routes import LoginBingoUser
from api.events import seo_routes
from core import dependencies
from core.db import db
from main import app
from models.admin import AdminRole


@pytest.fixture
async def client():
    async def unused_session():
        yield None

    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides[db.get_session] = unused_session
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as value:
            yield value
    finally:
        app.dependency_overrides = previous_overrides


@pytest.mark.anyio
async def test_health_cors_and_metrics(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    response = await client.options(
        "/api/auth/bingo/login",
        headers={"Origin": "https://bingo.example.test", "Access-Control-Request-Method": "POST",
                 "Access-Control-Request-Headers": "authorization,content-type"},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://bingo.example.test"
    assert response.headers["access-control-allow-credentials"] == "true"
    response = await client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text


@pytest.mark.anyio
async def test_login_json_success_and_validation_errors(client):
    login = SimpleNamespace(execute=AsyncMock(return_value={"ok": True, "message": "ok", "user_id": 7}))
    app.dependency_overrides[LoginBingoUser] = lambda: login
    response = await client.post("/api/auth/bingo/login", json={"login_id": "ABC123", "password": "test-pass"})
    assert response.status_code == 200
    assert response.json()["user_id"] == 7
    login.execute.assert_awaited_once_with("ABC123", "test-pass", None, None)
    for body in ({}, {"login_id": "ABC123", "password": "x"}):
        response = await client.post("/api/auth/bingo/login", json=body)
        assert response.status_code == 422
        assert response.json()["detail"]
    response = await client.post("/api/auth/bingo/login", content="{", headers={"Content-Type": "application/json"})
    assert response.status_code == 422


@pytest.mark.anyio
async def test_admin_bearer_authentication_and_role_enforcement(client, monkeypatch):
    monkeypatch.setattr(admin_auth, "_admin_cache", {})
    monkeypatch.setattr(admin_auth, "decode_supabase_token", lambda token: None)
    fallback = AsyncMock(return_value=None)
    monkeypatch.setattr(admin_auth, "_fetch_supabase_user_payload", fallback)
    monkeypatch.setattr(admin_routes, "ensure_admin_console_seed_data", AsyncMock())
    response = await client.get("/api/admin/auth/me")
    assert response.status_code == 401
    fallback.assert_not_awaited()
    headers = {"Authorization": "Bearer test-token"}
    response = await client.get("/api/admin/auth/me", headers=headers)
    assert response.status_code == 401
    fallback.return_value = {"sub": "test-admin", "email": "manager@example.test"}
    actor = SimpleNamespace(id=7, email="manager@example.test", name="Manager", role=AdminRole.EVENT_MANAGER)
    monkeypatch.setattr(admin_auth.Admin, "get_by_email", AsyncMock(return_value=actor))
    response = await client.get("/api/admin/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["admin"]["role"] == "event_manager"
    response = await client.get("/api/admin/members", headers=headers)
    assert response.status_code == 403


@pytest.mark.anyio
@pytest.mark.parametrize("headers", [{}, {"Authorization": "Basic invalid"}, {"Authorization": "Bearer invalid"}])
async def test_play_rejects_missing_or_invalid_bearer_token(client, monkeypatch, headers):
    monkeypatch.setattr(dependencies, "decode_supabase_token", lambda token: None)
    response = await client.post("/api/play/events/test-event/join", headers=headers)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.anyio
async def test_csv_download_preserves_basic_auth_and_streaming(client, monkeypatch):
    monkeypatch.setattr(dependencies, "SWAGGER_USERNAME", "test-admin")
    monkeypatch.setattr(dependencies, "SWAGGER_PASSWORD", "test-password")
    user = SimpleNamespace(user_id=7, user_name="테스터", user_email="test@example.test", rating=5,
                           review="hello, world", created_at=datetime(2026, 1, 1))
    monkeypatch.setattr(admin_routes, "get_all_users", AsyncMock(return_value=[user]))
    url = "/api/admin/download-attendance-data"
    assert (await client.get(url)).status_code == 401
    assert (await client.get(url, auth=("test-admin", "wrong"))).status_code == 401
    response = await client.get(url, auth=("test-admin", "test-password"), headers={"Origin": "https://bingo.example.test"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.headers["content-disposition"] == "attachment; filename=attendance.csv"
    assert response.headers["access-control-expose-headers"] == "Content-Disposition"
    assert '"hello, world"' in response.text
    assert "테스터" in response.text


@pytest.mark.anyio
async def test_seo_html_and_upstream_failure(client, monkeypatch):
    fetch_index = AsyncMock(return_value="<html><head><title>Default</title></head><body></body></html>")
    monkeypatch.setattr(seo_routes, "fetch_frontend_index_html", fetch_index)
    event = SimpleNamespace(name="Test <event>", slug="test-event", location="Seoul", start_time=datetime(2026, 1, 1))
    get_event = AsyncMock(return_value=event)
    monkeypatch.setattr(seo_routes.Event, "get_by_slug", get_event)
    response = await client.get("/event/test-event")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "Test &lt;event&gt; | Bingo Networking" in response.text
    get_event.return_value = None
    assert (await client.get("/event/missing")).text == fetch_index.return_value
    fetch_index.side_effect = RuntimeError("unavailable")
    assert (await client.get("/event/test-event")).status_code == 503
