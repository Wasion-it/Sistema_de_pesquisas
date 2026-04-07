from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.models.employee import Employee


class Department(BaseModel):
    __tablename__ = "departments"
    __table_args__ = (
        UniqueConstraint("code", name="uq_departments_code"),
        UniqueConstraint("name", name="uq_departments_name"),
        Index("ix_departments_is_active", "is_active"),
    )

    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    employees = relationship("Employee", back_populates="department")
