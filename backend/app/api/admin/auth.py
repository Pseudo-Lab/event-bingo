import logging
import time

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.db import AsyncSessionDepends
from core.security import SUPABASE_KEY, SUPABASE_URL, decode_supabase_token
from models.admin import Admin

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)

# supabase_id → (Admin, expires_at) 60초 캐시
_admin_cache: dict[str, tuple[Admin, float]] = {}
_ADMIN_CACHE_TTL = 60.0


async def _fetch_supabase_user_payload(token: str) -> dict | None:
    """Supabase Auth 서버에 토큰 검증을 위임합니다. 로컬 JWT 검증이 불가능할 때만 사용합니다."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SUPABASE_URL.rstrip('/')}/auth/v1/user",
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {token}",
                },
                timeout=5,
            )

        if response.status_code >= 400:
            logger.debug("Supabase Auth user lookup failed: %s", response.status_code)
            return None

        user = response.json()
    except Exception as error:
        logger.debug("Supabase Auth user lookup failed: %s", error)
        return None

    if not isinstance(user, dict):
        return None

    user_id = user.get("id")
    email = user.get("email")
    if not user_id or not email:
        return None

    return {
        "sub": user_id,
        "email": email,
    }


async def _try_supabase_admin_auth(db, token: str):
    """Supabase JWT로 Admin 인증 시도. 실패하면 None 반환."""
    payload = decode_supabase_token(token)
    if payload is None:
        payload = await _fetch_supabase_user_payload(token)

    if payload is None:
        return None

    email = payload.get("email")
    supabase_id = payload.get("sub")
    if not email or not supabase_id:
        return None

    # 캐시 확인 (TTL 내면 DB 조회 스킵)
    cached = _admin_cache.get(supabase_id)
    if cached:
        admin, expires_at = cached
        if time.monotonic() < expires_at:
            return admin

    admin = await Admin.get_by_email(db, email)
    if admin:
        _admin_cache[supabase_id] = (admin, time.monotonic() + _ADMIN_CACHE_TTL)
    return admin


async def authenticate_admin_session(
    db: AsyncSessionDepends,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Admin:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 인증이 필요합니다.",
        )

    token = credentials.credentials

    # Supabase JWT 시도 (email → Admin 테이블 매핑)
    admin = await _try_supabase_admin_auth(db, token)
    if admin:
        return admin

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="관리자 인증이 만료되었거나 유효하지 않습니다.",
    )


def require_admin_role(admin: Admin) -> Admin:
    if admin.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다.",
        )

    return admin
