from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import ADMIN_PORTAL_ROLES, REQUEST_CREATOR_ROLES
from app.models import AccessLevelEnum, AccessModuleEnum, RoleEnum, User, UserModuleAccess


def _is_grant_active(grant: UserModuleAccess) -> bool:
    if not grant.is_active:
        return False

    if grant.expires_at is None:
        return True

    return grant.expires_at > datetime.now(UTC)


def get_active_access_grants(session: Session, user_id: int) -> list[UserModuleAccess]:
    grants = session.scalars(
        select(UserModuleAccess)
        .where(UserModuleAccess.user_id == user_id)
        .order_by(UserModuleAccess.module.asc())
    ).all()
    return [grant for grant in grants if _is_grant_active(grant)]


def has_portal_access(session: Session, user: User) -> bool:
    if user.role == RoleEnum.COLABORADOR:
        return False

    if user.role in ADMIN_PORTAL_ROLES or user.role in REQUEST_CREATOR_ROLES:
        return True

    if user.role == RoleEnum.RH_PESQUISAS:
        return True

    return bool(get_active_access_grants(session, user.id))


def has_module_access(session: Session, user: User, module: AccessModuleEnum) -> bool:
    if user.role in ADMIN_PORTAL_ROLES:
        return True

    if user.role == RoleEnum.RH_PESQUISAS:
        return module == AccessModuleEnum.SURVEYS

    return any(grant.module == module for grant in get_active_access_grants(session, user.id))


def upsert_access_grants(
    session: Session,
    *,
    user: User,
    grants_payload: list[tuple[AccessModuleEnum, AccessLevelEnum, datetime | None, str | None]],
    granted_by_user: User,
) -> list[UserModuleAccess]:
    existing_grants = {
        grant.module: grant
        for grant in session.scalars(select(UserModuleAccess).where(UserModuleAccess.user_id == user.id)).all()
    }
    requested_modules = {module for module, _, _, _ in grants_payload}
    now = datetime.now(UTC)

    for module, access_level, expires_at, note in grants_payload:
        grant = existing_grants.get(module)
        if grant is None:
            session.add(
                UserModuleAccess(
                    user_id=user.id,
                    module=module,
                    access_level=access_level,
                    is_active=True,
                    granted_by_user_id=granted_by_user.id,
                    granted_at=now,
                    expires_at=expires_at,
                    note=note,
                )
            )
            continue

        grant.access_level = access_level
        grant.is_active = True
        grant.granted_by_user_id = granted_by_user.id
        grant.granted_at = now
        grant.expires_at = expires_at
        grant.note = note

    for module, grant in existing_grants.items():
        if module not in requested_modules:
            grant.is_active = False

    session.flush()
    return get_active_access_grants(session, user.id)
