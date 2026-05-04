from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_portal_user
from app.core.config import settings
from app.db.session import get_db
from app.models import AuditActionEnum, AuditLog, RoleEnum, User
from app.models.enums import AuthenticationSourceEnum
from app.schemas.admin import (
    AccessControlUpdateRequest,
    AccessControlUserListResponse,
    AccessControlUserResponse,
)
from app.services.access_control import has_module_access
from app.services.ldap_auth import LdapAuthenticationError, LdapConfigurationError, sync_directory_users_from_ou

router = APIRouter(prefix="/admin/access-control", tags=["access-control"])
logger = logging.getLogger(__name__)


def _get_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",", maxsplit=1)[0].strip() or None

    return request.client.host if request.client else None


def _serialize_user(user: User, session: Session) -> AccessControlUserResponse:
    return AccessControlUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        auth_source=user.auth_source,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        access_grants=[],
    )


@router.get("/users", response_model=AccessControlUserListResponse)
def list_access_control_users(
    user: Annotated[User, Depends(get_current_portal_user)],
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> AccessControlUserListResponse:
    if user.role != RoleEnum.RH_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso Negado")

    if settings.ldap_enabled and settings.ldap_user_base_dn:
        try:
            sync_directory_users_from_ou(db)
            db.add(
                AuditLog(
                    actor_user_id=user.id,
                    action=AuditActionEnum.UPDATE,
                    entity_name="ldap_users",
                    entity_id="sync",
                    description="LDAP users synchronized from access control.",
                    details_json=json.dumps({"ldap_user_base_dn": settings.ldap_user_base_dn}),
                    ip_address=_get_client_ip(request),
                    created_at=datetime.now(UTC),
                )
            )
            db.commit()
        except (LdapAuthenticationError, LdapConfigurationError) as exc:
            db.rollback()
            logger.exception("LDAP synchronization failed from access control")
            db.add(
                AuditLog(
                    actor_user_id=user.id,
                    action=AuditActionEnum.UPDATE,
                    entity_name="ldap_users",
                    entity_id="sync_failed",
                    description="LDAP synchronization failed from access control.",
                    details_json=json.dumps(
                        {
                            "ldap_user_base_dn": settings.ldap_user_base_dn,
                            "error_type": exc.__class__.__name__,
                            "error_message": str(exc),
                        }
                    ),
                    ip_address=_get_client_ip(request),
                    created_at=datetime.now(UTC),
                )
            )
            db.commit()

    users = db.scalars(
        select(User)
        .where(User.auth_source == AuthenticationSourceEnum.LDAP)
        .where(User.is_active.is_(True))
        .order_by(User.full_name.asc(), User.email.asc())
    ).all()

    return AccessControlUserListResponse(items=[_serialize_user(item, db) for item in users])


@router.put("/users/{user_id}", response_model=AccessControlUserResponse)
def update_access_control_user(
    user_id: int,
    payload: AccessControlUpdateRequest,
    user: Annotated[User, Depends(get_current_portal_user)],
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> AccessControlUserResponse:
    if user.role != RoleEnum.RH_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso Negado")

    target_user = db.scalar(select(User).where(User.id == user_id))
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    previous_role = target_user.role
    if payload.role is not None:
        target_user.role = payload.role
        if previous_role != target_user.role:
            db.add(
                AuditLog(
                    actor_user_id=user.id,
                    action=AuditActionEnum.UPDATE,
                    entity_name="user_access",
                    entity_id=str(target_user.id),
                    description="User portal role updated from access control.",
                    details_json=json.dumps(
                        {
                            "target_user_id": target_user.id,
                            "target_email": target_user.email,
                            "previous_role": previous_role.value,
                            "new_role": target_user.role.value,
                        }
                    ),
                    ip_address=_get_client_ip(request),
                    created_at=datetime.now(UTC),
                )
            )
    db.commit()
    db.refresh(target_user)
    return _serialize_user(target_user, db)
