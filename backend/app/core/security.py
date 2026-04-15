"""
보안 관련 유틸리티 함수
- Supabase JWT 토큰 검증
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import logging
import os
import time
from typing import Any, Optional

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa, utils

logger = logging.getLogger(__name__)

# Supabase JWT 설정
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")  # anon key (JWKS 요청에 필요)
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")  # HS256 fallback 용

# JWKS 캐시
_jwks_cache: Optional[dict] = None


class TokenDecodeError(ValueError):
    """JWT 파싱/검증 실패를 나타내는 내부 예외."""


def _base64url_decode(value: str) -> bytes:
    padding_chars = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding_chars}")


def _parse_jwt_segment(segment: str) -> dict[str, Any]:
    try:
        decoded = _base64url_decode(segment)
        payload = json.loads(decoded)
    except (TypeError, ValueError, json.JSONDecodeError, binascii.Error) as exc:
        raise TokenDecodeError("JWT 세그먼트를 파싱할 수 없습니다.") from exc

    if not isinstance(payload, dict):
        raise TokenDecodeError("JWT 세그먼트는 JSON 객체여야 합니다.")

    return payload


def _split_jwt(token: str) -> tuple[dict[str, Any], dict[str, Any], bytes, bytes]:
    try:
        header_segment, payload_segment, signature_segment = token.split(".")
    except ValueError as exc:
        raise TokenDecodeError("JWT 형식이 올바르지 않습니다.") from exc

    header = _parse_jwt_segment(header_segment)
    payload = _parse_jwt_segment(payload_segment)

    try:
        signature = _base64url_decode(signature_segment)
    except (TypeError, ValueError, binascii.Error) as exc:
        raise TokenDecodeError("JWT 서명을 디코딩할 수 없습니다.") from exc

    signing_input = f"{header_segment}.{payload_segment}".encode("ascii")
    return header, payload, signing_input, signature


def _base64url_to_int(value: str) -> int:
    return int.from_bytes(_base64url_decode(value), "big")


def _find_jwk(header: dict[str, Any], jwks: dict[str, Any]) -> dict[str, Any]:
    keys = jwks.get("keys")
    if not isinstance(keys, list) or not keys:
        raise TokenDecodeError("JWKS 키셋이 비어 있습니다.")

    kid = header.get("kid")
    alg = header.get("alg")
    for jwk in keys:
        if not isinstance(jwk, dict):
            continue
        if kid and jwk.get("kid") != kid:
            continue
        if alg == "RS256" and jwk.get("kty") == "RSA":
            return jwk
        if alg == "ES256" and jwk.get("kty") == "EC" and jwk.get("crv") == "P-256":
            return jwk

    raise TokenDecodeError("JWT 헤더와 일치하는 JWK를 찾을 수 없습니다.")


def _load_public_key(jwk: dict[str, Any]) -> rsa.RSAPublicKey | ec.EllipticCurvePublicKey:
    key_type = jwk.get("kty")

    try:
        if key_type == "RSA":
            return rsa.RSAPublicNumbers(
                e=_base64url_to_int(jwk["e"]),
                n=_base64url_to_int(jwk["n"]),
            ).public_key()
        if key_type == "EC" and jwk.get("crv") == "P-256":
            return ec.EllipticCurvePublicNumbers(
                x=_base64url_to_int(jwk["x"]),
                y=_base64url_to_int(jwk["y"]),
                curve=ec.SECP256R1(),
            ).public_key()
    except (KeyError, ValueError, TypeError, binascii.Error) as exc:
        raise TokenDecodeError("JWK 공개키를 구성할 수 없습니다.") from exc

    raise TokenDecodeError("지원하지 않는 JWK 키 타입입니다.")


def _validate_registered_claims(payload: dict[str, Any]) -> None:
    now = time.time()

    for claim_name in ("exp", "nbf", "iat"):
        value = payload.get(claim_name)
        if value is not None and not isinstance(value, (int, float)):
            raise TokenDecodeError(f"{claim_name} 클레임은 숫자여야 합니다.")

    exp = payload.get("exp")
    if exp is not None and now >= float(exp):
        raise TokenDecodeError("JWT가 만료되었습니다.")

    nbf = payload.get("nbf")
    if nbf is not None and now < float(nbf):
        raise TokenDecodeError("JWT가 아직 유효하지 않습니다.")


def _verify_jwks_signature(
    header: dict[str, Any],
    payload: dict[str, Any],
    signing_input: bytes,
    signature: bytes,
) -> dict[str, Any]:
    if not _jwks_cache:
        raise TokenDecodeError("JWKS 캐시가 비어 있습니다.")

    algorithm = header.get("alg")
    jwk = _find_jwk(header, _jwks_cache)
    public_key = _load_public_key(jwk)

    try:
        if algorithm == "RS256":
            assert isinstance(public_key, rsa.RSAPublicKey)
            public_key.verify(signature, signing_input, padding.PKCS1v15(), hashes.SHA256())
        elif algorithm == "ES256":
            assert isinstance(public_key, ec.EllipticCurvePublicKey)
            if len(signature) != 64:
                raise TokenDecodeError("ES256 서명 길이가 올바르지 않습니다.")
            half = len(signature) // 2
            der_signature = utils.encode_dss_signature(
                int.from_bytes(signature[:half], "big"),
                int.from_bytes(signature[half:], "big"),
            )
            public_key.verify(der_signature, signing_input, ec.ECDSA(hashes.SHA256()))
        else:
            raise TokenDecodeError("지원하지 않는 JWKS 서명 알고리즘입니다.")
    except InvalidSignature as exc:
        raise TokenDecodeError("JWT 서명 검증에 실패했습니다.") from exc

    _validate_registered_claims(payload)
    return payload


def _verify_hs256_signature(payload: dict[str, Any], signing_input: bytes, signature: bytes) -> dict[str, Any]:
    if not SUPABASE_JWT_SECRET:
        raise TokenDecodeError("HS256 검증용 비밀키가 설정되지 않았습니다.")

    expected_signature = hmac.new(
        SUPABASE_JWT_SECRET.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    if not hmac.compare_digest(signature, expected_signature):
        raise TokenDecodeError("JWT 서명 검증에 실패했습니다.")

    _validate_registered_claims(payload)
    return payload


async def warm_jwks_cache() -> None:
    """서버 시작 시 JWKS를 미리 로드해 첫 요청 블로킹을 방지합니다."""
    await _fetch_jwks_async()


async def _fetch_jwks_async() -> Optional[dict]:
    """Supabase JWKS 엔드포인트에서 키를 비동기로 가져와 캐싱합니다."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    if not SUPABASE_URL:
        return None
    try:
        import httpx

        jwks_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        headers = {}
        if SUPABASE_KEY:
            headers["apikey"] = SUPABASE_KEY
        async with httpx.AsyncClient() as client:
            resp = await client.get(jwks_url, headers=headers, timeout=5)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        return _jwks_cache
    except Exception as e:
        logger.debug(f"JWKS 가져오기 실패: {e}")
        return None


