import api.admin.console_services as console_services
import pytest

from api.admin.console_services import (
    build_admin_invite_link,
    hash_admin_invite_token,
    normalize_event_keywords,
    resolve_selected_keywords,
    to_kst_datetime,
    validate_admin_password,
    validate_admin_member_deletion,
    validate_event_manager_request_transition,
    validate_event_schedule,
    validate_event_slug,
    validate_publish_transition,
)
from datetime import datetime
from models.admin import AdminRole
from models.event import EventPublishState
from models.event_manager_request import EventManagerRequestStatus


def test_validate_event_slug_accepts_expected_pattern():
    assert validate_event_slug("festival-networking-2026") == "festival-networking-2026"


def test_validate_event_slug_accepts_korean_characters():
    assert validate_event_slug("가짜-연구소-2026") == "가짜-연구소-2026"


@pytest.mark.parametrize("slug", ["Admin", "ab", "invalid slug", "api"])
def test_validate_event_slug_rejects_invalid_values(slug: str):
    with pytest.raises(ValueError):
        validate_event_slug(slug)


def test_validate_publish_transition_blocks_published_to_draft():
    with pytest.raises(ValueError):
        validate_publish_transition(EventPublishState.PUBLISHED, EventPublishState.DRAFT)


def test_validate_publish_transition_allows_draft_to_published():
    validate_publish_transition(EventPublishState.DRAFT, EventPublishState.PUBLISHED)


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


def test_validate_admin_password_blocks_short_or_weak_password():
    with pytest.raises(ValueError, match="비밀번호"):
        validate_admin_password("weakpass")


def test_validate_admin_password_allows_expected_format():
    validate_admin_password("Admin1234!")


def test_hash_admin_invite_token_is_deterministic():
    assert hash_admin_invite_token("sample-token") == hash_admin_invite_token("sample-token")


def test_to_kst_datetime_accepts_naive_datetime():
    normalized = to_kst_datetime(datetime(2026, 3, 20, 10, 0, 0))

    assert normalized.tzinfo is not None
    assert normalized.utcoffset() is not None


def test_build_admin_invite_link_uses_query_token(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(console_services, "ADMIN_INVITE_URL_BASE", "https://example.com/admin/invite")
    invite_link = build_admin_invite_link("abc123")

    assert invite_link == "https://example.com/admin/invite?token=abc123"


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
