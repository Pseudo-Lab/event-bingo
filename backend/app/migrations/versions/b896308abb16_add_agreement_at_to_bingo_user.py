"""add_agreement_at_to_bingo_user

Revision ID: b896308abb16
Revises: 1604e736a027
Create Date: 2025-05-15 23:49:28.816678+09:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b896308abb16'
down_revision: Union[str, None] = '1604e736a027'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('bingo_user', sa.Column('agreement_at', sa.DateTime(timezone=True), nullable=True))
    pass


def downgrade() -> None:
    op.drop_column('bingo_user', 'agreement_at')
    pass
