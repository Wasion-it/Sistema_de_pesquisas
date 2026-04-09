from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, Enum, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.models.enums import QuestionTypeEnum

if TYPE_CHECKING:
    from app.models.question_option import QuestionOption
    from app.models.response_item import ResponseItem
    from app.models.survey_dimension import SurveyDimension
    from app.models.survey_version import SurveyVersion


class SurveyQuestion(BaseModel):
    __tablename__ = "survey_questions"
    __table_args__ = (
        UniqueConstraint("survey_version_id", "code", name="uq_survey_questions_version_code"),
        UniqueConstraint("survey_version_id", "display_order", name="uq_survey_questions_version_order"),
        CheckConstraint("scale_min <= scale_max", name="ck_survey_questions_scale_bounds"),
        Index("ix_survey_questions_survey_version_id", "survey_version_id"),
        Index("ix_survey_questions_dimension_id", "dimension_id"),
        Index("ix_survey_questions_question_type", "question_type"),
    )

    survey_version_id: Mapped[int] = mapped_column(ForeignKey("survey_versions.id", ondelete="CASCADE"), nullable=False)
    dimension_id: Mapped[Optional[int]] = mapped_column(ForeignKey("survey_dimensions.id", ondelete="SET NULL"), nullable=True)
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    help_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    question_type: Mapped[QuestionTypeEnum] = mapped_column(
        Enum(QuestionTypeEnum, native_enum=False, length=20),
        nullable=False,
    )
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    scale_min: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    scale_max: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    score_weight: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_negative: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    allow_comment: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    survey_version = relationship("SurveyVersion", back_populates="questions")
    dimension = relationship("SurveyDimension", back_populates="questions")
    options = relationship("QuestionOption", back_populates="question")
    response_items = relationship("ResponseItem", back_populates="question")
