from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.models.enums import ApprovalOriginGroupEnum, ApprovalRequestKindEnum

if TYPE_CHECKING:
    from app.models.admission_request import AdmissionRequest
    from app.models.dismissal_request import DismissalRequest
    from app.models.approval_workflow_step import ApprovalWorkflowStep


class ApprovalWorkflowTemplate(BaseModel):
    __tablename__ = "approval_workflow_templates"
    __table_args__ = (
        Index("ix_approval_workflow_templates_request_kind", "request_kind"),
        Index("ix_approval_workflow_templates_origin_group", "origin_group"),
        Index("ix_approval_workflow_templates_is_active", "is_active"),
    )

    code: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    request_kind: Mapped[ApprovalRequestKindEnum] = mapped_column(
        Enum(ApprovalRequestKindEnum, native_enum=False, length=20),
        nullable=False,
    )
    origin_group: Mapped[ApprovalOriginGroupEnum] = mapped_column(
        Enum(ApprovalOriginGroupEnum, native_enum=False, length=30),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    steps = relationship(
        "ApprovalWorkflowStep",
        back_populates="workflow_template",
        cascade="all, delete-orphan",
        order_by="ApprovalWorkflowStep.step_order",
    )
    admission_requests = relationship("AdmissionRequest", back_populates="approval_workflow_template")
    dismissal_requests = relationship("DismissalRequest", back_populates="approval_workflow_template")