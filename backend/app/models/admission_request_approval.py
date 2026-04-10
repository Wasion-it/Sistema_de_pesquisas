from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.models.enums import ApprovalRoleEnum, ApprovalStepStatusEnum

if TYPE_CHECKING:
    from app.models.approval_workflow_step import ApprovalWorkflowStep
    from app.models.admission_request import AdmissionRequest
    from app.models.user import User


class AdmissionRequestApproval(BaseModel):
    __tablename__ = "admission_request_approvals"
    __table_args__ = (
        Index("ix_admission_request_approvals_admission_request_id", "admission_request_id"),
        Index("ix_admission_request_approvals_status", "status"),
        Index("ix_admission_request_approvals_step_order", "step_order"),
    )

    admission_request_id: Mapped[int] = mapped_column(
        ForeignKey("admission_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    workflow_step_id: Mapped[int | None] = mapped_column(
        ForeignKey("approval_workflow_steps.id", ondelete="SET NULL"),
        nullable=True,
    )
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    approver_role: Mapped[ApprovalRoleEnum] = mapped_column(
        Enum(ApprovalRoleEnum, native_enum=False, length=30),
        nullable=False,
    )
    status: Mapped[ApprovalStepStatusEnum] = mapped_column(
        Enum(ApprovalStepStatusEnum, native_enum=False, length=20),
        nullable=False,
        default=ApprovalStepStatusEnum.PENDING,
    )
    assigned_to_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decided_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    request = relationship("AdmissionRequest", back_populates="approval_steps")
    workflow_step = relationship("ApprovalWorkflowStep")
    assigned_to_user = relationship("User", foreign_keys=[assigned_to_user_id])
    decided_by_user = relationship("User", foreign_keys=[decided_by_user_id])