from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user
from app.core.security import ADMIN_PORTAL_ROLES, create_access_token, verify_password
from app.db.session import get_db
from app.models import AuditActionEnum, AuditLog, User
from app.schemas.auth import AdminSessionResponse, AuthUserResponse, LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


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
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

    if user.role not in ADMIN_PORTAL_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrative access required")

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
