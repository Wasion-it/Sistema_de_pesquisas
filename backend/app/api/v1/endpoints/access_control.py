from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_portal_user
from app.core.config import settings
from app.db.session import get_db
from app.models import RoleEnum, User
from app.models.enums import AccessModuleEnum, AuthenticationSourceEnum
from app.schemas.admin import (
    AccessControlUpdateRequest,
    AccessControlUserListResponse,
    AccessControlUserResponse,
    AccessGrantResponse,
)
from app.services.access_control import get_active_access_grants, has_module_access, upsert_access_grants
from app.services.ldap_auth import sync_directory_users_from_ou

router = APIRouter(prefix="/admin/access-control", tags=["access-control"])


def _serialize_user(user: User, session: Session) -> AccessControlUserResponse:
    grants = get_active_access_grants(session, user.id)
    return AccessControlUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        auth_source=user.auth_source,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        access_grants=[
            AccessGrantResponse(
                module=grant.module,
                access_level=grant.access_level,
                granted_at=grant.granted_at,
                expires_at=grant.expires_at,
                is_active=grant.is_active,
                note=grant.note,
            )
            for grant in grants
        ],
    )


@router.get("/users", response_model=AccessControlUserListResponse)
def list_access_control_users(
    user: Annotated[User, Depends(get_current_portal_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AccessControlUserListResponse:
    if user.role != RoleEnum.RH_ADMIN and not has_module_access(db, user, AccessModuleEnum.ACCESS_CONTROL):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrative access required")

    if settings.ldap_enabled and settings.ldap_user_base_dn:
        sync_directory_users_from_ou(db)
        db.commit()

    users = db.scalars(
        select(User)
        .where(User.auth_source == AuthenticationSourceEnum.LDAP)
        .order_by(User.full_name.asc(), User.email.asc())
    ).all()

    return AccessControlUserListResponse(items=[_serialize_user(item, db) for item in users])


@router.put("/users/{user_id}", response_model=AccessControlUserResponse)
def update_access_control_user(
    user_id: int,
    payload: AccessControlUpdateRequest,
    user: Annotated[User, Depends(get_current_portal_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AccessControlUserResponse:
    if user.role != RoleEnum.RH_ADMIN and not has_module_access(db, user, AccessModuleEnum.ACCESS_CONTROL):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrative access required")

    target_user = db.scalar(select(User).where(User.id == user_id))
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    grants_payload = [
        (
            grant.module,
            grant.access_level,
            grant.expires_at,
            grant.note,
        )
        for grant in payload.grants
    ]

    upsert_access_grants(db, user=target_user, grants_payload=grants_payload, granted_by_user=user)
    db.commit()
    db.refresh(target_user)
    return _serialize_user(target_user, db)