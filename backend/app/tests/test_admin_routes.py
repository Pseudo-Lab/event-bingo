import asyncio

from api.admin import auth as admin_auth
from api.admin.routes import admin_router


def test_admin_router_exposes_google_admin_endpoints_only():
    paths = {route.path for route in admin_router.routes}

    assert "/admin/auth/me" in paths
    assert "/admin/policy-template" in paths
    assert "/admin/event-manager-requests/{request_id}" in paths
    assert "/admin/auth/login" not in paths
    assert "/admin/invitations/{invite_token}" not in paths
    assert "/admin/invitations/{invite_token}/complete" not in paths


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
