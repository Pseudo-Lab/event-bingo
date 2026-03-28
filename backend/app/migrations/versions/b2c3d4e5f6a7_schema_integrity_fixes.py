"""스키마 무결성 보강: nullable 수정, unique constraint 추가

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. bingo_boards.event_id: nullable=True → nullable=False
    #    기존 NULL 데이터가 있으면 삭제 (레거시 없음 전제)
    op.execute('DELETE FROM bingo_boards WHERE event_id IS NULL')
    op.alter_column('bingo_boards', 'event_id',
                     existing_type=sa.Integer(),
                     nullable=False)

    # 2. bingo_interaction.event_id: nullable=True → nullable=False
    op.execute('DELETE FROM bingo_interaction WHERE event_id IS NULL')
    op.alter_column('bingo_interaction', 'event_id',
                     existing_type=sa.Integer(),
                     nullable=False)

    # 3. event_attendees: UNIQUE(event_id, user_id) 추가
    existing_constraints = {c['name'] for c in inspector.get_unique_constraints('event_attendees')}
    if 'uq_attendees_event_user' not in existing_constraints:
        op.create_unique_constraint('uq_attendees_event_user', 'event_attendees', ['event_id', 'user_id'])

    # 4. teams.created_at: DateTime(timezone=True) 타입 명시
    #    MySQL에서 DATETIME → DATETIME 변경은 실질적 변화 없지만, timezone 메타데이터 정합성 확보
    op.alter_column('teams', 'created_at',
                     existing_type=sa.DateTime(),
                     type_=sa.DateTime(timezone=True),
                     existing_nullable=False)


def downgrade():
    op.alter_column('teams', 'created_at',
                     existing_type=sa.DateTime(timezone=True),
                     type_=sa.DateTime(),
                     existing_nullable=False)

    op.drop_constraint('uq_attendees_event_user', 'event_attendees', type_='unique')

    op.alter_column('bingo_interaction', 'event_id',
                     existing_type=sa.Integer(),
                     nullable=True)

    op.alter_column('bingo_boards', 'event_id',
                     existing_type=sa.Integer(),
                     nullable=True)
