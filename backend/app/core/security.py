from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Final

import jwt
from jwt import InvalidTokenError

from app.core.config import settings
from app.models.enums import RoleEnum

PBKDF2_ALGORITHM: Final[str] = "sha256"
PBKDF2_ITERATIONS: Final[int] = 390000
ADMIN_PORTAL_ROLES: Final[set[RoleEnum]] = {
    RoleEnum.RH_ADMIN,
    RoleEnum.RH_ANALISTA,
    RoleEnum.GESTOR,
    RoleEnum.DIRETOR_RAVI,
    RoleEnum.TI_SUPORTE,
}
LDAP_AUTH_ROLES: Final[set[RoleEnum]] = {
    RoleEnum.RH_ADMIN,
    RoleEnum.RH_ANALISTA,
}


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac(
        PBKDF2_ALGORITHM,
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    return "pbkdf2_sha256${iterations}${salt}${hash}".format(
        iterations=PBKDF2_ITERATIONS,
        salt=base64.b64encode(salt).decode("utf-8"),
        hash=base64.b64encode(password_hash).decode("utf-8"),
    )


def verify_password(password: str, password_hash: str) -> bool:
    try:
        scheme, iterations, salt, expected_hash = password_hash.split("$", maxsplit=3)
    except ValueError:
        return False

    if scheme != "pbkdf2_sha256":
        return False

    computed_hash = hashlib.pbkdf2_hmac(
        PBKDF2_ALGORITHM,
        password.encode("utf-8"),
        base64.b64decode(salt.encode("utf-8")),
        int(iterations),
    )
    return hmac.compare_digest(
        base64.b64encode(computed_hash).decode("utf-8"),
        expected_hash,
    )


def create_access_token(subject: str, role: str) -> str:
    expire_at = datetime.now(UTC) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload = {
        "sub": subject,
        "role": role,
        "exp": expire_at,
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


__all__ = [
    "ADMIN_PORTAL_ROLES",
    "LDAP_AUTH_ROLES",
    "InvalidTokenError",
    "create_access_token",
    "decode_access_token",
    "hash_password",
    "verify_password",
]
