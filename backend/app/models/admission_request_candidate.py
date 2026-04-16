from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.models.admission_request import AdmissionRequest
    from app.models.department import Department
    from app.models.employee import Employee
    from app.models.job_title import JobTitle


class AdmissionRequestCandidate(BaseModel):
    __tablename__ = "admission_request_candidates"
    __table_args__ = (
        UniqueConstraint("admission_request_id", "employee_code", name="uq_admission_request_candidates_employee_code"),
        UniqueConstraint("admission_request_id", "work_email", name="uq_admission_request_candidates_work_email"),
        Index("ix_admission_request_candidates_request_id", "admission_request_id"),
        Index("ix_admission_request_candidates_is_hired", "is_hired"),
    )

    admission_request_id: Mapped[int] = mapped_column(
        ForeignKey("admission_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
    )
    job_title_id: Mapped[int] = mapped_column(
        ForeignKey("job_titles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    employee_code: Mapped[str] = mapped_column(String(50), nullable=False)
    work_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    personal_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hire_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_hired: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    request = relationship("AdmissionRequest", back_populates="candidates")
    employee = relationship("Employee")
    department = relationship("Department")
    job_title = relationship("JobTitle")