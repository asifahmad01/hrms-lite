"""
AttendanceService — business logic for the attendance resource.

Duplicate strategy (belt + suspenders):
  1. Pre-check SELECT before INSERT → readable 409 message.
  2. Catch IntegrityError on flush()  → fallback for race conditions.
"""
from datetime import date

from sqlalchemy import and_, select
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
        """Raise NotFoundError if no employee with this id exists."""
        result = await self.db.execute(
            select(Employee).where(Employee.id == employee_id)
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
        """
        Return all attendance records for an employee, newest first.
        Optional from_date / to_date narrow the window (both inclusive).
        Raises NotFoundError (→ 404) if the employee does not exist.
        """
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
        Create an attendance record for an employee on a given date.

        Raises:
            NotFoundError       if the employee does not exist        → 404
            DuplicateEntryError if attendance already marked for date → 409
        """
        # 1. Employee guard
        await self._employee_exists_or_404(employee_id)

        # 2. Pre-check: same employee, same date
        existing = await self.db.execute(
            select(Attendance).where(
                and_(
                    Attendance.employee_fk == employee_id,
                    Attendance.date == payload.date,
                )
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise DuplicateEntryError(
                "attendance date",
                str(payload.date),
            )

        # 3. Insert
        record = Attendance(
            employee_fk=employee_id,
            date=payload.date,
            status=payload.status,
        )
        self.db.add(record)

        try:
            await self.db.flush()
        except IntegrityError as exc:
            # Fallback: race-condition duplicate caught at DB level
            await self.db.rollback()
            err = str(exc.orig).lower()
            if "uq_attendance_employee_date" in err or "date" in err:
                raise DuplicateEntryError("attendance date", str(payload.date))
            raise

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
