"""
Admin 인증 API 라우터
"""
from fastapi import APIRouter, HTTPException, Depends, status
from core.db import AsyncSessionDepends
from core.dependencies import get_current_admin, require_super_admin_role
from core.security import create_access_token, verify_password
from models.admin import Admin, AdminRole
from .schema import (
    AdminLoginRequest,
    AdminRegisterRequest,
    AdminLoginResponse,
    AdminInfoResponse
)


admin_auth_router = APIRouter(prefix="/admin-auth", tags=["Admin 인증"])


@admin_auth_router.post(
    "/login",
    response_model=AdminLoginResponse,
    summary="Admin 로그인",
    description="이메일과 비밀번호로 로그인하여 JWT 토큰을 발급받습니다."
)
async def login(
    request: AdminLoginRequest,
    session: AsyncSessionDepends
):
    """Admin 로그인"""
    # 이메일로 Admin 조회
    admin = await Admin.get_by_email(session, request.email)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다"
        )
    
    # 비밀번호 검증
    if not verify_password(request.password, admin.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다"
        )
    
    # JWT 토큰 생성
    access_token = create_access_token(
        data={"sub": admin.id, "role": admin.role.value}
    )
    
    return AdminLoginResponse(
        access_token=access_token,
        admin_id=admin.id,
        admin_name=admin.name,
        admin_role=admin.role.value
    )


@admin_auth_router.post(
    "/register",
    response_model=AdminInfoResponse,
    summary="Admin 회원가입",
    description="새로운 Admin을 등록합니다. ADMIN 권한이 필요합니다.",
    dependencies=[Depends(require_super_admin_role)]
)
async def register(
    request: AdminRegisterRequest,
    session: AsyncSessionDepends
):
    """
    Admin 회원가입 (ADMIN 권한 필요)
    
    새로운 EVENT_MANAGER 또는 ADMIN을 등록합니다.
    """
    try:
        admin = await Admin.create(
            session=session,
            email=request.email,
            password=request.password,
            name=request.name,
            role=request.role
        )
        
        return AdminInfoResponse(
            id=admin.id,
            email=admin.email,
            name=admin.name,
            role=admin.role.value
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@admin_auth_router.get(
    "/me",
    response_model=AdminInfoResponse,
    summary="현재 로그인한 Admin 정보 조회",
    description="JWT 토큰으로 현재 로그인한 Admin의 정보를 조회합니다."
)
async def get_me(current_admin: Admin = Depends(get_current_admin)):
    """현재 로그인한 Admin 정보"""
    return AdminInfoResponse(
        id=current_admin.id,
        email=current_admin.email,
        name=current_admin.name,
        role=current_admin.role.value
    )
