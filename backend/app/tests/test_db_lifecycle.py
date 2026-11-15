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
    assert options["pool_pre_ping"] is True
    assert options["pool_recycle"] == 300
    assert options["pool_use_lifo"] is True


@pytest.mark.anyio
async def test_dispose_closes_initialized_engine():
    database = Database()
    database.async_engine = MagicMock(dispose=AsyncMock())

    await database.dispose()

    database.async_engine.dispose.assert_awaited_once()


def test_pool_capacity_formula_for_production_hotfix_topology():
    assert calculate_max_pool_clients(replicas=2, workers=2, pool_size=3, max_overflow=1) == 16


@pytest.fixture
async def pooled_database(integration_db_session, monkeypatch):
    # Reuse the existing ENV=test/local-host guard and disposable schema fixture.
    monkeypatch.setenv("DB_URL", integration_db_session.bind.url.render_as_string(hide_password=False))
    monkeypatch.setenv("DB_POOL_SIZE", "3")
    monkeypatch.setenv("DB_MAX_OVERFLOW", "1")
    monkeypatch.setenv("DB_POOL_TIMEOUT_SECONDS", "1")
    database = Database()
    database.initialize()
    try:
        yield database
    finally:
        await database.dispose()


@pytest.mark.db_integration
@pytest.mark.anyio
async def test_first_checkout_replaces_terminated_idle_connection(pooled_database, integration_db_session):
    from sqlalchemy import text

    async with pooled_database.async_engine.connect() as connection:
        old_pid = await connection.scalar(text("SELECT pg_backend_pid()"))
    assert await integration_db_session.scalar(
        text("SELECT pg_terminate_backend(:pid, 1000)"), {"pid": old_pid}
    )
    # No retry: the very first request after termination must succeed.
    async with pooled_database.async_engine.connect() as connection:
        assert await connection.scalar(text("SELECT 1")) == 1
        assert await connection.scalar(text("SELECT pg_backend_pid()")) != old_pid


@pytest.mark.db_integration
@pytest.mark.anyio
async def test_pool_limit_times_out_and_recovers_after_release(pooled_database):
    from contextlib import AsyncExitStack
    from sqlalchemy import text
    from sqlalchemy.exc import TimeoutError

    async with AsyncExitStack() as stack:
        for _ in range(4):
            await stack.enter_async_context(pooled_database.async_engine.connect())
        with pytest.raises(TimeoutError):
            await pooled_database.async_engine.connect()
    async with pooled_database.async_engine.connect() as connection:
        assert await connection.scalar(text("SELECT 1")) == 1


@pytest.mark.db_integration
@pytest.mark.anyio
async def test_real_session_commit_and_failure_rollback(pooled_database, integration_db_session):
    from sqlalchemy import select
    from models.user import BingoUser

    async for session in pooled_database.get_session():
        session.add(BingoUser(user_email="committed@example.test"))
    dependency = pooled_database.get_session()
    session = await anext(dependency)
    session.add(BingoUser(user_email="rolled-back@example.test"))
    await session.flush()
    with pytest.raises(RuntimeError, match="endpoint failed"):
        await dependency.athrow(RuntimeError("endpoint failed"))
    assert (await integration_db_session.scalars(select(BingoUser.user_email))).all() == ["committed@example.test"]


@pytest.mark.db_integration
@pytest.mark.anyio
async def test_transaction_disconnect_propagates_without_replaying_write(pooled_database, integration_db_session):
    from sqlalchemy import select, text
    from sqlalchemy.exc import DBAPIError
    from models.user import BingoUser

    dependency = pooled_database.get_session()
    session = await anext(dependency)
    session.add(BingoUser(user_email="interrupted@example.test"))
    await session.flush()
    pid = await session.scalar(text("SELECT pg_backend_pid()"))
    assert await integration_db_session.scalar(
        text("SELECT pg_terminate_backend(:pid, 1000)"), {"pid": pid}
    )
    with pytest.raises(DBAPIError) as error:
        await session.scalar(text("SELECT 1"))
    with pytest.raises(DBAPIError):
        await dependency.athrow(error.value)
    async for recovered in pooled_database.get_session():
        assert (await recovered.scalars(select(BingoUser.user_email))).all() == []
