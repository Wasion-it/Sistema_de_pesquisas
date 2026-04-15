from __future__ import annotations

from sqlalchemy import Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel


class AdmissionChecklistStep(BaseModel):
    __tablename__ = "admission_checklist_steps"
    __table_args__ = (
        Index("ix_admission_checklist_steps_step_order", "step_order"),
    )

    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)