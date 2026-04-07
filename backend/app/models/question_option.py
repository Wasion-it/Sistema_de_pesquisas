from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.models.response_item import ResponseItem
    from app.models.survey_question import SurveyQuestion


class QuestionOption(BaseModel):
    __tablename__ = "question_options"
    __table_args__ = (
        UniqueConstraint("question_id", "value", name="uq_question_options_question_value"),
        UniqueConstraint("question_id", "display_order", name="uq_question_options_question_order"),
        Index("ix_question_options_question_id", "question_id"),
    )

    question_id: Mapped[int] = mapped_column(ForeignKey("survey_questions.id", ondelete="CASCADE"), nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    value: Mapped[str] = mapped_column(String(60), nullable=False)
    score_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    question = relationship("SurveyQuestion", back_populates="options")
    response_items = relationship("ResponseItem", back_populates="selected_option")
