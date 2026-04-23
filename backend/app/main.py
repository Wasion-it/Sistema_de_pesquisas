import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.core.config import settings
from app.db.session import create_tables
from app.db.session import SessionLocal
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
            logger.warning("LDAP startup sync skipped: %s", exc)


@app.get("/", tags=["root"])
def read_root() -> dict[str, str]:
    return {"message": "Sistema de Recursos Humanos API"}


app.include_router(v1_router, prefix=settings.api_v1_prefix)
