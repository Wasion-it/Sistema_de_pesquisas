from __future__ import annotations

import json
import secrets
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user
from app.core.config import settings
from app.core.security import ADMIN_PORTAL_ROLES, create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import AuditActionEnum, AuditLog, RoleEnum, User
from app.schemas.auth import AdminSessionResponse, AuthUserResponse, LoginRequest, LoginResponse
from app.services.ldap_auth import LdapAuthenticationError, LdapConfigurationError, authenticate_ldap_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _find_user_for_login(db: Session, identifier: str) -> User | None:
    normalized_identifier = identifier.strip()
    if not normalized_identifier:
        return None

    return db.scalar(
        select(User)
        .where(
            or_(
                User.email == normalized_identifier,
                User.email.like(f"{normalized_identifier}@%"),
            )
        )
        .order_by(User.id.asc())
    )


def _get_default_ldap_email_domain() -> str | None:
    if settings.ldap_bind_dn and "@" in settings.ldap_bind_dn:
        return settings.ldap_bind_dn.split("@", maxsplit=1)[1].strip().lower()

    if settings.ldap_user_base_dn:
        domain_parts = []
        for raw_part in settings.ldap_user_base_dn.split(","):
            part = raw_part.strip()
            if part.upper().startswith("DC="):
                domain_parts.append(part[3:])
        if domain_parts:
            return ".".join(domain_parts).lower()

    return None


def _build_ldap_user_email(identifier: str) -> str:
    normalized_identifier = identifier.strip().lower()
    if "@" in normalized_identifier:
        return normalized_identifier

    domain = _get_default_ldap_email_domain()
    if domain:
        return f"{normalized_identifier}@{domain}"

    return f"{normalized_identifier}@ldap.local"


def _ensure_ldap_admin_user(db: Session, identifier: str) -> User:
    user = _find_user_for_login(db, identifier)

    if user is None:
        user = User(
            email=_build_ldap_user_email(identifier),
            full_name=identifier.strip(),
            password_hash=hash_password(secrets.token_urlsafe(24)),
            role=RoleEnum.RH_ANALISTA,
            is_active=True,
            last_login_at=None,
        )
        db.add(user)
        db.flush()
        return user

    user.email = _build_ldap_user_email(identifier)
    user.full_name = user.full_name or identifier.strip()
    user.is_active = True

    if user.role not in ADMIN_PORTAL_ROLES:
        user.role = RoleEnum.RH_ANALISTA

    return user


def _serialize_user(user: User) -> AuthUserResponse:
    return AuthUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        last_login_at=user.last_login_at,
    )


@router.post("/login", response_model=LoginResponse)
def login_admin(
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> LoginResponse:
    identifier = payload.identifier
    user = None

    if settings.ldap_enabled:
        try:
            authenticate_ldap_user(identifier, payload.password)
            user = _ensure_ldap_admin_user(db, identifier)
        except LdapConfigurationError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LDAP authentication is not configured correctly",
            ) from exc
        except LdapAuthenticationError:
            user = None

    if user is None:
        user = _find_user_for_login(db, identifier)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        if not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

    if user.role not in ADMIN_PORTAL_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrative access required")

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user.last_login_at = datetime.now(UTC)
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action=AuditActionEnum.LOGIN,
            entity_name="user",
            entity_id=str(user.id),
            description="Administrative login successful.",
            details_json=json.dumps({"email": user.email, "role": user.role.value}),
            ip_address="127.0.0.1",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()
    db.refresh(user)

    return LoginResponse(
        access_token=create_access_token(subject=user.email, role=user.role.value),
        user=_serialize_user(user),
    )


@router.get("/me", response_model=AdminSessionResponse)
def read_admin_session(
    user: Annotated[User, Depends(get_current_admin_user)],
) -> AdminSessionResponse:
    return AdminSessionResponse(user=_serialize_user(user))
