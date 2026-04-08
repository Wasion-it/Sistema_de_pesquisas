from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.models.survey_dimension import SurveyDimension
    from app.models.survey_version import SurveyVersion


class Survey(BaseModel):
    __tablename__ = "surveys"
    __table_args__ = (UniqueConstraint("code", name="uq_surveys_code"),)

    code: Mapped[str] = mapped_column(String(60), nullable=False)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(120), nullable=False, default="Personalizada")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    versions = relationship("SurveyVersion", back_populates="survey")
    dimensions = relationship("SurveyDimension", back_populates="survey")
