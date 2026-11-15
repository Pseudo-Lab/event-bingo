import pytest
from threading import get_ident
from types import SimpleNamespace
from unittest.mock import AsyncMock

from api.auth.services.bingo_login import LoginBingoUser, RegisterBingoUser


@pytest.mark.anyio
async def test_register_bingo_user_allows_blank_name_for_google_bridge(
    monkeypatch: pytest.MonkeyPatch,
):
    created_payload: dict[str, object] = {}

    async def fake_create(session, user_name, password, user_email=None, provider_id=None):
        created_payload["session"] = session
        created_payload["user_name"] = user_name
        created_payload["password"] = password
        created_payload["user_email"] = user_email
        created_payload["provider_id"] = provider_id
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
        provider_id="supabase-user-id",
    )

    assert response.ok is True
    assert response.user_id == 9
    assert response.user_name is None
    assert created_payload == {
        "session": None,
        "user_name": None,
        "password": "bridge-key",
        "user_email": "tester@example.com",
        "provider_id": "supabase-user-id",
        "attendee_user_id": 9,
        "attendee_event_slug": "sample-event",
    }


@pytest.mark.anyio
async def test_login_links_verified_supabase_subject_to_exact_bridge_user(
    monkeypatch: pytest.MonkeyPatch,
):
    user = SimpleNamespace(
        user_id=9,
        user_name="테스터",
        user_email="tester@example.com",
        login_id="ABCD12",
        password_hash="stored-hash",
        provider_id=None,
        auth_provider="legacy",
        umoh_id=None,
    )

    lookups = []
    event_loop_thread = get_ident()

    async def fake_get_user_by_login_id(session, login_id, *, for_update=False):
        lookups.append(for_update)
        return user

    def verify_password(password, password_hash):
        assert get_ident() != event_loop_thread
        session.rollback.assert_awaited_once()
        assert password == "bridge-key"
        assert password_hash == "stored-hash"
        return True

    async def fake_sync_user_email(session, user_id, user_email):
        return user

    async def fake_ensure_event_attendee(self, user_id, event_slug):
        return None

    monkeypatch.setattr("api.auth.services.bingo_login.BingoUser.get_user_by_login_id", fake_get_user_by_login_id)
    monkeypatch.setattr("api.auth.services.bingo_login.BingoUser.verify_password", verify_password)
    monkeypatch.setattr("api.auth.services.bingo_login.BingoUser.sync_user_email", fake_sync_user_email)
    monkeypatch.setattr(LoginBingoUser, "ensure_event_attendee", fake_ensure_event_attendee)

    session = SimpleNamespace(commit=AsyncMock(), refresh=AsyncMock(), rollback=AsyncMock())
    response = await LoginBingoUser(session=session).execute(
        login_id="ABCD12",
        password="bridge-key",
        event_slug="sample-event",
        user_email="tester@example.com",
        provider_id="supabase-user-id",
    )

    assert response.ok is True
    assert user.provider_id == "supabase-user-id"
    assert user.auth_provider == "supabase"
    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(user)
    assert lookups == [False, True]


@pytest.mark.anyio
async def test_login_rejects_relinking_a_different_supabase_subject(
    monkeypatch: pytest.MonkeyPatch,
):
    user = SimpleNamespace(
        user_id=9,
        user_name="테스터",
        user_email="tester@example.com",
        login_id="ABCD12",
        password_hash="stored-hash",
        provider_id="original-subject",
        auth_provider="supabase",
        umoh_id=None,
    )

    async def fake_get_user_by_login_id(session, login_id, *, for_update=False):
        return user

    monkeypatch.setattr("api.auth.services.bingo_login.BingoUser.get_user_by_login_id", fake_get_user_by_login_id)
    monkeypatch.setattr("api.auth.services.bingo_login.BingoUser.verify_password", lambda *_: True)

    response = await LoginBingoUser(session=SimpleNamespace(rollback=AsyncMock())).execute(
        login_id="ABCD12",
        password="bridge-key",
        user_email="tester@example.com",
        provider_id="different-subject",
    )

    assert response.ok is False
    assert response.message == "이미 다른 인증 계정에 연결된 빙고 계정입니다."
    assert user.provider_id == "original-subject"


@pytest.mark.anyio
async def test_login_rejects_password_changed_during_verification(monkeypatch):
    get_user = AsyncMock(side_effect=[
        SimpleNamespace(password_hash="previous-hash"),
        SimpleNamespace(password_hash="changed-hash"),
    ])
    monkeypatch.setattr("api.auth.services.bingo_login.BingoUser.get_user_by_login_id", get_user)
    monkeypatch.setattr("api.auth.services.bingo_login.BingoUser.verify_password", lambda *_: True)
    session = SimpleNamespace(rollback=AsyncMock())
    response = await LoginBingoUser(session).execute("ABCD12", "password")
    assert response.ok is False
    assert "계정 정보가 변경" in response.message
    assert get_user.call_args.kwargs == {"for_update": True}


@pytest.mark.anyio
async def test_wrong_password_never_reaches_identity_linking(monkeypatch):
    get_user = AsyncMock(return_value=SimpleNamespace(password_hash="stored-hash"))
    monkeypatch.setattr("api.auth.services.bingo_login.BingoUser.get_user_by_login_id", get_user)
    monkeypatch.setattr("api.auth.services.bingo_login.BingoUser.verify_password", lambda *_: False)
    session = SimpleNamespace(rollback=AsyncMock(), commit=AsyncMock())
    response = await LoginBingoUser(session).execute("ABCD12", "wrong-password", provider_id="unrelated")
    assert response.ok is False
    get_user.assert_awaited_once()
    session.commit.assert_not_awaited()
