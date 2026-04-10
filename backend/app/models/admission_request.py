from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.models.enums import (
    AdmissionRequestStatusEnum,
    AdmissionRequestTypeEnum,
    ContractRegimeEnum,
    RecruitmentScopeEnum,
)

if TYPE_CHECKING:
    from app.models.user import User


class AdmissionRequest(BaseModel):
    __tablename__ = "admission_requests"
    __table_args__ = (
        Index("ix_admission_requests_status", "status"),
        Index("ix_admission_requests_type", "request_type"),
        Index("ix_admission_requests_created_by_user_id", "created_by_user_id"),
        Index("ix_admission_requests_submitted_at", "submitted_at"),
    )

    status: Mapped[AdmissionRequestStatusEnum] = mapped_column(
        Enum(AdmissionRequestStatusEnum, native_enum=False, length=20),
        nullable=False,
        default=AdmissionRequestStatusEnum.PENDING,
    )
    request_type: Mapped[AdmissionRequestTypeEnum] = mapped_column(
        Enum(AdmissionRequestTypeEnum, native_enum=False, length=20),
        nullable=False,
    )
    cargo: Mapped[str] = mapped_column(String(150), nullable=False)
    setor: Mapped[str] = mapped_column(String(150), nullable=False)
    recruitment_scope: Mapped[RecruitmentScopeEnum] = mapped_column(
        Enum(RecruitmentScopeEnum, native_enum=False, length=20),
        nullable=False,
    )
    quantity_people: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    turno: Mapped[str] = mapped_column(String(80), nullable=False)
    contract_regime: Mapped[ContractRegimeEnum] = mapped_column(
        Enum(ContractRegimeEnum, native_enum=False, length=20),
        nullable=False,
    )
    substituted_employee_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    justification: Mapped[str | None] = mapped_column(Text, nullable=True)
    manager_reminder: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)

    created_by_user = relationship("User", back_populates="admission_requests")