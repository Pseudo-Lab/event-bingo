import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

from api.admin import auth as admin_auth
import api.admin.routes as admin_routes
from api.admin.routes import admin_router
from models.admin import AdminRole
from models.event import EventStatus, GameMode


class _FakeScalarResult:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items


class _FakeExecuteResult:
    def __init__(self, *, scalar_items=None, rows=None):
        self._scalar_items = scalar_items or []
        self._rows = rows or []

    def scalars(self):
        return _FakeScalarResult(self._scalar_items)

    def scalar_one_or_none(self):
        return self._scalar_items[0] if self._scalar_items else None

    def __iter__(self):
        return iter(self._rows)


class _AdminEventListDb:
    def __init__(self, execute_results):
        self._execute_results = list(execute_results)
        self.statements = []

    async def execute(self, statement):
        self.statements.append(str(statement))
        return self._execute_results.pop(0)


def _admin_stub(admin_id: int, role: AdminRole):
    return SimpleNamespace(id=admin_id, email=f"admin-{admin_id}@example.com", name=f"Admin {admin_id}", role=role)


def _event_stub(event_id: int, admin_id: int, name: str):
    now = datetime(2026, 6, 5, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=event_id,
        slug=f"event-{event_id}",
        name=name,
        admin_id=admin_id,
        location="서울",
        event_team="DevFactory",
        start_time=now,
        end_time=now,
        admin_email=f"owner-{admin_id}@example.com",
        bingo_size=5,
        success_condition=3,
        keywords=["AI", "Networking"],
        game_mode=GameMode.INDIVIDUAL,
        team_size=1,
        status=EventStatus.IN_PROGRESS,
    )


def test_admin_router_exposes_google_admin_endpoints_only():
    paths = {route.path for route in admin_router.routes}

    assert "/admin/auth/me" in paths
    assert "/admin/policy-template" in paths
    assert "/admin/event-manager-requests/{request_id}" in paths
    assert "/admin/auth/login" not in paths
    assert "/admin/invitations/{invite_token}" not in paths
    assert "/admin/invitations/{invite_token}/complete" not in paths


def test_list_admin_events_route_limits_event_manager_to_owned_events(monkeypatch):
    async def skip_seed(_db):
        return None

    actor = _admin_stub(2, AdminRole.EVENT_MANAGER)
    owned_event = _event_stub(20, 2, "내 행사")
    creator = _admin_stub(2, AdminRole.EVENT_MANAGER)
    db = _AdminEventListDb(
        [
            _FakeExecuteResult(scalar_items=[owned_event]),
            _FakeExecuteResult(scalar_items=[creator]),
            _FakeExecuteResult(rows=[]),
            _FakeExecuteResult(rows=[]),
        ]
    )
    monkeypatch.setattr(admin_routes, "ensure_admin_console_seed_data", skip_seed)

    response = asyncio.run(admin_routes.list_admin_events(db, actor))

    assert "WHERE events.admin_id = " in db.statements[0]
    assert response.ok is True
    assert [event.id for event in response.events] == [20]
    assert response.events[0].created_by_id == actor.id
    assert response.events[0].can_edit is True


def test_list_admin_events_route_includes_co_host_events(monkeypatch):
    async def skip_seed(_db):
        return None

    actor = _admin_stub(2, AdminRole.EVENT_MANAGER)
    co_host_event = _event_stub(30, 3, "공동 운영 행사")
    creator = _admin_stub(3, AdminRole.EVENT_MANAGER)
    db = _AdminEventListDb(
        [
            _FakeExecuteResult(scalar_items=[co_host_event]),
            _FakeExecuteResult(scalar_items=[creator]),
            _FakeExecuteResult(rows=[]),
            _FakeExecuteResult(rows=[]),
            _FakeExecuteResult(scalar_items=[SimpleNamespace(id=1)]),
        ]
    )
    monkeypatch.setattr(admin_routes, "ensure_admin_console_seed_data", skip_seed)

    response = asyncio.run(admin_routes.list_admin_events(db, actor))

    assert "event_co_hosts" in db.statements[0]
    assert response.ok is True
    assert [event.id for event in response.events] == [30]
    assert response.events[0].created_by_id == 3
    assert response.events[0].can_edit is False


def test_list_admin_events_route_keeps_full_scope_for_admin(monkeypatch):
    async def skip_seed(_db):
        return None

    actor = _admin_stub(1, AdminRole.ADMIN)
    first_event = _event_stub(10, 1, "첫 번째 행사")
    second_event = _event_stub(20, 2, "두 번째 행사")
    db = _AdminEventListDb(
        [
            _FakeExecuteResult(scalar_items=[first_event, second_event]),
            _FakeExecuteResult(scalar_items=[_admin_stub(1, AdminRole.ADMIN), _admin_stub(2, AdminRole.EVENT_MANAGER)]),
            _FakeExecuteResult(rows=[]),
            _FakeExecuteResult(rows=[]),
        ]
    )
    monkeypatch.setattr(admin_routes, "ensure_admin_console_seed_data", skip_seed)

    response = asyncio.run(admin_routes.list_admin_events(db, actor))

    assert "WHERE" not in db.statements[0]
    assert response.ok is True
    assert [event.id for event in response.events] == [10, 20]
    assert all(event.can_edit for event in response.events)


def test_fetch_supabase_user_payload_uses_supabase_auth_user(monkeypatch):
    captured = {}

    class FakeResponse:
        status_code = 200

        @staticmethod
        def json():
            return {
                "id": "supabase-user-id",
                "email": "admin@example.com",
            }

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def get(self, url, headers, timeout):
            captured["url"] = url
            captured["headers"] = headers
            captured["timeout"] = timeout
            return FakeResponse()

    monkeypatch.setattr(admin_auth, "SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setattr(admin_auth, "SUPABASE_KEY", "publishable-key")
    monkeypatch.setattr(admin_auth.httpx, "AsyncClient", lambda: FakeClient())

    payload = asyncio.run(admin_auth._fetch_supabase_user_payload("access-token"))

    assert payload == {
        "sub": "supabase-user-id",
        "email": "admin@example.com",
    }
    assert captured["url"] == "https://project.supabase.co/auth/v1/user"
    assert captured["headers"] == {
        "apikey": "publishable-key",
        "Authorization": "Bearer access-token",
    }
    assert captured["timeout"] == 5


def test_fetch_supabase_user_payload_rejects_failed_lookup(monkeypatch):
    class FakeResponse:
        status_code = 401

        @staticmethod
        def json():
            return {}

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def get(self, url, headers, timeout):
            return FakeResponse()

    monkeypatch.setattr(admin_auth, "SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setattr(admin_auth, "SUPABASE_KEY", "publishable-key")
    monkeypatch.setattr(admin_auth.httpx, "AsyncClient", lambda: FakeClient())

    assert asyncio.run(admin_auth._fetch_supabase_user_payload("bad-token")) is None
