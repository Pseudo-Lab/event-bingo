from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from models.event import Event, EventStatus


def test_event_status_handles_naive_datetimes():
    now = datetime.now()
    event = Event(
        name="Naive Event",
        slug="naive-event",
        start_time=now - timedelta(hours=1),
        end_time=now + timedelta(hours=1),
        admin_id=1,
        admin_email="admin@laivdata.com",
        bingo_size=5,
        success_condition=4,
        keywords=[],
    )

    assert event.status == EventStatus.IN_PROGRESS


def test_event_status_handles_aware_datetimes():
    timezone = ZoneInfo("Asia/Seoul")
    now = datetime.now(timezone)
    event = Event(
        name="Aware Event",
        slug="aware-event",
        start_time=now - timedelta(hours=1),
        end_time=now + timedelta(hours=1),
        admin_id=1,
        admin_email="admin@laivdata.com",
        bingo_size=5,
        success_condition=4,
        keywords=[],
    )

    assert event.status == EventStatus.IN_PROGRESS
