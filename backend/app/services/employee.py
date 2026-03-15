"""
EmployeeService — all business logic for the employees resource.

Duplicate strategy (belt + suspenders):
  1. Pre-check with SELECT before INSERT/UPDATE  → gives a readable 409 message.
  2. Catch IntegrityError on flush()             → fallback for race conditions.
"""
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateEntryError, NotFoundError
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


class EmployeeService:

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _get_or_404(self, employee_id: int) -> Employee:
        result = await self.db.execute(
            select(Employee).where(Employee.id == employee_id)
        )
        employee = result.scalar_one_or_none()
        if employee is None:
            raise NotFoundError("Employee", employee_id)
        return employee

    async def _check_unique_on_create(
        self, employee_code_val: str, email_val: str
    ) -> None:
        """Raise DuplicateEntryError if employee_code or email is already taken."""
        result = await self.db.execute(
            select(Employee).where(
                or_(
                    Employee.employee_code == employee_code_val,
                    Employee.email == email_val,
                )
            )
        )
        rows = result.scalars().all()
        for row in rows:
            if row.employee_code == employee_code_val:
                raise DuplicateEntryError("employee_code", employee_code_val)
            if row.email == email_val:
                raise DuplicateEntryError("email", email_val)

    async def _check_email_unique_on_update(
        self, new_email: str, exclude_id: int
    ) -> None:
        """Raise DuplicateEntryError if another employee already uses this email."""
        result = await self.db.execute(
            select(Employee).where(
                Employee.email == new_email,
                Employee.id != exclude_id,
            )
        )
        if result.scalar_one_or_none() is not None:
            raise DuplicateEntryError("email", new_email)

    # ── Public API ────────────────────────────────────────────────────────────

    async def get_all(self) -> list[Employee]:
        result = await self.db.execute(
            select(Employee).order_by(Employee.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, employee_id: int) -> Employee:
        return await self._get_or_404(employee_id)

    async def create(self, payload: EmployeeCreate) -> Employee:
        # 1. Pre-check: readable error before hitting the DB constraint
        await self._check_unique_on_create(
            payload.employee_code, str(payload.email)
        )

        employee = Employee(**payload.model_dump())
        self.db.add(employee)

        try:
            await self.db.flush()   # sends INSERT; session.commit() is in get_db
        except IntegrityError as exc:
            # 2. Fallback: race-condition duplicate caught at DB level
            await self.db.rollback()
            err = str(exc.orig).lower()
            if "employee_code" in err or "uq_employees_employee_code" in err:
                raise DuplicateEntryError("employee_code", payload.employee_code)
            if "email" in err or "uq_employees_email" in err:
                raise DuplicateEntryError("email", str(payload.email))
            raise  # unexpected — let the 500 handler deal with it

        await self.db.refresh(employee)
        return employee

    async def update(self, employee_id: int, payload: EmployeeUpdate) -> Employee:
        employee = await self._get_or_404(employee_id)

        update_data = payload.model_dump(exclude_none=True)
        if not update_data:
            return employee  # nothing to do

        # Unique check only for email (employee_code is not updatable)
        new_email = update_data.get("email")
        if new_email and str(new_email) != employee.email:
            await self._check_email_unique_on_update(str(new_email), employee_id)

        for field, value in update_data.items():
            setattr(employee, field, value)

        try:
            await self.db.flush()
        except IntegrityError as exc:
            await self.db.rollback()
            err = str(exc.orig).lower()
            if "email" in err:
                raise DuplicateEntryError("email", str(payload.email or ""))
            raise

        await self.db.refresh(employee)
        return employee

    async def delete(self, employee_id: int) -> None:
        employee = await self._get_or_404(employee_id)
        await self.db.delete(employee)
        await self.db.flush()
        # Cascaded attendance rows are removed automatically by the DB FK rule
