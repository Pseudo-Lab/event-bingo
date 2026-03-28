"""
Task 3 스키마 테스트: Room/Team/EventAttendee/BingoBoards/BingoInteraction
DB 없이 ORM 인스턴스 및 클래스 정의를 직접 확인하는 단위 테스트.
"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import inspect

from sqlalchemy import PrimaryKeyConstraint

from models.event import Event, GameMode
from models.room import Room
from models.team import Team, TeamColor
from models.event_attendee import EventAttendee
from models.bingo.bingo_boards import BingoBoards
from models.bingo.bingo_interaction import BingoInteraction


# ──────────────────────────────────────────────
# 1. GameMode Enum
# ──────────────────────────────────────────────

def test_game_mode_individual_value():
    assert GameMode.INDIVIDUAL.value == "individual"


def test_game_mode_team_value():
    assert GameMode.TEAM.value == "team"


def test_event_default_game_mode_is_individual():
    """Event 컬럼 정의의 default가 GameMode.INDIVIDUAL임을 확인."""
    col = Event.__table__.c["game_mode"]
    assert col.default.arg == GameMode.INDIVIDUAL


# ──────────────────────────────────────────────
# 2. Event team_size 기본값
# ──────────────────────────────────────────────

def test_event_team_size_default_is_one():
    """team_size 컬럼의 기본값이 1임을 확인."""
    col = Event.__table__.c["team_size"]
    assert col.default.arg == 1


# ──────────────────────────────────────────────
# 3. Room 모델 속성
# ──────────────────────────────────────────────

def test_room_is_open_column_default_true():
    """Room.is_open 컬럼의 기본값이 True임을 확인."""
    col = Room.__table__.c["is_open"]
    assert col.default.arg is True


def test_room_has_mark_full_classmethod():
    """Room에 mark_full 클래스메서드가 정의되어 있음을 확인."""
    assert hasattr(Room, "mark_full")
    assert inspect.ismethod(Room.mark_full) or callable(getattr(Room, "mark_full", None))


def test_room_no_reopen_method():
    """Room에 reopen 메서드가 없음을 확인 (퇴장 기능 없음)."""
    assert not hasattr(Room, "reopen")


def test_room_instance_fields():
    """Room 인스턴스 생성 및 기본 필드 할당 확인."""
    room = Room(event_id=1, room_number=1)
    assert room.event_id == 1
    assert room.room_number == 1


def test_room_event_id_column_exists():
    """Room 테이블에 event_id 컬럼이 존재함을 확인."""
    assert "event_id" in Room.__table__.c


def test_room_room_number_column_exists():
    """Room 테이블에 room_number 컬럼이 존재함을 확인."""
    assert "room_number" in Room.__table__.c


# ──────────────────────────────────────────────
# 4. Team 모델 속성
# ──────────────────────────────────────────────

def test_team_color_blue_value():
    assert TeamColor.BLUE.value == "blue"


def test_team_color_red_value():
    assert TeamColor.RED.value == "red"


def test_team_has_room_id_column():
    """Team 테이블에 room_id 컬럼이 존재함을 확인."""
    assert "room_id" in Team.__table__.c


def test_team_room_id_is_nullable():
    """Team.room_id가 nullable임을 확인 (Optional 필드)."""
    col = Team.__table__.c["room_id"]
    assert col.nullable is True


def test_team_instance_room_id_field():
    """Team 인스턴스에 room_id 속성이 존재함을 확인."""
    team = Team(name="파랑 팀", event_id=1, color=TeamColor.BLUE, room_id=None)
    assert hasattr(team, "room_id")
    assert team.room_id is None


def test_team_instance_with_room_id():
    """Team 인스턴스에 room_id 값을 할당할 수 있음을 확인."""
    team = Team(name="빨강 팀", event_id=1, color=TeamColor.RED, room_id=42)
    assert team.room_id == 42


# ──────────────────────────────────────────────
# 5. EventAttendee 모델
# ──────────────────────────────────────────────

def test_event_attendee_room_id_column_nullable():
    """EventAttendee.room_id 컬럼이 nullable임을 확인."""
    col = EventAttendee.__table__.c["room_id"]
    assert col.nullable is True


def test_event_attendee_team_id_column_nullable():
    """EventAttendee.team_id 컬럼이 nullable임을 확인."""
    col = EventAttendee.__table__.c["team_id"]
    assert col.nullable is True


def test_event_attendee_room_id_column_exists():
    """EventAttendee 테이블에 room_id 컬럼이 존재함을 확인."""
    assert "room_id" in EventAttendee.__table__.c


def test_event_attendee_team_id_column_exists():
    """EventAttendee 테이블에 team_id 컬럼이 존재함을 확인."""
    assert "team_id" in EventAttendee.__table__.c


def test_event_attendee_instance_optional_fields():
    """EventAttendee 인스턴스에서 room_id/team_id를 None으로 설정 가능."""
    attendee = EventAttendee(event_id=1, user_id=1, room_id=None, team_id=None)
    assert attendee.room_id is None
    assert attendee.team_id is None


# ──────────────────────────────────────────────
# 6. BingoBoards 복합 PK
# ──────────────────────────────────────────────

def test_bingo_boards_primary_key_constraint_exists():
    """BingoBoards __table_args__에 PrimaryKeyConstraint가 존재함을 확인."""
    table_args = BingoBoards.__table_args__
    pk_constraints = [
        arg for arg in table_args
        if isinstance(arg, PrimaryKeyConstraint)
    ]
    assert len(pk_constraints) == 1, "PrimaryKeyConstraint가 정확히 1개여야 합니다."


def test_bingo_boards_pk_columns():
    """BingoBoards PrimaryKeyConstraint가 user_id와 event_id를 포함함을 확인."""
    pk = BingoBoards.__table__.primary_key
    pk_col_names = {col.name for col in pk.columns}
    assert "user_id" in pk_col_names
    assert "event_id" in pk_col_names


def test_bingo_boards_event_id_column_exists():
    """BingoBoards 테이블에 event_id 컬럼이 존재함을 확인."""
    assert "event_id" in BingoBoards.__table__.c


def test_bingo_boards_user_id_column_exists():
    """BingoBoards 테이블에 user_id 컬럼이 존재함을 확인."""
    assert "user_id" in BingoBoards.__table__.c


# ──────────────────────────────────────────────
# 7. BingoInteraction
# ──────────────────────────────────────────────

def test_bingo_interaction_event_id_column_exists():
    """BingoInteraction 테이블에 event_id 컬럼이 존재함을 확인."""
    assert "event_id" in BingoInteraction.__table__.c


def test_bingo_interaction_event_id_not_nullable():
    """BingoInteraction.event_id가 필수(not null)임을 확인."""
    col = BingoInteraction.__table__.c["event_id"]
    assert col.nullable is False


def test_bingo_interaction_has_send_receive_user_id():
    """BingoInteraction에 send_user_id, receive_user_id 컬럼이 존재함을 확인."""
    assert "send_user_id" in BingoInteraction.__table__.c
    assert "receive_user_id" in BingoInteraction.__table__.c
