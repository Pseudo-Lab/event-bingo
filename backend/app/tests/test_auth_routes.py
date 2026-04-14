from api.auth.routes import auth_router
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


def test_bingo_login_request_accepts_optional_google_email():
    payload = BingoLoginRequest(
        login_id="ABC123",
        password="bridge-key",
        event_slug="sample-event",
        user_email="tester@example.com",
    )

    assert payload.user_email == "tester@example.com"
