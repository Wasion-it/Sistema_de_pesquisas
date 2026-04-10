from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.models.enums import ApprovalRoleEnum

if TYPE_CHECKING:
    from app.models.approval_workflow_template import ApprovalWorkflowTemplate


class ApprovalWorkflowStep(BaseModel):
    __tablename__ = "approval_workflow_steps"
    __table_args__ = (
        Index("ix_approval_workflow_steps_workflow_template_id", "workflow_template_id"),
        Index("ix_approval_workflow_steps_step_order", "step_order"),
    )

    workflow_template_id: Mapped[int] = mapped_column(
        ForeignKey("approval_workflow_templates.id", ondelete="CASCADE"),
        nullable=False,
    )
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    approver_role: Mapped[ApprovalRoleEnum] = mapped_column(
        Enum(ApprovalRoleEnum, native_enum=False, length=30),
        nullable=False,
    )
    approver_label: Mapped[str] = mapped_column(String(150), nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    workflow_template = relationship("ApprovalWorkflowTemplate", back_populates="steps")