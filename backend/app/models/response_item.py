from typing import Optional

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel


class ResponseItem(BaseModel):
    __tablename__ = "response_items"
    __table_args__ = (
        UniqueConstraint("response_id", "question_id", name="uq_response_items_response_question"),
        CheckConstraint("numeric_answer >= 1 AND numeric_answer <= 5", name="ck_response_items_numeric_answer_range"),
        Index("ix_response_items_response_id", "response_id"),
        Index("ix_response_items_question_id", "question_id"),
    )

    response_id: Mapped[int] = mapped_column(ForeignKey("responses.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("survey_questions.id", ondelete="RESTRICT"), nullable=False)
    selected_option_id: Mapped[Optional[int]] = mapped_column(ForeignKey("question_options.id", ondelete="SET NULL"), nullable=True)
    numeric_answer: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    text_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    response = relationship("Response", back_populates="items")
    question = relationship("SurveyQuestion", back_populates="response_items")
    selected_option = relationship("QuestionOption", back_populates="response_items")
