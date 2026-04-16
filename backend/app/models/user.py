from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.models.enums import RoleEnum

if TYPE_CHECKING:
    from app.models.audit_log import AuditLog
    from app.models.admission_request import AdmissionRequest
    from app.models.dismissal_request import DismissalRequest
    from app.models.campaign import Campaign
    from app.models.employee import Employee


class User(BaseModel):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_role", "role"),
        Index("ix_users_is_active", "is_active"),
    )

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[RoleEnum] = mapped_column(
        Enum(RoleEnum, native_enum=False, length=30),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    employee = relationship("Employee", back_populates="user", uselist=False)
    created_campaigns = relationship("Campaign", back_populates="created_by_user")
    audit_logs = relationship("AuditLog", back_populates="actor_user")
    admission_requests = relationship(
        "AdmissionRequest",
        back_populates="created_by_user",
        foreign_keys="AdmissionRequest.created_by_user_id",
    )
    dismissal_requests = relationship("DismissalRequest", back_populates="created_by_user")
