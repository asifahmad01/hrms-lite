from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import Date, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import DateTime

from app.db.base import Base

# ── Enums ──────────────────────────────────────────────────────────────────────

class EmploymentType(StrEnum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    CONTRACT  = "CONTRACT"
    INTERN    = "INTERN"


class EmployeeStatus(StrEnum):
    ACTIVE      = "ACTIVE"
    INACTIVE    = "INACTIVE"
    ON_LEAVE    = "ON_LEAVE"
    TERMINATED  = "TERMINATED"


# ── Model ──────────────────────────────────────────────────────────────────────

class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Previously "employee_id" — renamed to employee_code in v2
    employee_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # ── New fields (all nullable / have server_default for backward compat) ───
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    designation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    joining_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    manager_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)

    employment_type: Mapped[EmploymentType] = mapped_column(
        Enum(EmploymentType, name="employmenttype", create_type=True),
        nullable=False,
        server_default=EmploymentType.FULL_TIME.value,
    )
    status: Mapped[EmployeeStatus] = mapped_column(
        Enum(EmployeeStatus, name="employeestatus", create_type=True),
        nullable=False,
        server_default=EmployeeStatus.ACTIVE.value,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # One employee → many attendance records
    attendance_records: Mapped[list["Attendance"]] = relationship(  # noqa: F821
        "Attendance",
        back_populates="employee",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<Employee id={self.id} employee_code={self.employee_code!r}>"
