from datetime import date
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.models.enums import EmployeeStatusEnum

if TYPE_CHECKING:
    from app.models.campaign_audience import CampaignAudience
    from app.models.department import Department
    from app.models.job_title import JobTitle
    from app.models.response import Response
    from app.models.user import User


class Employee(BaseModel):
    __tablename__ = "employees"
    __table_args__ = (
        UniqueConstraint("employee_code", name="uq_employees_employee_code"),
        UniqueConstraint("user_id", name="uq_employees_user_id"),
        UniqueConstraint("work_email", name="uq_employees_work_email"),
        Index("ix_employees_department_id", "department_id"),
        Index("ix_employees_job_title_id", "job_title_id"),
        Index("ix_employees_manager_id", "manager_id"),
        Index("ix_employees_status", "status"),
    )

    employee_code: Mapped[str] = mapped_column(String(50), nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    job_title_id: Mapped[int] = mapped_column(ForeignKey("job_titles.id", ondelete="RESTRICT"), nullable=False)
    manager_id: Mapped[Optional[int]] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    work_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    personal_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    hire_date: Mapped[Optional[date]] = mapped_column(nullable=True)
    status: Mapped[EmployeeStatusEnum] = mapped_column(
        Enum(EmployeeStatusEnum, native_enum=False, length=20),
        nullable=False,
        default=EmployeeStatusEnum.ACTIVE,
    )

    user = relationship("User", back_populates="employee")
    department = relationship("Department", back_populates="employees")
    job_title = relationship("JobTitle", back_populates="employees")
    manager = relationship("Employee", remote_side="Employee.id", back_populates="direct_reports")
    direct_reports = relationship("Employee", back_populates="manager")
    campaign_audiences = relationship("CampaignAudience", back_populates="employee")
    responses = relationship("Response", back_populates="employee")
