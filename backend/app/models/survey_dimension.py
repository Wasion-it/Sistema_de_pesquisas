from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.models.survey import Survey
    from app.models.survey_question import SurveyQuestion


class SurveyDimension(BaseModel):
    __tablename__ = "survey_dimensions"
    __table_args__ = (
        UniqueConstraint("survey_id", "name", name="uq_survey_dimensions_survey_name"),
        UniqueConstraint("survey_id", "code", name="uq_survey_dimensions_survey_code"),
        Index("ix_survey_dimensions_survey_id", "survey_id"),
        Index("ix_survey_dimensions_display_order", "display_order"),
    )

    survey_id: Mapped[int] = mapped_column(ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(String(60), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    survey = relationship("Survey", back_populates="dimensions")
    questions = relationship("SurveyQuestion", back_populates="dimension")
