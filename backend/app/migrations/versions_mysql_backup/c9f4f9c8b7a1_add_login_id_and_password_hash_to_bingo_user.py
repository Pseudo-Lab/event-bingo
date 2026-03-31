"""add login_id and password_hash to bingo_user

Revision ID: c9f4f9c8b7a1
Revises: a4f8e02f426a
Create Date: 2026-03-19 18:20:00.000000+09:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import bcrypt


# revision identifiers, used by Alembic.
revision: str = 'c9f4f9c8b7a1'
down_revision: Union[str, None] = 'a4f8e02f426a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _normalize_login_id(source: str | None, user_id: int) -> str:
    normalized = "".join(char for char in (source or "").strip().upper() if char.isalnum())

    if not normalized:
        normalized = f"USER{user_id}"

    return normalized[:32]


def _dedupe_login_id(login_id: str, user_id: int, existing_ids: set[str]) -> str:
    if login_id not in existing_ids:
        return login_id

    suffix = str(user_id)
    max_prefix_length = max(1, 32 - len(suffix))
    candidate = f"{login_id[:max_prefix_length]}{suffix}"

    if candidate not in existing_ids:
        return candidate

    counter = 1
    while True:
        suffix = f"{user_id}{counter}"
        max_prefix_length = max(1, 32 - len(suffix))
        candidate = f"{login_id[:max_prefix_length]}{suffix}"
        if candidate not in existing_ids:
            return candidate
        counter += 1


def upgrade() -> None:
    op.add_column('bingo_user', sa.Column('login_id', sa.String(length=32), nullable=True))
    op.add_column('bingo_user', sa.Column('password_hash', sa.String(length=255), nullable=True))

    connection = op.get_bind()
    user_table = sa.table(
        'bingo_user',
        sa.column('user_id', sa.Integer()),
        sa.column('user_email', sa.String(length=100)),
        sa.column('login_id', sa.String(length=32)),
        sa.column('password_hash', sa.String(length=255)),
    )

    rows = connection.execute(
        sa.select(user_table.c.user_id, user_table.c.user_email)
    ).mappings().all()

    existing_ids: set[str] = set()
    for row in rows:
        user_id = row['user_id']
        legacy_identifier = row['user_email']
        login_id = _dedupe_login_id(
            _normalize_login_id(legacy_identifier, user_id),
            user_id,
            existing_ids,
        )
        existing_ids.add(login_id)

        password_source = (legacy_identifier or login_id).strip() or login_id
        password_hash = bcrypt.hashpw(
            password_source.encode('utf-8'),
            bcrypt.gensalt(),
        ).decode('utf-8')

        connection.execute(
            sa.update(user_table)
            .where(user_table.c.user_id == user_id)
            .values(login_id=login_id, password_hash=password_hash)
        )

    op.alter_column('bingo_user', 'login_id', existing_type=sa.String(length=32), nullable=False)
    op.alter_column('bingo_user', 'password_hash', existing_type=sa.String(length=255), nullable=False)
    op.create_unique_constraint('uq_bingo_user_login_id', 'bingo_user', ['login_id'])


def downgrade() -> None:
    op.drop_constraint('uq_bingo_user_login_id', 'bingo_user', type_='unique')
    op.drop_column('bingo_user', 'password_hash')
    op.drop_column('bingo_user', 'login_id')
