import base64
import hashlib
import hmac
import json
import time
from typing import Any

import pytest

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa, utils

from core import security


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _int_to_b64url(value: int) -> str:
    byte_length = max(1, (value.bit_length() + 7) // 8)
    return _b64url_encode(value.to_bytes(byte_length, "big"))


def _encode_token(header: dict[str, Any], payload: dict[str, Any], signer) -> str:
    header_segment = _b64url_encode(json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    payload_segment = _b64url_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    signing_input = f"{header_segment}.{payload_segment}".encode("ascii")
    signature = signer(signing_input)
    return f"{header_segment}.{payload_segment}.{_b64url_encode(signature)}"


def _build_payload() -> dict[str, Any]:
    return {
        "sub": "user-123",
        "email": "tester@example.com",
        "exp": time.time() + 300,
    }


def _build_rsa_jwk(public_key: rsa.RSAPublicKey, kid: str) -> dict[str, Any]:
    numbers = public_key.public_numbers()
    return {
        "kty": "RSA",
        "kid": kid,
        "alg": "RS256",
        "use": "sig",
        "n": _int_to_b64url(numbers.n),
        "e": _int_to_b64url(numbers.e),
    }


def _build_ec_jwk(public_key: ec.EllipticCurvePublicKey, kid: str) -> dict[str, Any]:
    numbers = public_key.public_numbers()
    return {
        "kty": "EC",
        "kid": kid,
        "alg": "ES256",
        "use": "sig",
        "crv": "P-256",
        "x": _int_to_b64url(numbers.x),
        "y": _int_to_b64url(numbers.y),
    }


def test_decode_supabase_token_accepts_rs256_jwks(monkeypatch):
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = _encode_token(
        {"alg": "RS256", "kid": "rsa-key", "typ": "JWT"},
        _build_payload(),
        lambda signing_input: private_key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256()),
    )

    monkeypatch.setattr(security, "_jwks_cache", {"keys": [_build_rsa_jwk(private_key.public_key(), "rsa-key")]})
    monkeypatch.setattr(security, "SUPABASE_JWT_SECRET", "")

    payload = security.decode_supabase_token(token)

    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["email"] == "tester@example.com"


def test_decode_supabase_token_accepts_es256_jwks(monkeypatch):
    private_key = ec.generate_private_key(ec.SECP256R1())

    def sign_es256(signing_input: bytes) -> bytes:
        der_signature = private_key.sign(signing_input, ec.ECDSA(hashes.SHA256()))
        r_value, s_value = utils.decode_dss_signature(der_signature)
        return r_value.to_bytes(32, "big") + s_value.to_bytes(32, "big")

    token = _encode_token(
        {"alg": "ES256", "kid": "ec-key", "typ": "JWT"},
        _build_payload(),
        sign_es256,
    )

    monkeypatch.setattr(security, "_jwks_cache", {"keys": [_build_ec_jwk(private_key.public_key(), "ec-key")]})
    monkeypatch.setattr(security, "SUPABASE_JWT_SECRET", "")

    payload = security.decode_supabase_token(token)

    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["email"] == "tester@example.com"


def test_decode_supabase_token_accepts_hs256_fallback(monkeypatch):
    secret = "legacy-secret"
    token = _encode_token(
        {"alg": "HS256", "typ": "JWT"},
        _build_payload(),
        lambda signing_input: hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest(),
    )

    monkeypatch.setattr(security, "_jwks_cache", None)
    monkeypatch.setattr(security, "SUPABASE_JWT_SECRET", secret)

    payload = security.decode_supabase_token(token)

    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["email"] == "tester@example.com"


def test_decode_supabase_token_rejects_expired_hs256_token(monkeypatch):
    secret = "legacy-secret"
    expired_payload = {
        "sub": "user-123",
        "email": "tester@example.com",
        "exp": time.time() - 10,
    }
    token = _encode_token(
        {"alg": "HS256", "typ": "JWT"},
        expired_payload,
        lambda signing_input: hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest(),
    )

    monkeypatch.setattr(security, "_jwks_cache", None)
    monkeypatch.setattr(security, "SUPABASE_JWT_SECRET", secret)

    assert security.decode_supabase_token(token) is None


def test_decode_supabase_token_does_not_fallback_rs256_to_hs256_secret(monkeypatch):
    signing_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    mismatched_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = _encode_token(
        {"alg": "RS256", "kid": "rsa-key", "typ": "JWT"},
        _build_payload(),
        lambda signing_input: signing_key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256()),
    )

    monkeypatch.setattr(security, "_jwks_cache", {"keys": [_build_rsa_jwk(mismatched_key.public_key(), "rsa-key")]})
    monkeypatch.setattr(security, "SUPABASE_JWT_SECRET", "legacy-secret")

    assert security.decode_supabase_token(token) is None


