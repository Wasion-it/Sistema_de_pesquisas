from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.models.enums import SurveyVersionStatusEnum

if TYPE_CHECKING:
    from app.models.campaign import Campaign
    from app.models.survey import Survey
    from app.models.survey_question import SurveyQuestion


class SurveyVersion(BaseModel):
    __tablename__ = "survey_versions"
    __table_args__ = (
        UniqueConstraint("survey_id", "version_number", name="uq_survey_versions_survey_version"),
        Index("ix_survey_versions_survey_id", "survey_id"),
        Index("ix_survey_versions_status", "status"),
    )

    survey_id: Mapped[int] = mapped_column(ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[SurveyVersionStatusEnum] = mapped_column(
        Enum(SurveyVersionStatusEnum, native_enum=False, length=20),
        nullable=False,
        default=SurveyVersionStatusEnum.DRAFT,
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    survey = relationship("Survey", back_populates="versions")
    questions = relationship("SurveyQuestion", back_populates="survey_version")
    campaigns = relationship("Campaign", back_populates="survey_version")
