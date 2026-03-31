"""task3: room/team 기반 스키마 확장

Revision ID: a1b2c3d4e5f6
Revises: d1a2b3c4d5e6
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'd1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # rooms 테이블 생성
    if 'rooms' not in existing_tables:
        op.create_table(
            'rooms',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('event_id', sa.Integer(), sa.ForeignKey('events.id'), nullable=False),
            sa.Column('room_number', sa.Integer(), nullable=False),
            sa.Column('is_open', sa.Boolean(), nullable=False, server_default='1'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint('event_id', 'room_number', name='uq_rooms_event_room_number'),
        )

    # events: game_mode, team_size 추가
    events_columns = {col['name'] for col in inspector.get_columns('events')}
    if 'game_mode' not in events_columns:
        op.add_column('events', sa.Column('game_mode', sa.Enum('INDIVIDUAL', 'TEAM', name='gamemode'), nullable=False, server_default='INDIVIDUAL'))
    if 'team_size' not in events_columns:
        op.add_column('events', sa.Column('team_size', sa.Integer(), nullable=False, server_default='1'))

    # teams: room_id 추가
    teams_columns = {col['name'] for col in inspector.get_columns('teams')}
    if 'room_id' not in teams_columns:
        op.add_column('teams', sa.Column('room_id', sa.Integer(), sa.ForeignKey('rooms.id'), nullable=True))

    # event_attendees: room_id 추가
    attendees_columns = {col['name'] for col in inspector.get_columns('event_attendees')}
    if 'room_id' not in attendees_columns:
        op.add_column('event_attendees', sa.Column('room_id', sa.Integer(), sa.ForeignKey('rooms.id'), nullable=True))

    # bingo_boards: event_id 추가 + PK 변경 (user_id → user_id + event_id)
    boards_columns = {col['name'] for col in inspector.get_columns('bingo_boards')}
    if 'event_id' not in boards_columns:
        op.add_column('bingo_boards', sa.Column('event_id', sa.Integer(), sa.ForeignKey('events.id'), nullable=True))
        # MySQL: AUTO_INCREMENT 제거 후 복합 PK 설정
        op.execute('ALTER TABLE bingo_boards MODIFY user_id INT NOT NULL')
        op.drop_constraint('PRIMARY', 'bingo_boards', type_='primary')
        op.create_primary_key('pk_bingo_boards', 'bingo_boards', ['user_id', 'event_id'])

    # bingo_interaction: event_id 추가
    interaction_columns = {col['name'] for col in inspector.get_columns('bingo_interaction')}
    if 'event_id' not in interaction_columns:
        op.add_column('bingo_interaction', sa.Column('event_id', sa.Integer(), sa.ForeignKey('events.id'), nullable=True))


def downgrade():
    op.drop_column('bingo_interaction', 'event_id')
    op.drop_constraint('pk_bingo_boards', 'bingo_boards', type_='primary')
    op.create_primary_key('PRIMARY', 'bingo_boards', ['user_id'])
    op.execute('ALTER TABLE bingo_boards MODIFY user_id INT NOT NULL AUTO_INCREMENT')
    op.drop_column('bingo_boards', 'event_id')
    op.drop_column('event_attendees', 'room_id')
    op.drop_column('teams', 'room_id')
    op.drop_column('events', 'team_size')
    op.drop_column('events', 'game_mode')
    op.drop_table('rooms')
