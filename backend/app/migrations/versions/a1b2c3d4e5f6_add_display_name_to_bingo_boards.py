"""add display_name to bingo_boards

Revision ID: a1b2c3d4e5f6
Revises: 3b9c1f0d2a77
Create Date: 2026-04-08 00:00:00.000000+09:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "3b9c1f0d2a77"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    existing_columns = {
        column["name"] for column in sa.inspect(connection).get_columns("bingo_boards")
    }

    if "display_name" not in existing_columns:
        op.add_column(
            "bingo_boards",
            sa.Column("display_name", sa.String(110), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("bingo_boards", "display_name")
