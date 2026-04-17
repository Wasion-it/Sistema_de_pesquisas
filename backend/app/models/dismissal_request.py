from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.models.enums import (
    ContractRegimeEnum,
    DismissalRequestStatusEnum,
    DismissalRequestTypeEnum,
)

if TYPE_CHECKING:
    from app.models.approval_workflow_template import ApprovalWorkflowTemplate
    from app.models.dismissal_request_approval import DismissalRequestApproval
    from app.models.user import User


class DismissalRequest(BaseModel):
    __tablename__ = "dismissal_requests"
    __table_args__ = (
        Index("ix_dismissal_requests_status", "status"),
        Index("ix_dismissal_requests_type", "dismissal_type"),
        Index("ix_dismissal_requests_created_by_user_id", "created_by_user_id"),
        Index("ix_dismissal_requests_estimated_termination_date", "estimated_termination_date"),
    )

    status: Mapped[DismissalRequestStatusEnum] = mapped_column(
        Enum(DismissalRequestStatusEnum, native_enum=False, length=20),
        nullable=False,
        default=DismissalRequestStatusEnum.PENDING,
    )
    dismissal_type: Mapped[DismissalRequestTypeEnum] = mapped_column(
        Enum(DismissalRequestTypeEnum, native_enum=False, length=30),
        nullable=False,
    )
    employee_name: Mapped[str] = mapped_column(String(150), nullable=False)
    cargo: Mapped[str] = mapped_column(String(150), nullable=False)
    departamento: Mapped[str] = mapped_column(String(150), nullable=False)
    has_replacement: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    can_be_rehired: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    rehire_justification: Mapped[str | None] = mapped_column(Text, nullable=True)
    recruiter_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    post_approval_rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    post_approval_rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    estimated_termination_date: Mapped[date] = mapped_column(Date, nullable=False)
    contract_regime: Mapped[ContractRegimeEnum] = mapped_column(
        Enum(ContractRegimeEnum, native_enum=False, length=20),
        nullable=False,
    )
    manager_reminder: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approval_workflow_template_id: Mapped[int | None] = mapped_column(
        ForeignKey("approval_workflow_templates.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_by_user = relationship("User", back_populates="dismissal_requests")
    recruiter_user = relationship("User", foreign_keys=[recruiter_user_id])
    approval_workflow_template = relationship("ApprovalWorkflowTemplate", back_populates="dismissal_requests")
    approval_steps = relationship(
        "DismissalRequestApproval",
        back_populates="request",
        cascade="all, delete-orphan",
        order_by="DismissalRequestApproval.step_order",
    )