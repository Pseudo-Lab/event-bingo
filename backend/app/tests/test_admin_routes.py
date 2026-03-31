from api.admin.routes import admin_router


def test_admin_router_exposes_invitation_endpoints():
    paths = {route.path for route in admin_router.routes}

    assert "/admin/policy-template" in paths
    assert "/admin/event-manager-requests/{request_id}" in paths
    assert "/admin/invitations/{invite_token}" in paths
    assert "/admin/invitations/{invite_token}/complete" in paths
