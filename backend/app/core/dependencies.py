"""
공용 Depends 모음
"""
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
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
    
    admin_id: int = payload.get("sub")
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

