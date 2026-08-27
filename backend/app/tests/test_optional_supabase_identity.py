from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
import pytest

from core.dependencies import get_optional_supabase_identity


@pytest.mark.anyio
async def test_optional_supabase_identity_accepts_missing_legacy_token():
    assert await get_optional_supabase_identity(None) is None


@pytest.mark.anyio
async def test_optional_supabase_identity_returns_signed_subject_and_email(monkeypatch):
    monkeypatch.setattr(
        "core.dependencies.decode_supabase_token",
        lambda _token: {"sub": "supabase-user-id", "email": "verified@example.com"},
    )

    identity = await get_optional_supabase_identity(
        HTTPAuthorizationCredentials(scheme="Bearer", credentials="signed-token")
    )

    assert identity == {
        "provider_id": "supabase-user-id",
        "email": "verified@example.com",
    }


@pytest.mark.anyio
async def test_optional_supabase_identity_rejects_invalid_present_token(monkeypatch):
    monkeypatch.setattr("core.dependencies.decode_supabase_token", lambda _token: None)

    with pytest.raises(HTTPException) as error:
        await get_optional_supabase_identity(
            HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid-token")
        )

    assert error.value.status_code == 401
