from api.admin.routes import admin_router


def test_admin_router_exposes_google_admin_endpoints_only():
    paths = {route.path for route in admin_router.routes}

    assert "/admin/auth/me" in paths
    assert "/admin/policy-template" in paths
    assert "/admin/event-manager-requests/{request_id}" in paths
    assert "/admin/auth/login" not in paths
    assert "/admin/invitations/{invite_token}" not in paths
    assert "/admin/invitations/{invite_token}/complete" not in paths
