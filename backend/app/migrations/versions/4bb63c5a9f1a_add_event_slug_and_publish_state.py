"""add event slug and publish state

Revision ID: 4bb63c5a9f1a
Revises: a4f8e02f426a
Create Date: 2026-03-20 00:00:00.000000+09:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4bb63c5a9f1a"
down_revision: Union[str, None] = "a4f8e02f426a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    publish_state_enum = sa.Enum("DRAFT", "PUBLISHED", "ARCHIVED", name="eventpublishstate")
    publish_state_enum.create(connection, checkfirst=True)

    existing_columns = {
        column["name"] for column in sa.inspect(connection).get_columns("events")
    }

    if "slug" not in existing_columns:
        op.add_column("events", sa.Column("slug", sa.String(length=100), nullable=True))

    if "publish_state" not in existing_columns:
        op.add_column(
            "events",
            sa.Column("publish_state", publish_state_enum, nullable=False, server_default="DRAFT"),
        )

    if "first_published_at" not in existing_columns:
        op.add_column(
            "events",
            sa.Column("first_published_at", sa.DateTime(timezone=True), nullable=True),
        )

    event_table = sa.table(
        "events",
        sa.column("id", sa.Integer),
        sa.column("slug", sa.String),
    )
    existing_rows = connection.execute(
        sa.select(event_table.c.id).where(event_table.c.slug.is_(None))
    ).fetchall()
    for row in existing_rows:
        connection.execute(
            event_table.update()
            .where(event_table.c.id == row.id)
            .values(slug=f"event-{row.id}")
        )

    op.alter_column(
        "events",
        "slug",
        existing_type=sa.String(length=100),
        nullable=False,
    )
    existing_unique_constraints = {
        constraint["name"] for constraint in sa.inspect(connection).get_unique_constraints("events")
    }
    if "uq_events_slug" not in existing_unique_constraints:
        op.create_unique_constraint("uq_events_slug", "events", ["slug"])
    op.alter_column(
        "events",
        "publish_state",
        existing_type=publish_state_enum,
        server_default=None,
    )


def downgrade() -> None:
    op.drop_constraint("uq_events_slug", "events", type_="unique")
    op.drop_column("events", "first_published_at")
    op.drop_column("events", "publish_state")
    op.drop_column("events", "slug")

    publish_state_enum = sa.Enum("DRAFT", "PUBLISHED", "ARCHIVED", name="eventpublishstate")
    publish_state_enum.drop(op.get_bind(), checkfirst=True)
