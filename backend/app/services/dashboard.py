"""
DashboardService — aggregated KPI queries for the dashboard page.

All stats are derived from the existing employees + attendance tables with
no schema changes required.  A single call to get_stats() returns everything
the frontend dashboard needs in one round-trip.
"""
from datetime import date

from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import Attendance, AttendanceStatus
from app.models.employee import Employee
from app.schemas.dashboard import DashboardStats, TodaySummaryItem
from app.schemas.employee import EmployeeRead


class DashboardService:

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_stats(self) -> DashboardStats:
        today = date.today()

        # ── Scalar counts ──────────────────────────────────────────────────────

        total_employees: int = (
            await self.db.execute(
                select(func.count()).select_from(Employee)
            )
        ).scalar_one()

        present_today: int = (
            await self.db.execute(
                select(func.count())
                .select_from(Attendance)
                .where(
                    Attendance.date == today,
                    Attendance.status == AttendanceStatus.PRESENT,
                )
            )
        ).scalar_one()

        absent_today: int = (
            await self.db.execute(
                select(func.count())
                .select_from(Attendance)
                .where(
                    Attendance.date == today,
                    Attendance.status == AttendanceStatus.ABSENT,
                )
            )
        ).scalar_one()

        departments_count: int = (
            await self.db.execute(
                select(func.count(distinct(Employee.department)))
                .select_from(Employee)
            )
        ).scalar_one()

        # ── Derived metrics ────────────────────────────────────────────────────

        # Percentage of total headcount marked PRESENT today.
        # Returns 0.0 when there are no employees (avoids division-by-zero).
        attendance_rate_today: float = (
            round((present_today / total_employees) * 100, 1)
            if total_employees > 0
            else 0.0
        )

        # ── Recent employees (last 5 by join date) ─────────────────────────────

        recent_result = await self.db.execute(
            select(Employee)
            .order_by(Employee.created_at.desc())
            .limit(5)
        )
        recent_employees = list(recent_result.scalars().all())

        # ── Today's attendance summary (joined with employee name) ─────────────

        summary_result = await self.db.execute(
            select(Attendance, Employee)
            .join(Employee, Attendance.employee_fk == Employee.id)
            .where(Attendance.date == today)
            .order_by(Attendance.created_at.desc())
        )
        today_summary = [
            TodaySummaryItem(
                employee_code=emp.employee_code,
                full_name=emp.full_name,
                status=att.status.value,
            )
            for att, emp in summary_result.all()
        ]

        return DashboardStats(
            total_employees=total_employees,
            present_today=present_today,
            absent_today=absent_today,
            departments_count=departments_count,
            attendance_rate_today=attendance_rate_today,
            recent_employees=[
                EmployeeRead.model_validate(e) for e in recent_employees
            ],
            today_summary=today_summary,
        )
