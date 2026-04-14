import api.admin.console_services as console_services
import pytest

from api.admin.console_services import (
    build_admin_console_link,
    normalize_event_keywords,
    resolve_participant_email,
    resolve_participant_name,
    resolve_selected_keywords,
    validate_admin_member_deletion,
    validate_event_manager_request_transition,
    validate_event_schedule,
)
from datetime import datetime
from models.admin import AdminRole
from models.event_manager_request import EventManagerRequestStatus


def test_validate_event_schedule_blocks_invalid_range():
    start_at = datetime.fromisoformat("2026-05-17T15:00:00+09:00")
    end_at = datetime.fromisoformat("2026-05-17T14:00:00+09:00")

    with pytest.raises(ValueError, match="종료 시각"):
        validate_event_schedule(start_at, end_at)


def test_normalize_event_keywords_autofills_remaining_slots():
    keywords = normalize_event_keywords(["AI", "ML"], 3)

    assert keywords[:2] == ["AI", "ML"]
    assert keywords[2] == "키워드 3"
    assert keywords[-1] == "키워드 9"
    assert len(keywords) == 9


def test_normalize_event_keywords_deduplicates_and_trims_before_autofill():
    keywords = normalize_event_keywords([" AI ", "", "AI", "ML "], 3)

    assert keywords[:2] == ["AI", "ML"]
    assert keywords[2] == "키워드 3"
    assert len(keywords) == 9

def test_build_admin_console_link_uses_explicit_console_base(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(console_services, "ADMIN_CONSOLE_URL_BASE", "https://example.com/admin")

    assert build_admin_console_link() == "https://example.com/admin"


def test_validate_event_manager_request_transition_allows_pending_review():
    validate_event_manager_request_transition(
        EventManagerRequestStatus.PENDING,
        EventManagerRequestStatus.APPROVED,
    )


def test_validate_event_manager_request_transition_blocks_re_review():
    with pytest.raises(ValueError, match="이미 검토가 완료"):
        validate_event_manager_request_transition(
            EventManagerRequestStatus.APPROVED,
            EventManagerRequestStatus.REJECTED,
        )


def test_validate_admin_member_deletion_blocks_self_delete():
    actor = type("AdminStub", (), {"id": 1, "email": "admin@laivdata.com", "role": AdminRole.ADMIN})()

    with pytest.raises(ValueError, match="본인 계정"):
        validate_admin_member_deletion(
            actor,
            actor,
            total_admin_count=2,
            owned_event_count=0,
        )


def test_validate_admin_member_deletion_blocks_owner_with_events():
    actor = type("AdminStub", (), {"id": 1, "email": "owner@laivdata.com", "role": AdminRole.ADMIN})()
    target = type(
        "AdminStub",
        (),
        {"id": 2, "email": "manager@laivdata.com", "role": AdminRole.EVENT_MANAGER},
    )()

    with pytest.raises(ValueError, match="생성한 이벤트"):
        validate_admin_member_deletion(
            actor,
            target,
            total_admin_count=2,
            owned_event_count=1,
        )


def test_validate_admin_member_deletion_blocks_last_admin():
    actor = type("AdminStub", (), {"id": 1, "email": "owner@laivdata.com", "role": AdminRole.ADMIN})()
    target = type(
        "AdminStub",
        (),
        {"id": 2, "email": "second@laivdata.com", "role": AdminRole.ADMIN},
    )()

    with pytest.raises(ValueError, match="최소 한 명의 Admin"):
        validate_admin_member_deletion(
            actor,
            target,
            total_admin_count=1,
            owned_event_count=0,
        )


def test_validate_admin_member_deletion_allows_regular_event_manager_delete():
    actor = type("AdminStub", (), {"id": 1, "email": "owner@laivdata.com", "role": AdminRole.ADMIN})()
    target = type(
        "AdminStub",
        (),
        {"id": 2, "email": "manager@laivdata.com", "role": AdminRole.EVENT_MANAGER},
    )()

    validate_admin_member_deletion(
        actor,
        target,
        total_admin_count=2,
        owned_event_count=0,
    )


def test_resolve_selected_keywords_returns_all_attendee_keywords():
    attendee = type("AttendeeStub", (), {"selected_keywords": ["키워드 1", "키워드 2", "키워드 3"]})()

    assert resolve_selected_keywords(attendee, None) == ["키워드 1", "키워드 2", "키워드 3"]


def test_resolve_selected_keywords_reads_all_selected_board_cells():
    attendee = type("AttendeeStub", (), {"selected_keywords": []})()
    board = type(
        "BoardStub",
        (),
        {
            "board_data": {
                "0": {"value": "키워드 1", "selected": 1},
                "1": {"value": "키워드 2", "selected": True},
                "2": {"value": "키워드 3", "selected": 1},
                "3": {"value": "키워드 4", "selected": 0},
            }
        },
    )()

    assert resolve_selected_keywords(attendee, board) == ["키워드 1", "키워드 2", "키워드 3"]


def test_resolve_participant_name_prefers_event_board_display_name():
    user = type("UserStub", (), {"user_id": 1, "user_name": "구글 닉네임"})()
    board = type("BoardStub", (), {"display_name": "행사 빙고 이름"})()

    assert resolve_participant_name(user, board) == "행사 빙고 이름"


def test_resolve_participant_email_returns_dash_for_non_email_identifier():
    user = type("UserStub", (), {"user_email": "SJ6ZRJ"})()

    assert resolve_participant_email(user) == "-"
