"""
보안 관련 유틸리티 함수
- Supabase JWT 토큰 검증
"""
from typing import Optional
import os
import logging

from jose import JWTError, jwt

logger = logging.getLogger(__name__)

# Supabase JWT 설정
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")  # HS256 fallback 용

# JWKS 캐시
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


def decode_supabase_token(token: str) -> Optional[dict]:
    """
    Supabase에서 발급한 JWT 토큰 검증 및 디코딩
    JWKS 기반 비대칭 키 검증 후, 실패 시 HS256 Secret으로 폴백합니다.
    """
    # 1. JWKS 기반 검증 (RS256, ES256 등)
    jwks = _fetch_jwks()
    if jwks:
        try:
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
