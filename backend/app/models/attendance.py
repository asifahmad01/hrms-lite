import enum
from datetime import date, datetime

from sqlalchemy import Date, Enum, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import DateTime

from app.db.base import Base


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (
        # DB-level guard: one record per employee per day
        UniqueConstraint("employee_fk", "date", name="uq_attendance_employee_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_fk: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Back-reference to the parent employee
    employee: Mapped["Employee"] = relationship(  # noqa: F821
        "Employee", back_populates="attendance_records"
    )

    def __repr__(self) -> str:
        return (
            f"<Attendance id={self.id} emp={self.employee_fk} "
            f"date={self.date} status={self.status}>"
        )
