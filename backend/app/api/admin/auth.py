from datetime import datetime, timedelta, timezone
import logging
import os

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.db import AsyncSessionDepends
from core.security import decode_supabase_token
from models.admin import Admin

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ADMIN_JWT_EXPIRE_HOURS", "12"))
ADMIN_JWT_SECRET = os.getenv("ADMIN_JWT_SECRET", "unsafe-dev-admin-secret")

bearer_scheme = HTTPBearer(auto_error=False)


def create_admin_access_token(admin: Admin) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(admin.id),
        "email": admin.email,
        "role": admin.role.value,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)).timestamp()),
    }
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm=ALGORITHM)


def decode_admin_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, ADMIN_JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.PyJWTError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 인증이 만료되었거나 유효하지 않습니다.",
        ) from error


async def _try_supabase_admin_auth(db, token: str):
    """Supabase JWT로 Admin 인증 시도. 실패하면 None 반환."""
    payload = decode_supabase_token(token)
    if payload is None:
        return None

    email = payload.get("email")
    if not email:
        return None

    admin = await Admin.get_by_email(db, email)
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

    # 1. 기존 로컬 JWT 시도
    try:
        payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=[ALGORITHM])
        subject = payload.get("sub")
        if subject is not None:
            admin = await Admin.get_by_id(db, int(subject))
            if admin:
                return admin
    except jwt.PyJWTError:
        pass

    # 2. Supabase JWT 시도 (email → Admin 테이블 매핑)
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
