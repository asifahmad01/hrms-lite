import enum
from datetime import date, datetime

from sqlalchemy import Date, Enum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import DateTime

from app.db.base import Base


# ── Enums ──────────────────────────────────────────────────────────────────────

class LeaveType(str, enum.Enum):
    ANNUAL    = "ANNUAL"
    SICK      = "SICK"
    CASUAL    = "CASUAL"
    UNPAID    = "UNPAID"
    MATERNITY = "MATERNITY"
    PATERNITY = "PATERNITY"


class LeaveStatus(str, enum.Enum):
    PENDING  = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


# ── Model ──────────────────────────────────────────────────────────────────────

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    employee_fk: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    leave_type: Mapped[LeaveType] = mapped_column(
        Enum(LeaveType, name="leavetype", create_type=True),
        nullable=False,
    )

    start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_date:   Mapped[date] = mapped_column(Date, nullable=False)

    reason: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[LeaveStatus] = mapped_column(
        Enum(LeaveStatus, name="leavestatus", create_type=True),
        nullable=False,
        server_default=LeaveStatus.PENDING.value,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Read-only relationship — no back_populates to avoid touching employee.py
    employee: Mapped["Employee"] = relationship("Employee")  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<LeaveRequest id={self.id} emp={self.employee_fk} "
            f"type={self.leave_type} status={self.status}>"
        )
