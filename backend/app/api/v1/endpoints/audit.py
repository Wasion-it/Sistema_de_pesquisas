from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_portal_user
from app.db.session import get_db
from app.models import AuditActionEnum, AuditLog, RoleEnum, User
from app.schemas.admin import AuditLogActorResponse, AuditLogListResponse, AuditLogResponse

router = APIRouter(prefix="/admin/audit-logs", tags=["audit-logs"])


def _parse_details(value: str | None):
    if not value:
        return None

    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def _serialize_audit_log(item: AuditLog) -> AuditLogResponse:
    actor = item.actor_user

    return AuditLogResponse(
        id=item.id,
        actor_user_id=item.actor_user_id,
        actor_user=AuditLogActorResponse(
            id=actor.id,
            full_name=actor.full_name,
            email=actor.email,
            role=actor.role,
        )
        if actor
        else None,
        action=item.action,
        entity_name=item.entity_name,
        entity_id=item.entity_id,
        description=item.description,
        details=_parse_details(item.details_json),
        ip_address=item.ip_address,
        created_at=item.created_at,
    )


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    user: Annotated[User, Depends(get_current_portal_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=1000)] = 250,
    offset: Annotated[int, Query(ge=0)] = 0,
    action: AuditActionEnum | None = None,
    entity_name: str | None = Query(default=None, max_length=120),
    query: str | None = Query(default=None, max_length=120),
) -> AuditLogListResponse:
    if user.role != RoleEnum.RH_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso Negado")

    filters = []

    if action is not None:
        filters.append(AuditLog.action == action)

    if entity_name:
        filters.append(AuditLog.entity_name.ilike(f"%{entity_name.strip()}%"))

    should_join_user = False
    if query:
        q = f"%{query.strip()}%"
        should_join_user = True
        filters.append(
            or_(
                AuditLog.entity_name.ilike(q),
                AuditLog.entity_id.ilike(q),
                AuditLog.description.ilike(q),
                AuditLog.details_json.ilike(q),
                User.full_name.ilike(q),
                User.email.ilike(q),
            )
        )

    total_stmt = select(func.count(AuditLog.id))
    list_stmt = select(AuditLog).options(selectinload(AuditLog.actor_user))

    if should_join_user:
        total_stmt = total_stmt.outerjoin(User, AuditLog.actor_user_id == User.id)
        list_stmt = list_stmt.outerjoin(User, AuditLog.actor_user_id == User.id)

    for condition in filters:
        total_stmt = total_stmt.where(condition)
        list_stmt = list_stmt.where(condition)

    total = db.scalar(total_stmt) or 0
    items = db.scalars(
        list_stmt
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    return AuditLogListResponse(
        items=[_serialize_audit_log(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )
