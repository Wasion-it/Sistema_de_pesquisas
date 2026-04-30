from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.models.admission_request import AdmissionRequest


class AdmissionRequestSalary(BaseModel):
    __tablename__ = "admission_request_salaries"
    __table_args__ = (
        Index("ix_admission_request_salaries_admission_request_id", "admission_request_id", unique=True),
    )

    admission_request_id: Mapped[int] = mapped_column(
        ForeignKey("admission_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    salary_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="BRL")

    request: Mapped[AdmissionRequest] = relationship("AdmissionRequest", back_populates="salary_info")
