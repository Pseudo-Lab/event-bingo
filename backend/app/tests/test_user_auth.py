import pytest
import pytest_asyncio
import uuid
import jwt
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from core import security
from core.dependencies import get_current_user
from core.db import db
from models.user import BingoUser

@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    db.initialize()
    yield


# 로컬 Mock 테스트를 위한 가짜 JWT Secret
DUMMY_SECRET = "dummy_secret_for_test_12345"

def create_mock_supabase_token(email: str, sub: str) -> str:
    """Supabase에서 발급한 것처럼 위장한 임시 HS256 토큰 생성"""
    payload = {
        "sub": sub,
        "email": email,
        "role": "authenticated", # Supabase 기본 역할
    }
    return jwt.encode(payload, DUMMY_SECRET, algorithm="HS256")

@pytest.mark.asyncio
async def test_supabase_new_user_sync(monkeypatch):
    """(시나리오 1) 이전 기록이 없는 완전 신규 유저가 Supabase 토큰으로 접근 시"""
    # 보안 모듈의 Secret 값을 Mocking (OS 환경변수 대신 직접 주입)
    monkeypatch.setattr(security, "SUPABASE_JWT_SECRET", DUMMY_SECRET)
    
    test_email = f"new_user_{uuid.uuid4()}@example.com"
    test_sub = str(uuid.uuid4())
    
    token = create_mock_supabase_token(test_email, test_sub)
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    
    # DB 세션 확보
    session_gen = db.get_session()
    session = await anext(session_gen)
    
    try:
        # JWT 해독 및 유저 동기화(Sync) 로직 실행
        user = await get_current_user(credentials=credentials, session=session)
        
        # 검증
        assert user is not None
        assert user.user_email == test_email
        assert user.auth_provider == "supabase" # 제대로 Supabase 계정으로 인식되었는지
        assert user.provider_id == test_sub
    finally:
        await session_gen.aclose()


@pytest.mark.asyncio
async def test_supabase_existing_user_link(monkeypatch):
    """(시나리오 2) 과거에 이메일로 가입했던 유저가 Supabase 토큰으로 접근 시 (계정 연동)"""
    monkeypatch.setattr(security, "SUPABASE_JWT_SECRET", DUMMY_SECRET)
    
    test_email = f"legacy_user_{uuid.uuid4()}@example.com"
    test_sub = str(uuid.uuid4())
    
    session_gen = db.get_session()
    session = await anext(session_gen)
    
    try:
        # 먼저 기존 과거 방식으로 유저를 강제 생성해둠
        legacy_user = await BingoUser.create(
            session=session, 
            email=test_email, 
            user_name="OldUser", 
            auth_provider="email_only"
        )
        
        # Supabase를 통해 동일 이메일로 접근 시도
        token = create_mock_supabase_token(test_email, test_sub)
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        user_after_login = await get_current_user(credentials=credentials, session=session)
        
        # 検証 (계정이 중복 생성되지 않고, 같은 user_id를 유지하며 attributes만 덮어써져야 함)
        assert user_after_login.user_id == legacy_user.user_id
        assert user_after_login.auth_provider == "supabase"
        assert user_after_login.provider_id == test_sub
    finally:
        await session_gen.aclose()


@pytest.mark.asyncio
async def test_invalid_supabase_token(monkeypatch):
    """(시나리오 3) 서명이 틀리거나 위조된 토큰 접근 시 401 에러 발생 확인"""
    monkeypatch.setattr(security, "SUPABASE_JWT_SECRET", DUMMY_SECRET)
    
    # 다른 시크릿키로 암호화 (위조)
    fake_token = jwt.encode({"sub": "fake", "email": "fake@ex.com"}, "wrong_secret", algorithm="HS256")
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=fake_token)
    
    session_gen = db.get_session()
    session = await anext(session_gen)
    
    try:
        # Exception이 터지는지(HTTPException 401) 확인
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials=credentials, session=session)
            
        assert exc_info.value.status_code == 401
        assert "유효하지 않습니다" in exc_info.value.detail
    finally:
        await session_gen.aclose()
