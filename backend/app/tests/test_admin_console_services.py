import pytest

from api.admin.console_services import (
    validate_admin_member_deletion,
    validate_event_schedule,
    validate_event_slug,
    validate_publish_transition,
)
from datetime import datetime
from models.admin import AdminRole
from models.event import EventPublishState


def test_validate_event_slug_accepts_expected_pattern():
    assert validate_event_slug("festival-networking-2026") == "festival-networking-2026"


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


def test_validate_admin_member_deletion_blocks_self_delete():
    actor = type("AdminStub", (), {"id": 1, "email": "admin@laivdata.com", "role": AdminRole.ADMIN})()

    with pytest.raises(ValueError, match="본인 계정"):
        validate_admin_member_deletion(
            actor,
            actor,
            total_admin_count=2,
            owned_event_count=0,
        )


def test_validate_admin_member_deletion_blocks_bootstrap_admin():
    actor = type("AdminStub", (), {"id": 1, "email": "owner@laivdata.com", "role": AdminRole.ADMIN})()
    target = type(
        "AdminStub",
        (),
        {"id": 2, "email": "superadmin@laivdata.com", "role": AdminRole.ADMIN},
    )()

    with pytest.raises(ValueError, match="기본 최고 관리자"):
        validate_admin_member_deletion(
            actor,
            target,
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
