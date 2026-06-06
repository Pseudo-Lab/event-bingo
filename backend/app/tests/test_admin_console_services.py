import asyncio
from collections import Counter

import api.admin.console_services as console_services
import pytest

from api.admin.console_services import (
    build_archive_participant_alias,
    build_admin_event_bingo_progress_query,
    build_admin_applications_link,
    build_admin_console_link,
    build_event_keyword_rows,
    build_visible_admin_events_query,
    can_manage_owner_scope,
    can_view_event,
    filter_visible_admin_events,
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


def test_filter_visible_admin_events_allows_admin_to_see_all_events():
    actor = type("AdminStub", (), {"id": 1, "role": AdminRole.ADMIN})()
    events = [
        type("EventStub", (), {"id": 10, "admin_id": 1})(),
        type("EventStub", (), {"id": 20, "admin_id": 2})(),
    ]

    assert filter_visible_admin_events(actor, events) == events


def test_filter_visible_admin_events_limits_event_manager_to_owned_events():
    actor = type("AdminStub", (), {"id": 2, "role": AdminRole.EVENT_MANAGER})()
    owned_event = type("EventStub", (), {"id": 20, "admin_id": 2})()
    other_event = type("EventStub", (), {"id": 30, "admin_id": 3})()

    assert filter_visible_admin_events(actor, [owned_event, other_event]) == [owned_event]


def test_can_manage_owner_scope_allows_admin_and_owner_only():
    admin = type("AdminStub", (), {"id": 1, "role": AdminRole.ADMIN})()
    owner = type("AdminStub", (), {"id": 2, "role": AdminRole.EVENT_MANAGER})()
    co_host = type("AdminStub", (), {"id": 3, "role": AdminRole.EVENT_MANAGER})()
    event = type("EventStub", (), {"id": 30, "admin_id": 2})()

    assert can_manage_owner_scope(admin, event) is True
    assert can_manage_owner_scope(owner, event) is True
    assert can_manage_owner_scope(co_host, event) is False


def test_build_visible_admin_events_query_allows_admin_to_query_all_events():
    actor = type("AdminStub", (), {"id": 1, "role": AdminRole.ADMIN})()

    statement = str(build_visible_admin_events_query(actor))

    assert "WHERE" not in statement
    assert "ORDER BY events.start_time DESC" in statement


def test_build_visible_admin_events_query_limits_event_manager_to_owned_or_co_host_events():
    actor = type("AdminStub", (), {"id": 2, "role": AdminRole.EVENT_MANAGER})()

    statement = str(build_visible_admin_events_query(actor))

    assert "WHERE events.admin_id = " in statement
    assert "event_co_hosts" in statement
    assert "ORDER BY events.start_time DESC" in statement


def test_can_view_event_blocks_event_manager_from_other_owner_event():
    actor = type("AdminStub", (), {"id": 2, "role": AdminRole.EVENT_MANAGER})()
    event = type("EventStub", (), {"id": 30, "admin_id": 3})()

    class DbStub:
        async def execute(self, _statement):
            class Result:
                @staticmethod
                def scalar_one_or_none():
                    return None

            return Result()

    assert asyncio.run(can_view_event(DbStub(), actor, event)) is False


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


def test_build_event_keyword_rows_includes_all_event_keywords_with_zero_counts():
    rows = build_event_keyword_rows(
        ["사업개발", "제휴", "시장조사", "전환율"],
        Counter({"제휴": 2, "시장조사": 1}),
    )

    assert [(row.keyword, row.count) for row in rows] == [
        ("제휴", 2),
        ("시장조사", 1),
        ("사업개발", 0),
        ("전환율", 0),
    ]


def test_build_event_keyword_rows_keeps_selected_keywords_missing_from_event_config():
    rows = build_event_keyword_rows(["사업개발"], Counter({"현장추가": 3}))

    assert [(row.keyword, row.count) for row in rows] == [
        ("현장추가", 3),
        ("사업개발", 0),
    ]


def test_build_admin_console_link_uses_explicit_console_base(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(console_services, "ADMIN_CONSOLE_URL_BASE", "https://example.com/admin")

    assert build_admin_console_link() == "https://example.com/admin"


def test_build_admin_applications_link_extends_console_base(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(console_services, "ADMIN_CONSOLE_URL_BASE", "https://example.com/admin/")

    assert build_admin_applications_link() == "https://example.com/admin/applications"


def test_build_access_granted_email_sets_event_bingo_sender_and_reply_to(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(console_services, "ADMIN_SMTP_FROM_NAME", "DevFactory 운영팀")
    monkeypatch.setattr(console_services, "ADMIN_SMTP_FROM_EMAIL", "support@example.com")
    monkeypatch.setattr(console_services, "ADMIN_SMTP_REPLY_TO", "devfactory.ops@gmail.com")

    message = console_services._build_access_granted_email("운영자", "https://example.com/admin")

    assert message["Subject"] == "[Event Bingo] 이벤트 관리자 권한이 승인되었습니다"
    assert message["Reply-To"] == "devfactory.ops@gmail.com"
    assert "DevFactory 운영팀입니다." in message.get_content()
    assert "Event Bingo 이벤트 관리자 권한 신청이 승인되었습니다." in message.get_content()
    assert "이벤트 관리 페이지에 접속할 수 있습니다." in message.get_content()
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


def test_build_manager_request_admin_webhook_payload_minimizes_personal_data():
    payload = console_services._build_manager_request_admin_webhook_payload(
        request_id=42,
        event_name="네트워킹 데이",
        expected_event_date=datetime(2026, 6, 1, tzinfo=timezone.utc),
        expected_attendee_count=100,
        applications_url="https://example.com/admin/applications",
    )

    content = payload["content"]

    assert "[Event Bingo] 새 이벤트 관리자 신청이 접수되었습니다." in content
    assert "- 신청 ID: 42" in content
    assert "- 행사명: 네트워킹 데이" in content
    assert "- 예상 행사 일자: 2026-06-01" in content
    assert "- 예상 참가자 수: 51-100명" in content
    assert "- 확인: https://example.com/admin/applications" in content
    assert "홍길동" not in content
    assert "organizer@example.com" not in content


def test_post_admin_manager_request_webhook_skips_when_url_missing(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(console_services, "ADMIN_MANAGER_REQUEST_WEBHOOK_URL", "")

    def fail_post(*_args, **_kwargs):
        raise AssertionError("webhook must not be posted without a URL")

    monkeypatch.setattr(console_services.httpx, "post", fail_post)

    assert console_services._post_admin_manager_request_webhook({"content": "test"}) is False


def test_post_admin_manager_request_webhook_blocks_unsupported_provider(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(console_services, "ADMIN_MANAGER_REQUEST_WEBHOOK_URL", "https://example.com/webhook")
    monkeypatch.setattr(console_services, "ADMIN_MANAGER_REQUEST_WEBHOOK_PROVIDER", "slack")

    def fail_post(*_args, **_kwargs):
        raise AssertionError("unsupported provider must not be posted")

    monkeypatch.setattr(console_services.httpx, "post", fail_post)

    assert console_services._post_admin_manager_request_webhook({"content": "test"}) is False


def test_post_admin_manager_request_webhook_sends_discord_payload(monkeypatch: pytest.MonkeyPatch):
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

    def fake_post(url, *, json, headers, timeout):
        captured.update(
            {
                "url": url,
                "json": json,
                "headers": headers,
                "timeout": timeout,
            }
        )
        return FakeResponse()

    monkeypatch.setattr(console_services, "ADMIN_MANAGER_REQUEST_WEBHOOK_URL", "https://example.com/webhook")
    monkeypatch.setattr(console_services, "ADMIN_MANAGER_REQUEST_WEBHOOK_PROVIDER", "discord")
    monkeypatch.setattr(console_services, "ADMIN_MANAGER_REQUEST_WEBHOOK_USER_AGENT", "EventBingoWebhook/1.0")
    monkeypatch.setattr(console_services.httpx, "post", fake_post)

    assert console_services._post_admin_manager_request_webhook({"content": "test"}) is True
    assert captured == {
        "url": "https://example.com/webhook",
        "json": {"content": "test"},
        "headers": {"User-Agent": "EventBingoWebhook/1.0"},
        "timeout": 10.0,
    }


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
