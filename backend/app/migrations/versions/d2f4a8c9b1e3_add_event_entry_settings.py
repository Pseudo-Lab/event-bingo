"""add event entry settings

Revision ID: d2f4a8c9b1e3
Revises: b7d2c8a41e90
Create Date: 2026-06-06 21:55:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d2f4a8c9b1e3"
down_revision: Union[str, None] = "b7d2c8a41e90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column("expected_attendee_count", sa.Integer(), nullable=True),
    )
    op.add_column(
        "events",
        sa.Column(
            "restrict_before_start",
            sa.Boolean(),
            server_default=sa.true(),
            nullable=False,
        ),
    )
    op.alter_column("events", "restrict_before_start", server_default=None)


def downgrade() -> None:
    op.drop_column("events", "restrict_before_start")
    op.drop_column("events", "expected_attendee_count")
