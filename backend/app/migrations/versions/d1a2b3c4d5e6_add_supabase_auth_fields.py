"""add supabase auth fields to bingo_user

Revision ID: d1a2b3c4d5e6
Revises: c9f4f9c8b7a1
Create Date: 2026-03-20 10:00:00.000000+09:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1a2b3c4d5e6'
down_revision: Union[str, None] = 'c9f4f9c8b7a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # BingoUser: Supabase 인증 필드 추가
    op.add_column('bingo_user', sa.Column('auth_provider', sa.String(50), nullable=False, server_default='legacy'))
    op.add_column('bingo_user', sa.Column('provider_id', sa.String(255), nullable=True))

    # BingoUser: 레거시 필드 nullable로 변경
    op.alter_column('bingo_user', 'user_name', existing_type=sa.String(100), nullable=True)
    op.alter_column('bingo_user', 'login_id', existing_type=sa.String(32), nullable=True)
    op.alter_column('bingo_user', 'password_hash', existing_type=sa.String(255), nullable=True)

    # BingoUser: user_email unique 제약 추가
    op.create_unique_constraint('uq_bingo_user_email', 'bingo_user', ['user_email'])


def downgrade() -> None:
    # BingoUser: unique 제약 제거
    op.drop_constraint('uq_bingo_user_email', 'bingo_user', type_='unique')

    # BingoUser: 레거시 필드 NOT NULL 복원
    op.alter_column('bingo_user', 'password_hash', existing_type=sa.String(255), nullable=False)
    op.alter_column('bingo_user', 'login_id', existing_type=sa.String(32), nullable=False)
    op.alter_column('bingo_user', 'user_name', existing_type=sa.String(100), nullable=False)

    # BingoUser: Supabase 필드 제거
    op.drop_column('bingo_user', 'provider_id')
    op.drop_column('bingo_user', 'auth_provider')
