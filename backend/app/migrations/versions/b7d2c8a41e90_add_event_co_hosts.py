"""add event co-hosts table

Revision ID: b7d2c8a41e90
Revises: 8f4b2d9c1a30
Create Date: 2026-06-06 17:35:00.000000+09:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7d2c8a41e90"
down_revision: Union[str, None] = "8f4b2d9c1a30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "event_co_hosts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("admin_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["admin_id"], ["admins.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", "admin_id", name="uq_event_co_hosts_event_admin"),
    )
    op.create_index(
        "ix_event_co_hosts_admin_id_event_id",
        "event_co_hosts",
        ["admin_id", "event_id"],
    )
    op.create_index(
        "ix_event_co_hosts_event_id",
        "event_co_hosts",
        ["event_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_event_co_hosts_event_id", table_name="event_co_hosts")
    op.drop_index("ix_event_co_hosts_admin_id_event_id", table_name="event_co_hosts")
    op.drop_table("event_co_hosts")
