"""add event english support flag

Revision ID: f3a4b5c6d7e8
Revises: e4f5a6b7c8d9
Create Date: 2026-07-07 21:20:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f3a4b5c6d7e8"
down_revision: Union[str, None] = "e4f5a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column(
            "english_support_enabled",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
    )
    op.alter_column("events", "english_support_enabled", server_default=None)


def downgrade() -> None:
    op.drop_column("events", "english_support_enabled")
