import json
import logging
from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.core.config import settings
from app.db.session import create_tables
from app.db.session import SessionLocal
from app.models import AuditActionEnum, AuditLog
from app.services.ldap_auth import LdapAuthenticationError, LdapConfigurationError, sync_directory_users_from_ou

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    debug=settings.debug,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    create_tables()

    if settings.ldap_enabled and settings.ldap_user_base_dn:
        try:
            with SessionLocal() as session:
                sync_directory_users_from_ou(session)
                session.commit()
        except (LdapAuthenticationError, LdapConfigurationError) as exc:
            logger.exception("LDAP startup sync failed")
            with SessionLocal() as session:
                session.add(
                    AuditLog(
                        actor_user_id=None,
                        action=AuditActionEnum.UPDATE,
                        entity_name="ldap_users",
                        entity_id="startup_sync_failed",
                        description="LDAP startup synchronization failed.",
                        details_json=json.dumps(
                            {
                                "ldap_user_base_dn": settings.ldap_user_base_dn,
                                "error_type": exc.__class__.__name__,
                                "error_message": str(exc),
                            }
                        ),
                        ip_address=None,
                        created_at=datetime.now(UTC),
                    )
                )
                session.commit()


@app.get("/", tags=["root"])
def read_root() -> dict[str, str]:
    return {"message": "Sistema de Recursos Humanos API"}


app.include_router(v1_router, prefix=settings.api_v1_prefix)
