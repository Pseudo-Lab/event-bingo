"""add site analytics events table

Revision ID: 8f4b2d9c1a30
Revises: a1b2c3d4e5f6
Create Date: 2026-05-18 01:20:00.000000+09:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8f4b2d9c1a30"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    existing_tables = set(inspector.get_table_names())

    if "site_analytics_events" in existing_tables:
        return

    op.create_table(
        "site_analytics_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.String(length=80), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("event_name", sa.String(length=80), nullable=False),
        sa.Column("event_source", sa.String(length=32), nullable=False),
        sa.Column("analytics_session_id", sa.String(length=80), nullable=False),
        sa.Column("page_view_id", sa.String(length=80), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("app_version", sa.String(length=120), nullable=True),
        sa.Column("route", sa.String(length=120), nullable=False),
        sa.Column("hostname", sa.String(length=253), nullable=False),
        sa.Column("environment", sa.String(length=32), nullable=False),
        sa.Column("deployment_channel", sa.String(length=32), nullable=False),
        sa.Column("is_production_domain", sa.Boolean(), nullable=False),
        sa.Column("viewport_bucket", sa.String(length=32), nullable=False),
        sa.Column("device_class", sa.String(length=32), nullable=False),
        sa.Column("referrer_type", sa.String(length=32), nullable=False),
        sa.Column("properties", sa.JSON(), nullable=False),
        sa.Column("experiments", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", name="uq_site_analytics_events_event_id"),
    )
    op.create_index(
        "ix_site_analytics_events_name_occurred_at",
        "site_analytics_events",
        ["event_name", "occurred_at"],
    )
    op.create_index(
        "ix_site_analytics_events_hostname_route_occurred_at",
        "site_analytics_events",
        ["hostname", "route", "occurred_at"],
    )
    op.create_index(
        "ix_site_analytics_events_session",
        "site_analytics_events",
        ["analytics_session_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_site_analytics_events_session", table_name="site_analytics_events")
    op.drop_index("ix_site_analytics_events_hostname_route_occurred_at", table_name="site_analytics_events")
    op.drop_index("ix_site_analytics_events_name_occurred_at", table_name="site_analytics_events")
    op.drop_table("site_analytics_events")
