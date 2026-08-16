from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from core.db import Database, calculate_max_pool_clients


class SessionContext:
    def __init__(self, session):
        self.session = session

    async def __aenter__(self):
        return self.session

    async def __aexit__(self, exc_type, exc, traceback):
        return False


@pytest.mark.anyio
async def test_get_session_commits_and_returns_session():
    database = Database()
    session = MagicMock(commit=AsyncMock(), rollback=AsyncMock())
    database.async_session_factory = MagicMock(return_value=SessionContext(session))

    dependency = database.get_session()

    assert await anext(dependency) is session
    with pytest.raises(StopAsyncIteration):
        await anext(dependency)

    session.commit.assert_awaited_once()
    session.rollback.assert_not_awaited()


@pytest.mark.anyio
async def test_get_session_rolls_back_and_propagates_endpoint_exception():
    database = Database()
    session = MagicMock(commit=AsyncMock(), rollback=AsyncMock())
    database.async_session_factory = MagicMock(return_value=SessionContext(session))
    dependency = database.get_session()
    await anext(dependency)

    with pytest.raises(RuntimeError, match="endpoint failed"):
        await dependency.athrow(RuntimeError("endpoint failed"))

    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()


def test_initialize_uses_bounded_environment_overridable_pool(monkeypatch):
    monkeypatch.setenv("DB_URL", "postgresql+asyncpg://example.invalid/postgres")
    monkeypatch.setenv("DB_POOL_SIZE", "4")
    monkeypatch.setenv("DB_MAX_OVERFLOW", "2")
    monkeypatch.setenv("DB_POOL_TIMEOUT_SECONDS", "7")
    engine = MagicMock()

    with patch("core.db.create_async_engine", return_value=engine) as create_engine:
        Database().initialize()

    options = create_engine.call_args.kwargs
    assert options["pool_size"] == 4
    assert options["max_overflow"] == 2
    assert options["pool_timeout"] == 7
    assert options["pool_use_lifo"] is True


@pytest.mark.anyio
async def test_dispose_closes_initialized_engine():
    database = Database()
    database.async_engine = MagicMock(dispose=AsyncMock())

    await database.dispose()

    database.async_engine.dispose.assert_awaited_once()


def test_pool_capacity_formula_for_production_hotfix_topology():
    assert calculate_max_pool_clients(replicas=2, workers=2, pool_size=3, max_overflow=1) == 16
