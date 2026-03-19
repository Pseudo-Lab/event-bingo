from api.events.routes import events_router


def test_events_router_exposes_public_catalog_and_application_endpoints():
    paths = {route.path for route in events_router.routes}

    assert "/events" in paths
    assert "/events/manager-requests" in paths
    assert "/events/{event_slug}" in paths
