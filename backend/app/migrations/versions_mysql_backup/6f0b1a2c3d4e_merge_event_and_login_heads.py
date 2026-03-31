"""merge event and login heads

Revision ID: 6f0b1a2c3d4e
Revises: 4bb63c5a9f1a, c9f4f9c8b7a1
Create Date: 2026-03-20 01:12:00.000000+09:00

"""
from typing import Sequence, Union

from alembic import op


revision: str = "6f0b1a2c3d4e"
down_revision: Union[str, Sequence[str], None] = ("4bb63c5a9f1a", "c9f4f9c8b7a1")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
