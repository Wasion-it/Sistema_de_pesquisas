from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.models.enums import ResponseStatusEnum


class Response(BaseModel):
    __tablename__ = "responses"
    __table_args__ = (
        UniqueConstraint("campaign_id", "employee_id", name="uq_responses_campaign_employee"),
        UniqueConstraint("campaign_audience_id", name="uq_responses_campaign_audience_id"),
        Index("ix_responses_status", "status"),
        Index("ix_responses_campaign_id", "campaign_id"),
        Index("ix_responses_employee_id", "employee_id"),
    )

    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    campaign_audience_id: Mapped[int] = mapped_column(ForeignKey("campaign_audiences.id", ondelete="CASCADE"), nullable=False)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[ResponseStatusEnum] = mapped_column(
        Enum(ResponseStatusEnum, native_enum=False, length=20),
        nullable=False,
        default=ResponseStatusEnum.DRAFT,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_anonymous_snapshot: Mapped[bool] = mapped_column(Boolean, nullable=False)
    submission_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    campaign = relationship("Campaign", back_populates="responses")
    campaign_audience = relationship("CampaignAudience", back_populates="response")
    employee = relationship("Employee", back_populates="responses")
    items = relationship("ResponseItem", back_populates="response")
