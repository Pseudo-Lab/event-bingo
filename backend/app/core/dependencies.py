"""
공용 Depends 모음
- 모든 인증은 Supabase JWT 기반
"""
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, HTTPBasic, HTTPBasicCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.db import db
from core.security import decode_supabase_token
import os


AsyncSessionDepends = Annotated[AsyncSession, Depends(db.get_session)]


# Swagger 문서 접근용 HTTP Basic Auth
SWAGGER_USERNAME = os.environ.get("SWAGGER_USERNAME", "admin")
SWAGGER_PASSWORD = os.environ.get("SWAGGER_PASSWORD", "admin")

security = HTTPBasic()

def authenticate_user(credentials: Annotated[HTTPBasicCredentials, Depends(security)]):
    if credentials.username != SWAGGER_USERNAME or credentials.password != SWAGGER_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Basic"},
        )


# JWT Bearer 토큰 인증 (Supabase)
bearer_scheme = HTTPBearer()


def _verify_supabase_token(token: str) -> dict:
    """Supabase 토큰 검증 공통 로직. 실패 시 HTTPException 발생."""
    payload = decode_supabase_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


# ---------------------
# Admin Dependencies (Supabase JWT → Admin 테이블 매칭)
# ---------------------
async def get_current_admin(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    session: AsyncSessionDepends
):
    """
    Supabase JWT 토큰의 email로 Admin 테이블 조회.
    Admin 레코드가 없으면 403 (관리자 권한 없음).
    """
    payload = _verify_supabase_token(credentials.credentials)

    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰에 이메일 정보가 없습니다",
        )

    from models.admin import Admin
    admin = await Admin.get_by_email(session, email)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 없습니다",
        )
    return admin


def require_admin_role(current_admin=Depends(get_current_admin)):
    """Admin 권한 확인 (ADMIN 또는 EVENT_MANAGER)"""
    return current_admin


def require_super_admin_role(current_admin=Depends(get_current_admin)):
    """Super Admin 권한 확인 (ADMIN만)"""
    from models.admin import AdminRole
    if current_admin.role != AdminRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ADMIN 권한이 필요합니다"
        )
    return current_admin


# ---------------------
# User Dependencies (Supabase JWT → BingoUser 매칭/자동생성)
# ---------------------
async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    session: AsyncSessionDepends
):
    """
    Supabase JWT 토큰으로 BingoUser 조회.
    DB에 없으면 자동 생성 (Supabase 가입 = 서비스 가입).
    """
    payload = _verify_supabase_token(credentials.credentials)

    supabase_id = payload.get("sub")
    email = payload.get("email")

    if not supabase_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰 페이로드가 올바르지 않습니다",
        )

    from models.user import BingoUser

    # 1. provider_id로 조회
    result = await session.execute(
        select(BingoUser).where(BingoUser.provider_id == supabase_id)
    )
    user = result.scalar_one_or_none()

    if user:
        return user

    # 2. 이메일로 조회 (기존 유저 연동)
    user = await BingoUser.get_user_by_email(session, email)
    if user:
        user.provider_id = supabase_id
        user.auth_provider = "supabase"
        await session.commit()
        await session.refresh(user)
        return user

    # 3. 신규 유저 자동 생성
    user = await BingoUser.create(
        session=session,
        email=email,
        user_name=email.split("@")[0],
        auth_provider="supabase",
        provider_id=supabase_id
    )
    return user
