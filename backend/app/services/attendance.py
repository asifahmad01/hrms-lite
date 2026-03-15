"""
AttendanceService — business logic for the attendance resource.

Statuses: PRESENT | ABSENT | LEAVE | HALF_DAY

Duplicate strategy (belt + suspenders):
  1. Pre-check SELECT before INSERT → readable 409 message.
  2. Catch IntegrityError on flush()  → fallback for race conditions.
"""
from datetime import date

from sqlalchemy import and_, extract, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateEntryError, NotFoundError
from app.models.attendance import Attendance
from app.models.employee import Employee
from app.schemas.attendance import AttendanceMark, AttendanceUpdate


class AttendanceService:

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _employee_exists_or_404(self, employee_id: int) -> None:
        result = await self.db.execute(
            select(Employee.id).where(Employee.id == employee_id)
        )
        if result.scalar_one_or_none() is None:
            raise NotFoundError("Employee", employee_id)

    async def _get_record_or_404(self, attendance_id: int) -> Attendance:
        result = await self.db.execute(
            select(Attendance).where(Attendance.id == attendance_id)
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise NotFoundError("Attendance record", attendance_id)
        return record

    # ── Public API ────────────────────────────────────────────────────────────

    async def get_by_employee(
        self,
        employee_id: int,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[Attendance]:
        """Return all attendance records for an employee, newest first."""
        await self._employee_exists_or_404(employee_id)

        query = (
            select(Attendance)
            .where(Attendance.employee_fk == employee_id)
            .order_by(Attendance.date.desc())
        )
        if from_date:
            query = query.where(Attendance.date >= from_date)
        if to_date:
            query = query.where(Attendance.date <= to_date)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def mark(self, employee_id: int, payload: AttendanceMark) -> Attendance:
        """
        Create an attendance record (strict — 409 if already exists).
        Use upsert() for create-or-update semantics.
        """
        await self._employee_exists_or_404(employee_id)

        existing = await self.db.execute(
            select(Attendance).where(
                and_(
                    Attendance.employee_fk == employee_id,
                    Attendance.date == payload.date,
                )
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise DuplicateEntryError("attendance date", str(payload.date))

        record = Attendance(
            employee_fk=employee_id,
            date=payload.date,
            status=payload.status,
        )
        self.db.add(record)

        try:
            await self.db.flush()
        except IntegrityError as exc:
            await self.db.rollback()
            err = str(exc.orig).lower()
            if "uq_attendance_employee_date" in err or "date" in err:
                raise DuplicateEntryError("attendance date", str(payload.date)) from exc
            raise

        await self.db.refresh(record)
        return record

    async def upsert(self, employee_id: int, payload: AttendanceMark) -> Attendance:
        """
        Create-or-update attendance for a given employee and date.
        Idempotent: safe to call repeatedly (used by the Daily view inline marking).
        """
        await self._employee_exists_or_404(employee_id)

        result = await self.db.execute(
            select(Attendance).where(
                Attendance.employee_fk == employee_id,
                Attendance.date == payload.date,
            )
        )
        record = result.scalar_one_or_none()

        if record is not None:
            record.status = payload.status
        else:
            record = Attendance(
                employee_fk=employee_id,
                date=payload.date,
                status=payload.status,
            )
            self.db.add(record)

        await self.db.flush()
        await self.db.refresh(record)
        return record

    async def get_by_id(self, attendance_id: int) -> Attendance:
        return await self._get_record_or_404(attendance_id)

    async def update(self, attendance_id: int, payload: AttendanceUpdate) -> Attendance:
        record = await self._get_record_or_404(attendance_id)
        record.status = payload.status
        await self.db.flush()
        await self.db.refresh(record)
        return record

    async def delete(self, attendance_id: int) -> None:
        record = await self._get_record_or_404(attendance_id)
        await self.db.delete(record)
        await self.db.flush()

    # ── Daily view ────────────────────────────────────────────────────────────

    async def get_daily_view(
        self, target_date: date
    ) -> list[tuple[Employee, Attendance | None]]:
        """
        Return every employee with their attendance record for target_date.
        Employees without a record have None as the second element.
        Ordered by employee full_name ascending.
        """
        result = await self.db.execute(
            select(Employee, Attendance)
            .outerjoin(
                Attendance,
                and_(
                    Attendance.employee_fk == Employee.id,
                    Attendance.date == target_date,
                ),
            )
            .order_by(Employee.full_name)
        )
        return [(row[0], row[1]) for row in result.all()]

    # ── Monthly summary ────────────────────────────────────────────────────────

    async def get_monthly_summary(
        self, employee_id: int, year: int, month: int
    ) -> dict:
        """
        Attendance counts by status for one employee over a calendar month.
        Rate = (present + half_day * 0.5) / total * 100, or 0.0 when total == 0.
        """
        await self._employee_exists_or_404(employee_id)

        result = await self.db.execute(
            select(Attendance.status, func.count(Attendance.id))
            .where(
                Attendance.employee_fk == employee_id,
                extract("year",  Attendance.date) == year,
                extract("month", Attendance.date) == month,
            )
            .group_by(Attendance.status)
        )
        counts: dict[str, int] = {row[0].value: row[1] for row in result.all()}

        present  = counts.get("PRESENT",  0)
        absent   = counts.get("ABSENT",   0)
        leave    = counts.get("LEAVE",    0)
        half_day = counts.get("HALF_DAY", 0)
        total    = present + absent + leave + half_day
        rate     = (
            round((present + half_day * 0.5) / total * 100, 1)
            if total > 0 else 0.0
        )
        return {
            "present": present, "absent": absent,
            "leave": leave, "half_day": half_day,
            "total": total, "rate": rate,
        }
