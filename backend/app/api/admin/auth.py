import logging
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.db import AsyncSessionDepends
from core.security import decode_supabase_token
from models.admin import Admin

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)

# supabase_id → (Admin, expires_at) 60초 캐시
_admin_cache: dict[str, tuple[Admin, float]] = {}
_ADMIN_CACHE_TTL = 60.0


async def _try_supabase_admin_auth(db, token: str):
    """Supabase JWT로 Admin 인증 시도. 실패하면 None 반환."""
    payload = decode_supabase_token(token)
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
