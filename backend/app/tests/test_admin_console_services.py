import api.admin.console_services as console_services
import pytest

from api.admin.console_services import (
    build_archive_participant_alias,
    build_admin_event_bingo_progress_query,
    build_admin_console_link,
    is_event_personal_data_expired,
    normalize_event_keywords,
    resolve_participant_email,
    resolve_participant_name,
    resolve_selected_keywords,
    resolve_personal_data_cutoff,
    validate_admin_member_deletion,
    validate_event_manager_request_transition,
    validate_event_schedule,
)
from datetime import datetime, timedelta, timezone
from models.admin import AdminRole
from models.event_manager_request import EventManagerRequestStatus


def test_validate_event_schedule_blocks_invalid_range():
    start_at = datetime.fromisoformat("2026-05-17T15:00:00+09:00")
    end_at = datetime.fromisoformat("2026-05-17T14:00:00+09:00")

    with pytest.raises(ValueError, match="종료 시각"):
        validate_event_schedule(start_at, end_at)


def test_build_admin_event_bingo_progress_query_matches_event_and_user():
    statement = str(build_admin_event_bingo_progress_query([1, 2]))

    assert "bingo_boards.user_id = event_attendees.user_id" in statement
    assert "bingo_boards.event_id = event_attendees.event_id" in statement


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


def test_build_access_granted_email_sets_event_bingo_sender_and_reply_to(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(console_services, "ADMIN_SMTP_FROM_NAME", "DevFactory 운영팀")
    monkeypatch.setattr(console_services, "ADMIN_SMTP_FROM_EMAIL", "support@example.com")
    monkeypatch.setattr(console_services, "ADMIN_SMTP_REPLY_TO", "devfactory.ops@gmail.com")

    message = console_services._build_access_granted_email("운영자", "https://example.com/admin")

    assert message["Subject"] == "[Event Bingo] 관리자 권한이 승인되었습니다"
    assert message["Reply-To"] == "devfactory.ops@gmail.com"
    assert "DevFactory 운영팀입니다." in message.get_content()
    assert "devfactory.ops@gmail.com" in message.get_content()


def test_build_manager_request_received_email_sets_receipt_copy(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(console_services, "ADMIN_SMTP_FROM_NAME", "DevFactory 운영팀")
    monkeypatch.setattr(console_services, "ADMIN_SMTP_FROM_EMAIL", "support@example.com")
    monkeypatch.setattr(console_services, "ADMIN_SMTP_REPLY_TO", "devfactory.ops@gmail.com")

    message = console_services._build_manager_request_received_email(
        "홍길동",
        "네트워킹 데이",
        datetime(2026, 6, 1, tzinfo=timezone.utc),
        100,
    )

    assert message["Subject"] == "[Event Bingo] 사용 신청이 접수되었습니다"
    assert message["Reply-To"] == "devfactory.ops@gmail.com"
    assert "Event Bingo 사용 신청이 접수되었습니다." in message.get_content()
    assert "신청 행사명: 네트워킹 데이" in message.get_content()
    assert "예상 행사 일자: 2026-06-01" in message.get_content()
    assert "예상 참가자 수: 51-100명" in message.get_content()
    assert "운영팀 검토 후 승인되면" in message.get_content()
    assert "동일한 Google 계정이 필요합니다." in message.get_content()


def test_build_manager_request_received_email_uses_placeholder_for_missing_optional_values():
    message = console_services._build_manager_request_received_email(
        "홍길동",
        "네트워킹 데이",
        None,
        None,
    )

    assert "예상 행사 일자: 미입력" in message.get_content()
    assert "예상 참가자 수: 미입력" in message.get_content()


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


def test_resolve_participant_name_returns_archive_alias_when_anonymized():
    user = type("UserStub", (), {"user_id": 7, "user_name": "원래 이름"})()

    assert resolve_participant_name(user, None, anonymized=True, attendee_id=42) == "익명 참가자 42"


def test_resolve_participant_email_hides_value_when_anonymized():
    user = type("UserStub", (), {"user_email": "tester@example.com"})()

    assert resolve_participant_email(user, anonymized=True) == "-"


def test_build_archive_participant_alias_uses_attendee_id():
    assert build_archive_participant_alias(15) == "익명 참가자 15"


def test_is_event_personal_data_expired_after_retention_window():
    now = datetime.fromisoformat("2027-05-17T10:00:00+09:00")
    event = type("EventStub", (), {"end_time": now - timedelta(days=366)})()

    assert is_event_personal_data_expired(event, now=now) is True


def test_resolve_personal_data_cutoff_uses_one_year_default_window():
    now = datetime.fromisoformat("2027-05-17T10:00:00+09:00")

    assert resolve_personal_data_cutoff(now=now) == now - timedelta(days=365)
