import os
from collections.abc import AsyncIterator

import pytest
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import models  # noqa: F401 - imports all model metadata for Base.metadata.create_all.
from core.db import assert_safe_test_database_url
from models.base import Base


LOCAL_TEST_DB_URL = "postgresql+asyncpg://event_bingo_test:event_bingo_test@localhost:55432/event_bingo_test"


def pytest_addoption(parser):
    parser.addoption(
        "--run-db-integration",
        action="store_true",
        default=False,
        help="run DB-backed integration tests against the local test Postgres database",
    )


def pytest_configure(config):
    config.addinivalue_line("markers", "db_integration: requires the local test Postgres database")


def pytest_collection_modifyitems(config, items):
    if config.getoption("--run-db-integration"):
        return

    skip_marker = pytest.mark.skip(reason="requires --run-db-integration and a guarded local test DB")
    for item in items:
        if "db_integration" in item.keywords:
            item.add_marker(skip_marker)


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _get_local_test_db_url() -> str:
    database_url = os.getenv("TEST_DB_URL") or os.getenv("DB_URL") or LOCAL_TEST_DB_URL
    if os.getenv("ENV") != "test":
        pytest.skip("DB integration tests require ENV=test.")

    assert_safe_test_database_url(database_url)
    return database_url


@pytest.fixture
async def integration_db_session() -> AsyncIterator[AsyncSession]:
    database_url = _get_local_test_db_url()
    engine = create_async_engine(database_url, poolclass=NullPool)
    session_factory = async_sessionmaker(
        bind=engine,
        autoflush=False,
        expire_on_commit=False,
        class_=AsyncSession,
    )

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
    except OperationalError as exc:
        await engine.dispose()
        pytest.skip(f"Local test database is not reachable: {exc}")

    async with session_factory() as session:
        yield session
        await session.rollback()

    await engine.dispose()
