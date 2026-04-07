from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.models.enums import CampaignAudienceStatusEnum

if TYPE_CHECKING:
    from app.models.campaign import Campaign
    from app.models.employee import Employee
    from app.models.response import Response


class CampaignAudience(BaseModel):
    __tablename__ = "campaign_audiences"
    __table_args__ = (
        UniqueConstraint("campaign_id", "employee_id", name="uq_campaign_audiences_campaign_employee"),
        Index("ix_campaign_audiences_campaign_id", "campaign_id"),
        Index("ix_campaign_audiences_employee_id", "employee_id"),
        Index("ix_campaign_audiences_status", "status"),
    )

    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False)
    employee_name_snapshot: Mapped[str] = mapped_column(String(150), nullable=False)
    work_email_snapshot: Mapped[str] = mapped_column(String(255), nullable=False)
    department_name_snapshot: Mapped[str] = mapped_column(String(120), nullable=False)
    job_title_name_snapshot: Mapped[str] = mapped_column(String(120), nullable=False)
    manager_name_snapshot: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    status: Mapped[CampaignAudienceStatusEnum] = mapped_column(
        Enum(CampaignAudienceStatusEnum, native_enum=False, length=20),
        nullable=False,
        default=CampaignAudienceStatusEnum.PENDING,
    )
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    campaign = relationship("Campaign", back_populates="audiences")
    employee = relationship("Employee", back_populates="campaign_audiences")
    response = relationship("Response", back_populates="campaign_audience", uselist=False)
