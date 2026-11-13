from unittest.mock import AsyncMock
import asyncio

import httpx
import pytest
from main import app
import main


@pytest.mark.anyio
async def test_database_health_is_read_only(monkeypatch):
    session = AsyncMock()
    session.scalar.return_value = 1
    context = AsyncMock()
    context.__aenter__.return_value = session
    monkeypatch.setattr(main.db, "async_session_factory", lambda: context)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health/db")
    assert response.status_code == 200
    assert [str(call.args[0]) for call in session.execute.await_args_list] == [
        "SET TRANSACTION READ ONLY", "SET LOCAL statement_timeout = '5s'",
    ]
    assert str(session.scalar.call_args.args[0]) == "SELECT 1"
    session.commit.assert_not_awaited()
    context.__aexit__.assert_awaited_once()


@pytest.mark.anyio
async def test_database_failure_does_not_expose_credentials(monkeypatch):
    context = AsyncMock()
    context.__aenter__.side_effect = RuntimeError("postgres://secret-password@private-host")
    monkeypatch.setattr(main.db, "async_session_factory", lambda: context)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health/db")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable", "dependency": "database"}


@pytest.mark.anyio
@pytest.mark.parametrize("code,payload,expected,reason", [
    (200, {"external": {"google": True}}, 200, None),
    (200, {"external": {"google": False}}, 503, "google_disabled"),
    (521, {}, 503, "http_521"),
    (401, {}, 503, "http_401"),
])
async def test_auth_health_checks_google_settings(monkeypatch, code, payload, expected, reason):
    get = AsyncMock(return_value=httpx.Response(code, json=payload))
    context = AsyncMock()
    context.__aenter__.return_value.get = get
    monkeypatch.setattr(main, "SUPABASE_URL", "https://project.invalid")
    monkeypatch.setattr(main, "SUPABASE_KEY", "test-key")
    # Construct the ASGI client before replacing the upstream HTTP client.
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        monkeypatch.setattr(main.httpx, "AsyncClient", lambda **kwargs: context)
        response = await client.get("/health/auth")
    assert response.status_code == expected
    if reason: assert response.json()["reason"] == reason
    assert "test-key" not in response.text
    assert get.call_args.kwargs["headers"] == {"apikey": "test-key"}


@pytest.mark.anyio
@pytest.mark.parametrize("error,reason", [
    (httpx.ConnectError("private-host"), "connection_failed"),
    (httpx.ReadTimeout("private-host"), "timeout"),
    (ValueError("secret"), "invalid_response"),
    (httpx.RemoteProtocolError("private-host"), "connection_failed"),
])
async def test_auth_health_handles_transport_failures(monkeypatch, error, reason):
    context = AsyncMock()
    context.__aenter__.return_value.get.side_effect = error
    monkeypatch.setattr(main, "SUPABASE_URL", "https://project.invalid")
    monkeypatch.setattr(main, "SUPABASE_KEY", "test-key")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        monkeypatch.setattr(main.httpx, "AsyncClient", lambda **kwargs: context)
        response = await client.get("/health/auth")
    assert response.status_code == 503
    assert response.json()["reason"] == reason


@pytest.mark.anyio
async def test_database_timeout_closes_session(monkeypatch):
    original_timeout = asyncio.timeout
    monkeypatch.setattr(main.asyncio, "timeout", lambda seconds: original_timeout(0.001))
    async def stalled_query(*args):
        await asyncio.Event().wait()
    session = AsyncMock()
    session.scalar.side_effect = stalled_query
    context = AsyncMock()
    context.__aenter__.return_value = session
    monkeypatch.setattr(main.db, "async_session_factory", lambda: context)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health/db")
    assert response.status_code == 503
    context.__aexit__.assert_awaited_once()
    session.commit.assert_not_awaited()


@pytest.mark.anyio
@pytest.mark.parametrize("body", ["not json", "null", "[]", '{"external": null}'])
async def test_auth_health_rejects_malformed_settings(monkeypatch, body):
    context = AsyncMock()
    context.__aenter__.return_value.get.return_value = httpx.Response(200, text=body)
    monkeypatch.setattr(main, "SUPABASE_URL", "https://project.invalid")
    monkeypatch.setattr(main, "SUPABASE_KEY", "test-key")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        monkeypatch.setattr(main.httpx, "AsyncClient", lambda **kwargs: context)
        response = await client.get("/health/auth")
    assert response.status_code == 503
    assert response.json()["reason"] == "invalid_response"


@pytest.mark.anyio
async def test_auth_health_missing_configuration(monkeypatch):
    monkeypatch.setattr(main, "SUPABASE_URL", "")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health/auth")
    assert response.status_code == 503
    assert response.json()["reason"] == "not_configured"
