from __future__ import annotations

import json
import secrets
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_portal_user
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import AuditActionEnum, AuditLog, RoleEnum, User
from app.models.enums import AuthenticationSourceEnum
from app.schemas.admin import AccessGrantResponse
from app.schemas.auth import AdminSessionResponse, AuthUserResponse, LoginRequest, LoginResponse
from app.services.access_control import get_active_access_grants, has_portal_access
from app.services.ldap_auth import LdapAuthenticationError, LdapConfigurationError, authenticate_ldap_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",", maxsplit=1)[0].strip() or None

    return request.client.host if request.client else None


def _record_login_audit(
    db: Session,
    *,
    request: Request,
    actor_user_id: int | None,
    entity_id: str,
    description: str,
    details: dict[str, str],
) -> None:
    db.add(
        AuditLog(
            actor_user_id=actor_user_id,
            action=AuditActionEnum.LOGIN,
            entity_name="user",
            entity_id=entity_id,
            description=description,
            details_json=json.dumps(details),
            ip_address=_get_client_ip(request),
            created_at=datetime.now(UTC),
        )
    )


def _find_user_for_login(db: Session, identifier: str) -> User | None:
    normalized_identifier = identifier.strip().lower()
    if not normalized_identifier:
        return None

    if "@" in normalized_identifier:
        return db.scalar(
            select(User)
            .where(func.lower(User.email) == normalized_identifier)
            .order_by(User.id.asc())
        )

    users = db.scalars(
        select(User)
        .where(
            or_(
                func.lower(User.email) == normalized_identifier,
                func.lower(User.email).like(f"{normalized_identifier}@%"),
            )
        )
        .order_by(User.id.asc())
    ).all()

    if len(users) == 1:
        return users[0]

    return None


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
            role=RoleEnum.COLABORADOR,
            auth_source=AuthenticationSourceEnum.LDAP,
            is_active=True,
            last_login_at=None,
        )
        db.add(user)
        db.flush()
        return user

    user.email = _build_ldap_user_email(identifier)
    user.full_name = user.full_name or identifier.strip()
    user.is_active = True
    user.auth_source = AuthenticationSourceEnum.LDAP

    return user


def _serialize_user(user: User) -> AuthUserResponse:
    access_grants = [
        AccessGrantResponse(
            module=grant.module,
            access_level=grant.access_level,
            granted_at=grant.granted_at,
            expires_at=grant.expires_at,
            is_active=grant.is_active,
            note=grant.note,
        )
        for grant in user.access_grants
    ]

    return AuthUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        auth_source=user.auth_source,
        last_login_at=user.last_login_at,
        access_grants=access_grants,
    )


@router.post("/login", response_model=LoginResponse)
def login_admin(
    payload: LoginRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> LoginResponse:
    identifier = payload.identifier
    normalized_identifier = identifier.strip().lower()
    user = None
    ldap_authenticated = False

    if settings.ldap_enabled:
        try:
            authenticate_ldap_user(identifier, payload.password)
            user = _ensure_ldap_admin_user(db, identifier)
            ldap_authenticated = True
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
            _record_login_audit(
                db,
                request=request,
                actor_user_id=None,
                entity_id=normalized_identifier or "unknown",
                description="Administrative login failed.",
                details={"identifier": normalized_identifier or "unknown", "result": "invalid_credentials"},
            )
            db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        if not verify_password(payload.password, user.password_hash):
            _record_login_audit(
                db,
                request=request,
                actor_user_id=user.id,
                entity_id=str(user.id),
                description="Administrative login failed.",
                details={"email": user.email, "result": "invalid_credentials"},
            )
            db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

    if not has_portal_access(db, user):
        if ldap_authenticated:
            db.commit()
        else:
            db.rollback()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso Negado")

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user.last_login_at = datetime.now(UTC)
    _record_login_audit(
        db,
        request=request,
        actor_user_id=user.id,
        entity_id=str(user.id),
        description="Administrative login successful.",
        details={"email": user.email, "role": user.role.value, "result": "success"},
    )
    db.commit()
    db.refresh(user)

    return LoginResponse(
        access_token=create_access_token(subject=user.email, role=user.role.value),
        user=_serialize_user(user),
    )


@router.get("/me", response_model=AdminSessionResponse)
def read_admin_session(
    user: Annotated[User, Depends(get_current_portal_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdminSessionResponse:
    user.access_grants = get_active_access_grants(db, user.id)
    return AdminSessionResponse(user=_serialize_user(user))
