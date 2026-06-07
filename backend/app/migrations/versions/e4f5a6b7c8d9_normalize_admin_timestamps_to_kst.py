"""normalize admin timestamps to kst

Revision ID: e4f5a6b7c8d9
Revises: d2f4a8c9b1e3
Create Date: 2026-06-07 07:15:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, None] = "d2f4a8c9b1e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE admins
        SET
            created_at = created_at + INTERVAL '9 hours',
            updated_at = updated_at + INTERVAL '9 hours'
        WHERE created_at IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE admins
        SET
            created_at = created_at - INTERVAL '9 hours',
            updated_at = updated_at - INTERVAL '9 hours'
        WHERE created_at IS NOT NULL
        """
    )
