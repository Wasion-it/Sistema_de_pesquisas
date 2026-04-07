from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.models.enums import CampaignStatusEnum

if TYPE_CHECKING:
    from app.models.campaign_audience import CampaignAudience
    from app.models.response import Response
    from app.models.survey_version import SurveyVersion
    from app.models.user import User


class Campaign(BaseModel):
    __tablename__ = "campaigns"
    __table_args__ = (
        UniqueConstraint("code", name="uq_campaigns_code"),
        CheckConstraint("start_at < end_at", name="ck_campaigns_period"),
        Index("ix_campaigns_status", "status"),
        Index("ix_campaigns_survey_version_id", "survey_version_id"),
        Index("ix_campaigns_period", "start_at", "end_at"),
    )

    survey_version_id: Mapped[int] = mapped_column(ForeignKey("survey_versions.id", ondelete="RESTRICT"), nullable=False)
    code: Mapped[str] = mapped_column(String(60), nullable=False)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[CampaignStatusEnum] = mapped_column(
        Enum(CampaignStatusEnum, native_enum=False, length=20),
        nullable=False,
        default=CampaignStatusEnum.DRAFT,
    )
    is_anonymous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    allows_draft: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)

    survey_version = relationship("SurveyVersion", back_populates="campaigns")
    created_by_user = relationship("User", back_populates="created_campaigns")
    audiences = relationship("CampaignAudience", back_populates="campaign")
    responses = relationship("Response", back_populates="campaign")
