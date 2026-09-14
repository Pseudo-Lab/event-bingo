import os
from typing import Annotated, AsyncIterator
from urllib.parse import urlparse
from uuid import uuid4
from fastapi import Depends
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
    AsyncSession,
)

from dotenv import load_dotenv
from models.base import Base

load_dotenv("config/.env", override=True)


LOCAL_TEST_DB_HOSTS = {"localhost", "127.0.0.1", "::1", "postgres-test"}


def calculate_max_pool_clients(replicas: int, workers: int, pool_size: int, max_overflow: int) -> int:
    """Return the application-side connection ceiling across all worker processes."""
    return replicas * workers * (pool_size + max_overflow)


def _read_non_negative_int(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default

    try:
        value = int(raw_value)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer.") from exc

    if value < 0:
        raise ValueError(f"{name} must be zero or greater.")
    return value


def assert_safe_test_database_url(db_url: str | None = None) -> None:
    resolved_db_url = db_url or os.getenv("DB_URL", "")
    parsed = urlparse(resolved_db_url)
    database_name = parsed.path.lstrip("/")

    if os.getenv("ENV") != "test":
        raise RuntimeError("Database reset is only allowed when ENV=test.")

    if parsed.hostname not in LOCAL_TEST_DB_HOSTS:
        raise RuntimeError("Database reset is only allowed for a local test database host.")

    if "test" not in database_name.lower():
        raise RuntimeError("Database reset is only allowed when the database name contains 'test'.")


class Database:
    def __init__(self):
        self.async_engine = None
        self.async_session_factory = None

    def initialize(self):
        self.async_engine = create_async_engine(
            os.getenv("DB_URL"),
            pool_size=_read_non_negative_int("DB_POOL_SIZE", 3),
            max_overflow=_read_non_negative_int("DB_MAX_OVERFLOW", 1),
            pool_timeout=_read_non_negative_int("DB_POOL_TIMEOUT_SECONDS", 5),
            pool_pre_ping=True,
            pool_recycle=300,
            pool_use_lifo=True,
            connect_args={
                # Supabase pooler / PgBouncer uses transaction pooling, so
                # asyncpg statement names must stay unique and unpooled.
                "statement_cache_size": 0,
                "prepared_statement_cache_size": 0,
                "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
            },
        )
        self.async_session_factory = async_sessionmaker(
            bind=self.async_engine, autoflush=False, future=True, expire_on_commit=False, class_=AsyncSession
        )

    async def dispose(self) -> None:
        if self.async_engine is not None:
            await self.async_engine.dispose()

    async def create_database(self) -> None:
        if os.getenv("ENV") != "test":
            return

        assert_safe_test_database_url()
        async with self.async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def reset_database(self) -> None:
        assert_safe_test_database_url()
        async with self.async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

    async def get_session(self) -> AsyncIterator[AsyncSession]:
        if self.async_session_factory is None:
            raise RuntimeError("Database has not been initialized.")

        async with self.async_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise


db = Database()
AsyncSessionDepends = Annotated[AsyncSession, Depends(db.get_session)]
