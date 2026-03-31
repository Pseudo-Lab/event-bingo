"""add admin invitation columns

Revision ID: 7c6c8c4fb5aa
Revises: 28f7d0a6c91b
Create Date: 2026-03-20 16:45:00.000000+09:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7c6c8c4fb5aa"
down_revision: Union[str, None] = "28f7d0a6c91b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    existing_columns = {
        column["name"] for column in sa.inspect(connection).get_columns("admins")
    }

    if "password_setup_required" not in existing_columns:
        op.add_column(
            "admins",
            sa.Column(
                "password_setup_required",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )

    if "invite_token_hash" not in existing_columns:
        op.add_column(
            "admins",
            sa.Column("invite_token_hash", sa.String(length=128), nullable=True),
        )

    if "invite_token_expires_at" not in existing_columns:
        op.add_column(
            "admins",
            sa.Column("invite_token_expires_at", sa.DateTime(timezone=True), nullable=True),
        )

    if "invitation_sent_at" not in existing_columns:
        op.add_column(
            "admins",
            sa.Column("invitation_sent_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("admins", "invitation_sent_at")
    op.drop_column("admins", "invite_token_expires_at")
    op.drop_column("admins", "invite_token_hash")
    op.drop_column("admins", "password_setup_required")
