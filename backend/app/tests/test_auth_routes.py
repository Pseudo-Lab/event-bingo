import pytest

from api.auth.routes import auth_router, bingo_search_participants, resolve_participant_search_name
from api.auth.schema import BingoLoginRequest, BingoRegisterRequest


def test_bingo_auth_router_removes_legacy_lookup_endpoints():
    bingo_paths = {
        route.path
        for route in auth_router.routes
        if route.path.startswith("/auth/bingo/")
    }

    assert "/auth/bingo/register" in bingo_paths
    assert "/auth/bingo/login" in bingo_paths
    assert "/auth/bingo/get-user" not in bingo_paths
    assert "/auth/bingo/get-user-by-name" not in bingo_paths
    assert "/auth/bingo/get-user/{user_id}" not in bingo_paths


def test_bingo_register_request_accepts_optional_google_email():
    payload = BingoRegisterRequest(
        username="테스터",
        password="bridge-key",
        event_slug="sample-event",
        user_email="tester@example.com",
    )

    assert payload.user_email == "tester@example.com"


def test_bingo_register_request_allows_blank_name_for_google_bridge():
    payload = BingoRegisterRequest(
        password="bridge-key",
        event_slug="sample-event",
        user_email="tester@example.com",
    )

    assert payload.username is None
    assert payload.user_email == "tester@example.com"


def test_bingo_login_request_accepts_optional_google_email():
    payload = BingoLoginRequest(
        login_id="ABC123",
        password="bridge-key",
        event_slug="sample-event",
        user_email="tester@example.com",
    )

    assert payload.user_email == "tester@example.com"


def test_resolve_participant_search_name_prefers_event_board_name():
    user = type("UserStub", (), {"user_id": 1, "user_name": "구글 닉네임"})()
    board = type("BoardStub", (), {"display_name": "행사 빙고 이름"})()

    assert resolve_participant_search_name(board, user) == "행사 빙고 이름"


def test_resolve_participant_search_name_falls_back_to_user_name():
    user = type("UserStub", (), {"user_id": 2, "user_name": "기본 이름"})()
    board = type("BoardStub", (), {"display_name": ""})()

    assert resolve_participant_search_name(board, user) == "기본 이름"


@pytest.mark.asyncio
async def test_bingo_search_participants_uses_event_attendee_search(monkeypatch: pytest.MonkeyPatch):
    event = type("EventStub", (), {"id": 7})()
    participant_rows = [
        (
            type("AttendeeStub", (), {"user_id": 12})(),
            type("UserStub", (), {"user_id": 12, "user_name": "김승규"})(),
            type("BoardStub", (), {"display_name": "김승규"})(),
        ),
        (
            type("AttendeeStub", (), {"user_id": 13})(),
            type("UserStub", (), {"user_id": 13, "user_name": "김승규"})(),
            None,
        ),
        (
            type("AttendeeStub", (), {"user_id": 14})(),
            type("UserStub", (), {"user_id": 14, "user_name": "김승규"})(),
            type("BoardStub", (), {"display_name": "김승규B"})(),
        ),
    ]

    async def fake_get_by_slug(session, slug):
        assert slug == "sample-event"
        return event

    async def fake_search_participants(session, event_id, query, limit=20, exclude_user_id=None):
        assert event_id == 7
        assert query == "김승규"
        assert limit == 20
        assert exclude_user_id == 11
        return participant_rows

    monkeypatch.setattr("api.auth.routes.Event.get_by_slug", fake_get_by_slug)
    monkeypatch.setattr("api.auth.routes.EventAttendee.search_participants", fake_search_participants)

    response = await bingo_search_participants(
        q="김승규",
        event_slug="sample-event",
        exclude_user_id=11,
        session=None,
    )

    assert response.ok is True
    assert [participant.display_name for participant in response.participants] == ["김승규", "김승규B"]
