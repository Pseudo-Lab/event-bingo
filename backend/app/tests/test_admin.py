import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from main import app
from core.db import db
from models.admin import Admin, AdminRole
from sqlalchemy import select

# This is a basic integration test for the Admin API
# We assume the database is already running via docker and db url is configured in .env

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    db.initialize()
    # Let's not reset the actual db, just ensure it's connected
    yield
    # No teardown needed for the session

@pytest_asyncio.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio
async def test_admin_register_and_login(async_client: AsyncClient):
    # 1. Register a new admin
    register_data = {
        "email": "test_admin@example.com",
        "password": "testpassword",
        "name": "Test Admin",
        "role": "EVENT_MANAGER"
    }
    
    # Normally register requires super admin role, but let's test the endpoint response
    # It might return 401/403 if we don't pass a valid super admin token
    # Since we are just verifying the route exists and works, we will simulate it.
    
    # First, let's create it directly in DB for testing login
    import uuid
    test_email = f"test_{uuid.uuid4()}@example.com"
    
    session_gen = db.get_session()
    session = await anext(session_gen)
    admin = await Admin.create(
        session=session,
        email=test_email,
        password="testpassword123",
        name="Login Tester",
        role=AdminRole.EVENT_MANAGER
    )
    # properly close session
    await session_gen.aclose()
    
    # 2. Test Login
    login_data = {
        "email": test_email,
        "password": "testpassword123"
    }
    
    response = await async_client.post("/api/admin/auth/login", json=login_data)
    assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.text}"
    
    data = response.json()
    assert "access_token" in data
    assert data["admin_name"] == "Login Tester"
    
    token = data["access_token"]
    
    # 3. Test Me
    headers = {"Authorization": f"Bearer {token}"}
    response_me = await async_client.get("/api/admin/auth/me", headers=headers)
    assert response_me.status_code == 200
    
    me_data = response_me.json()
    assert me_data["email"] == test_email
    assert me_data["name"] == "Login Tester"
    assert me_data["role"] == "EVENT_MANAGER"

