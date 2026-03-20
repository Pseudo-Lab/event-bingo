"""
보안 관련 유틸리티 함수
- JWT 토큰 생성 및 검증
- 비밀번호 해싱 및 검증
"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Optional
import os
import secrets
import logging

from jose import JWTError, jwt
import bcrypt

logger = logging.getLogger(__name__)

# JWT 설정
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "")
if not SECRET_KEY:
    SECRET_KEY = secrets.token_urlsafe(32)
    logger.warning("JWT_SECRET_KEY 환경 변수가 설정되지 않았습니다. 임시 키를 생성합니다. (서버 재시작 시 기존 토큰 무효화)")
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
    from datetime import timezone
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# Supabase JWT 설정
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")  # HS256 fallback 용

# JWKS 캐시 (python-jose 전용 — PyJWT 미사용)
_jwks_cache: Optional[dict] = None


def _fetch_jwks() -> Optional[dict]:
    """Supabase JWKS 엔드포인트에서 키를 가져와 캐싱 (httpx 동기 호출)"""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    if not SUPABASE_URL:
        return None
    try:
        import httpx
        jwks_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/jwks"
        resp = httpx.get(jwks_url, timeout=5)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        return _jwks_cache
    except Exception as e:
        logger.debug(f"JWKS 가져오기 실패: {e}")
        return None


def verify_access_token(token: str) -> Optional[dict]:
    """기존 Admin용 혹은 자체 발급 JWT 액세스 토큰 검증"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def decode_supabase_token(token: str) -> Optional[dict]:
    """
    Supabase에서 발급한 JWT 토큰 검증 및 디코딩
    JWKS 기반 비대칭 키 검증 후, 실패 시 HS256 Secret으로 폴백합니다.
    python-jose만 사용 (PyJWT 미사용).
    """
    # 1. JWKS 기반 검증 (RS256, ES256 등)
    jwks = _fetch_jwks()
    if jwks:
        try:
            # python-jose는 JWKS dict에서 직접 kid 매칭하여 검증 가능
            payload = jwt.decode(
                token,
                jwks,
                algorithms=["RS256", "ES256", "HS256"],
                options={"verify_aud": False},
            )
            return payload
        except JWTError as e:
            logger.debug(f"JWKS 기반 Supabase 토큰 검증 실패: {e}")

    # 2. HS256 Secret 기반 검증 (레거시 Supabase)
    if not SUPABASE_JWT_SECRET:
        return None

    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
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
