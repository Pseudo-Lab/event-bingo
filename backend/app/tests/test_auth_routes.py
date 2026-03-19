from api.auth.routes import auth_router


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
