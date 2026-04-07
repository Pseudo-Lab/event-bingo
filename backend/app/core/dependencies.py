"""
공용 Depends 모음
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


# Swagger/Admin Auth
SWAGGER_USERNAME = os.environ.get("SWAGGER_USERNAME")
SWAGGER_PASSWORD = os.environ.get("SWAGGER_PASSWORD")

security = HTTPBasic()

def authenticate_user(credentials: Annotated[HTTPBasicCredentials, Depends(security)]):
    if not SWAGGER_USERNAME or not SWAGGER_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Swagger credentials are not configured",
        )
    if credentials.username != SWAGGER_USERNAME or credentials.password != SWAGGER_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Basic"},
        )


# ---------------------
# User Dependencies (Supabase JWT → BingoUser 매칭/자동생성)
# ---------------------
bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    session: AsyncSessionDepends
):
    """
    Supabase JWT 토큰으로 BingoUser 조회.
    DB에 없으면 자동 생성 (Supabase 가입 = 서비스 가입).
    """
    payload = decode_supabase_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )

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
        select(BingoUser).where(BingoUser.provider_id == supabase_id).limit(1)
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
    new_user = BingoUser(
        user_name=email.split("@")[0],
        user_email=email,
        auth_provider="supabase",
        provider_id=supabase_id,
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return new_user