def decode_supabase_token(token: str) -> Optional[dict]:
    """
    Supabase에서 발급한 JWT 토큰 검증 및 디코딩.
    JWKS 기반 비대칭 키 검증 후, 실패 시 HS256 Secret으로 폴백합니다.
    캐시된 JWKS가 없으면 HS256 fallback만 시도합니다 (동기 컨텍스트 대비).
    """
    try:
        header, payload, signing_input, signature = _split_jwt(token)
    except TokenDecodeError as e:
        logger.debug(f"Supabase 토큰 파싱 실패: {e}")
        return None

    algorithm = header.get("alg")

    # 1. JWKS 기반 검증 (캐시된 경우만 — 동기 함수에서 호출되므로 네트워크 IO 없음)
    if _jwks_cache and algorithm in {"RS256", "ES256"}:
        try:
            return _verify_jwks_signature(header, payload, signing_input, signature)
        except TokenDecodeError as e:
            logger.debug(f"JWKS 기반 Supabase 토큰 검증 실패: {e}")

    # 2. HS256 Secret 기반 검증 (레거시 Supabase)
    if algorithm != "HS256":
        return None

    try:
        return _verify_hs256_signature(payload, signing_input, signature)
    except TokenDecodeError as e:
        logger.debug(f"HS256 Supabase 토큰 검증 실패: {e}")
        return None
