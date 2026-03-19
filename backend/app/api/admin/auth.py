from datetime import datetime, timedelta, timezone
import os

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.db import AsyncSessionDepends
from models.admin import Admin


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


async def authenticate_admin_session(
    db: AsyncSessionDepends,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Admin:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 인증이 필요합니다.",
        )

    payload = decode_admin_access_token(credentials.credentials)
    subject = payload.get("sub")
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 인증 정보가 올바르지 않습니다.",
        )

    admin = await Admin.get_by_id(db, int(subject))
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 계정을 찾을 수 없습니다.",
        )

    return admin


def require_admin_role(admin: Admin) -> Admin:
    if admin.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다.",
        )

    return admin
