import os
from asyncio import current_task
from core.log import logger
from typing import Annotated, AsyncIterator
from urllib.parse import urlparse
from uuid import uuid4
from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
    async_scoped_session,
    AsyncSession,
)
from sqlalchemy.pool import NullPool

from dotenv import load_dotenv
from models.base import Base

load_dotenv("config/.env", override=True)


LOCAL_TEST_DB_HOSTS = {"localhost", "127.0.0.1", "::1", "postgres-test"}


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
        self.async_scoped_session = None

    def initialize(self):
        self.async_engine = create_async_engine(
            os.getenv("DB_URL"),
            poolclass=NullPool,
            pool_pre_ping=True,
            pool_recycle=300,
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
        self.async_scoped_session = async_scoped_session(self.async_session_factory, scopefunc=current_task)

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
        async with self.async_scoped_session() as session:
            try:
                yield session
                await session.commit()
            except SQLAlchemyError as e:
                logger.error(e)
                await session.rollback()
            finally:
                await session.close()


db = Database()
AsyncSessionDepends = Annotated[AsyncSession, Depends(db.get_session)]
