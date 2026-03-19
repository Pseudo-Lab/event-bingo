"""add event manager requests table

Revision ID: 0f7b4d8e2c11
Revises: 6f0b1a2c3d4e
Create Date: 2026-03-20 10:10:00.000000+09:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0f7b4d8e2c11"
down_revision: Union[str, None] = "6f0b1a2c3d4e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    request_status_enum = sa.Enum(
        "PENDING",
        "APPROVED",
        "REJECTED",
        name="eventmanagerrequeststatus",
    )
    request_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "event_manager_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=100), nullable=False),
        sa.Column("organization", sa.String(length=120), nullable=True),
        sa.Column("event_name", sa.String(length=120), nullable=False),
        sa.Column("event_purpose", sa.Text(), nullable=False),
        sa.Column("expected_event_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expected_attendee_count", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", request_status_enum, nullable=False, server_default="PENDING"),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("reviewed_by_admin_id", sa.Integer(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["reviewed_by_admin_id"], ["admins.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("event_manager_requests")

    request_status_enum = sa.Enum(
        "PENDING",
        "APPROVED",
        "REJECTED",
        name="eventmanagerrequeststatus",
    )
    request_status_enum.drop(op.get_bind(), checkfirst=True)
