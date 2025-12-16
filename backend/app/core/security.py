"""
보안 관련 유틸리티 함수
- JWT 토큰 생성 및 검증
- 비밀번호 해싱 및 검증
"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Optional
import os

from jose import JWTError, jwt
import bcrypt


# JWT 설정
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24시간


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    JWT 액세스 토큰 생성
    
    Args:
        data: 토큰에 포함할 데이터 (주로 {"sub": user_id, "role": role})
        expires_delta: 만료 시간 (기본값: 24시간)
    
    Returns:
        인코딩된 JWT 토큰
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(ZoneInfo("Asia/Seoul")) + expires_delta
    else:
        expire = datetime.now(ZoneInfo("Asia/Seoul")) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_access_token(token: str) -> Optional[dict]:
    """
    JWT 액세스 토큰 검증 및 디코딩
    
    Args:
        token: JWT 토큰 문자열
    
    Returns:
        디코딩된 페이로드 (dict) 또는 None (검증 실패 시)
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_password_hash(password: str) -> str:
    """
    비밀번호를 bcrypt로 해싱
    
    Args:
        password: 평문 비밀번호
    
    Returns:
        해싱된 비밀번호
    """
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    평문 비밀번호와 해싱된 비밀번호 비교
    
    Args:
        plain_password: 평문 비밀번호
        hashed_password: 해싱된 비밀번호
    
    Returns:
        일치 여부 (bool)
    """
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
