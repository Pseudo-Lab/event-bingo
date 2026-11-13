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
    assert response.json() == {"status": "ok", "dependency": "database"}
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
