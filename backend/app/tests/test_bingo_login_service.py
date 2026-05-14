import pytest
from types import SimpleNamespace

from api.auth.services.bingo_login import RegisterBingoUser


@pytest.mark.anyio
async def test_register_bingo_user_allows_blank_name_for_google_bridge(
    monkeypatch: pytest.MonkeyPatch,
):
    created_payload: dict[str, object] = {}

    async def fake_create(session, user_name, password, user_email=None):
        created_payload["session"] = session
        created_payload["user_name"] = user_name
        created_payload["password"] = password
        created_payload["user_email"] = user_email
        return SimpleNamespace(
            user_id=9,
            user_name=user_name,
            user_email=user_email,
            login_id="ABCD12",
            umoh_id=None,
        )

    async def fake_ensure_event_attendee(self, user_id, event_slug):
        created_payload["attendee_user_id"] = user_id
        created_payload["attendee_event_slug"] = event_slug

    monkeypatch.setattr("api.auth.services.bingo_login.BingoUser.create", fake_create)
    monkeypatch.setattr(RegisterBingoUser, "ensure_event_attendee", fake_ensure_event_attendee)

    service = RegisterBingoUser(session=None)
    response = await service.execute(
        username="",
        password="bridge-key",
        event_slug="sample-event",
        user_email="tester@example.com",
    )

    assert response.ok is True
    assert response.user_id == 9
    assert response.user_name is None
    assert created_payload == {
        "session": None,
        "user_name": None,
        "password": "bridge-key",
        "user_email": "tester@example.com",
        "attendee_user_id": 9,
        "attendee_event_slug": "sample-event",
    }