@pytest.mark.parametrize("algorithm", ["RS256", "ES256"])
@pytest.mark.parametrize("failure", ["expired", "tampered_payload", "tampered_signature", "algorithm_confusion"])
def test_decode_supabase_token_rejects_invalid_asymmetric_tokens(monkeypatch, algorithm, failure):
    if algorithm == "RS256":
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        jwk = _build_rsa_jwk(private_key.public_key(), "test-key")

        def sign(value):
            return private_key.sign(value, padding.PKCS1v15(), hashes.SHA256())
    else:
        private_key = ec.generate_private_key(ec.SECP256R1())
        jwk = _build_ec_jwk(private_key.public_key(), "test-key")

        def sign(value):
            r_value, s_value = utils.decode_dss_signature(private_key.sign(value, ec.ECDSA(hashes.SHA256())))
            return r_value.to_bytes(32, "big") + s_value.to_bytes(32, "big")

    payload = _build_payload()
    if failure == "expired":
        payload["exp"] = time.time() - 10
    token = _encode_token({"alg": algorithm, "kid": "test-key"}, payload, sign)
    header, body, signature = token.split(".")
    if failure == "tampered_payload":
        body = _b64url_encode(json.dumps({**payload, "sub": "attacker"}).encode())
    elif failure == "tampered_signature":
        raw = base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4))
        signature = _b64url_encode(bytes([raw[0] ^ 1]) + raw[1:])
    elif failure == "algorithm_confusion":
        header = _b64url_encode(json.dumps({"alg": "HS256", "kid": "test-key"}).encode())
        public_key_bytes = private_key.public_key().public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        signature = _b64url_encode(hmac.new(public_key_bytes, f"{header}.{body}".encode(), hashlib.sha256).digest())

    monkeypatch.setattr(security, "_jwks_cache", {"keys": [jwk]})
    monkeypatch.setattr(security, "SUPABASE_JWT_SECRET", "legacy-secret")
    assert security.decode_supabase_token(f"{header}.{body}.{signature}") is None


@pytest.mark.anyio
@pytest.mark.parametrize("failure", [None, "http", "tls"])
async def test_jwks_fetch_success_and_failures(monkeypatch, failure):
    import httpx

    def respond(request):
        assert str(request.url) == "https://auth.example.test/auth/v1/.well-known/jwks.json"
        assert request.headers["apikey"] == "test-key"
        if failure == "tls":
            raise httpx.ConnectError("certificate verify failed", request=request)
        return httpx.Response(503 if failure == "http" else 200, json={"keys": [{"kid": "key-1"}]})

    client_class = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda: client_class(transport=httpx.MockTransport(respond)))
    monkeypatch.setattr(security, "SUPABASE_URL", "https://auth.example.test")
    monkeypatch.setattr(security, "SUPABASE_KEY", "test-key")
    monkeypatch.setattr(security, "_jwks_cache", None)

    result = await security._fetch_jwks_async()
    expected = None if failure else {"keys": [{"kid": "key-1"}]}
    assert result == expected
    assert security._jwks_cache == expected
