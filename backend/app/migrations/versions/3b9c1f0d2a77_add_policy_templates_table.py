"""add policy templates table

Revision ID: 3b9c1f0d2a77
Revises: 7c6c8c4fb5aa
Create Date: 2026-03-21 02:40:00.000000+09:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "3b9c1f0d2a77"
down_revision: Union[str, None] = "7c6c8c4fb5aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    existing_tables = set(inspector.get_table_names())

    if "policy_templates" in existing_tables:
        return

    op.create_table(
        "policy_templates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("template_key", sa.String(length=64), nullable=False),
        sa.Column("content_markdown", sa.Text(), nullable=False),
        sa.Column("updated_by_admin_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["updated_by_admin_id"], ["admins.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("template_key", name="uq_policy_templates_template_key"),
    )


def downgrade() -> None:
    op.drop_table("policy_templates")
