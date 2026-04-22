from fastapi import APIRouter

from app.api.v1.endpoints.access_control import router as access_control_router
from app.api.v1.endpoints.admin import router as admin_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.public import router as public_router

router = APIRouter()

router.include_router(admin_router)
router.include_router(access_control_router)
router.include_router(auth_router)
router.include_router(health_router)
router.include_router(public_router)
