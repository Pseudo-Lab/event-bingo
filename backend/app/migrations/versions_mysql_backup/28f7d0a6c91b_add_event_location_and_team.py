"""add event location and team columns

Revision ID: 28f7d0a6c91b
Revises: 0f7b4d8e2c11
Create Date: 2026-03-20 11:15:00.000000+09:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "28f7d0a6c91b"
down_revision: Union[str, None] = "0f7b4d8e2c11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    existing_columns = {
        column["name"] for column in sa.inspect(connection).get_columns("events")
    }

    if "location" not in existing_columns:
        op.add_column(
            "events",
            sa.Column("location", sa.String(length=200), nullable=False, server_default="행사 장소"),
        )

    if "event_team" not in existing_columns:
        op.add_column(
            "events",
            sa.Column("event_team", sa.String(length=120), nullable=False, server_default="Event Team"),
        )


def downgrade() -> None:
    op.drop_column("events", "event_team")
    op.drop_column("events", "location")
