from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.models.enums import AccessLevelEnum, AccessModuleEnum


class UserModuleAccess(BaseModel):
    __tablename__ = "user_module_access"
    __table_args__ = (
        UniqueConstraint("user_id", "module", name="uq_user_module_access_user_module"),
        Index("ix_user_module_access_user_id", "user_id"),
        Index("ix_user_module_access_module", "module"),
        Index("ix_user_module_access_is_active", "is_active"),
    )

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    module: Mapped[AccessModuleEnum] = mapped_column(
        Enum(AccessModuleEnum, native_enum=False, length=40),
        nullable=False,
    )
    access_level: Mapped[AccessLevelEnum] = mapped_column(
        Enum(AccessLevelEnum, native_enum=False, length=20),
        nullable=False,
        default=AccessLevelEnum.READ,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    granted_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    user = relationship("User", back_populates="access_grants", foreign_keys=[user_id])
    granted_by_user = relationship("User", foreign_keys=[granted_by_user_id])