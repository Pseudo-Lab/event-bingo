"""
공용 Depends 모음
"""
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.db import db
from core.security import verify_access_token
import os


AsyncSessionDepends = Annotated[AsyncSession, Depends(db.get_session)]


# Swagger/Admin Auth (기존 HTTP Basic Auth - 간단한 엔드포인트용)
SWAGGER_USERNAME = os.environ.get("SWAGGER_USERNAME", "admin")
SWAGGER_PASSWORD = os.environ.get("SWAGGER_PASSWORD", "admin")

from fastapi.security import HTTPBasic, HTTPBasicCredentials
security = HTTPBasic()

def authenticate_user(credentials: Annotated[HTTPBasicCredentials, Depends(security)]):
    if credentials.username != SWAGGER_USERNAME or credentials.password != SWAGGER_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Basic"},
        )


# JWT Bearer 토큰 인증
bearer_scheme = HTTPBearer()


# ---------------------
# Admin JWT Dependencies
# ---------------------
async def get_current_admin(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    session: AsyncSessionDepends
):
    """
    JWT 토큰에서 현재 Admin 정보 추출
    
    Returns:
        Admin 객체
    
    Raises:
        HTTPException: 토큰이 유효하지 않거나 Admin을 찾을 수 없는 경우
    """
    token = credentials.credentials
    payload = verify_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # role 확인: 'admin_role'이 있는지로 어드민 토큰인지 구분
    if "admin_role" not in payload:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 없습니다",
        )
            
    try:
        admin_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        admin_id = None
    if admin_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰 페이로드가 올바르지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Admin 조회
    from models.admin import Admin
    try:
        admin = await Admin.get_by_id(session, admin_id)
        return admin
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin을 찾을 수 없습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_admin_role(current_admin = Depends(get_current_admin)):
    """Admin 권한 확인 (ADMIN 또는 EVENT_MANAGER)"""
    # 모든 Admin은 접근 가능
    return current_admin


def require_super_admin_role(current_admin = Depends(get_current_admin)):
    """Super Admin 권한 확인 (ADMIN만)"""
    from models.admin import AdminRole
    if current_admin.role != AdminRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ADMIN 권한이 필요합니다"
        )
    return current_admin


# ---------------------
# User JWT Dependencies (Supabase)
# ---------------------
async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    session: AsyncSessionDepends
):
    """
    JWT 토큰에서 현재 일반 User(BingoUser) 정보 추출
    Supabase 토큰 우선 검증, 실패 시 자체 토큰 검증
    """
    token = credentials.credentials
    
    # 1. Supabase 토큰 검증 시도
    from core.security import decode_supabase_token
    payload = decode_supabase_token(token)
    
    if payload:
        # Supabase 유저 정보 추출
        supabase_id = payload.get("sub")
        email = payload.get("email")
        
        if not supabase_id or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Supabase 토큰 페이로드가 올바르지 않습니다",
            )
        
        from models.user import BingoUser
        # DB에서 해당 Supabase ID로 유저 조회
        user = await session.execute(
            select(BingoUser).where(BingoUser.provider_id == supabase_id)
        )
        user = user.scalar_one_or_none()
        
        if not user:
            # 이메일로도 확인 (기존 유저 연동)
            user = await BingoUser.get_user_by_email(session, email)
            if user:
                # 기존 유저에 Supabase ID 업데이트
                user.provider_id = supabase_id
                user.auth_provider = "supabase"
                await session.commit()
                await session.refresh(user)
            else:
                # 새 유저 가입 처리
                user = await BingoUser.create(
                    session=session,
                    email=email,
                    user_name=email.split("@")[0],
                    auth_provider="supabase",
                    provider_id=supabase_id
                )
        return user

    # 2. 기존 자체 발급 토큰 검증 시도 (하위 호환성)
    payload = verify_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 어드민 토큰인지 확인하여 방어
    if "admin_role" in payload:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 토큰은 관리자용입니다. 일반 사용자 토큰을 사용해주세요."
        )

    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        user_id = None
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰 페이로드가 올바르지 않습니다",
        )

    from models.user import BingoUser
    try:
        user = await BingoUser.get_user_by_id(session, user_id)
        return user
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자를 찾을 수 없습니다",
        )

