"""
Admin 관련 Pydantic 스키마
"""
from pydantic import BaseModel, EmailStr
from models.admin import AdminRole


class AdminLoginRequest(BaseModel):
    """로그인 요청"""
    email: EmailStr
    password: str


class AdminRegisterRequest(BaseModel):
    """회원가입 요청"""
    email: EmailStr
    password: str
    name: str
    role: AdminRole = AdminRole.EVENT_MANAGER


class AdminLoginResponse(BaseModel):
    """로그인 응답"""
    access_token: str
    token_type: str = "bearer"
    admin_id: int
    admin_name: str
    admin_role: str


class AdminInfoResponse(BaseModel):
    """Admin 정보 응답"""
    id: int
    email: str
    name: str
    role: str
    
    class Config:
        from_attributes = True
