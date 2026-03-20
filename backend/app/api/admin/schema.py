"""
Admin 관련 Pydantic 스키마
"""
from pydantic import BaseModel, EmailStr
from models.admin import AdminRole


class AdminRegisterRequest(BaseModel):
    """Admin 역할 등록 요청 (Supabase 계정 이메일 기반)"""
    email: EmailStr
    name: str
    role: AdminRole = AdminRole.EVENT_MANAGER


class AdminInfoResponse(BaseModel):
    """Admin 정보 응답"""
    id: int
    email: str
    name: str
    role: str

    class Config:
        from_attributes = True
