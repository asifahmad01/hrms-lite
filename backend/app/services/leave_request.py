"""
LeaveRequestService — business logic for the leave-request resource.

Business rules enforced here:
  1. Employee must exist                      → NotFoundError (404)
  2. end_date >= start_date                   → validated by schema; service trusts it
  3. Overlap guard: a new request cannot overlap an existing PENDING or APPROVED
     request for the same employee (REJECTED requests are ignored)  → ValueError (422)
  4. Status transitions: PENDING → APPROVED | REJECTED only
     Reverting to PENDING is blocked at the schema level             → ValueError (422)
  5. Only PENDING requests may be deleted                            → ValueError (422)
"""
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models.employee import Employee
from app.models.leave_request import LeaveRequest, LeaveStatus
from app.schemas.leave_request import LeaveRequestCreate, LeaveStatusUpdate


class LeaveRequestService:

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Private helpers ───────────────────────────────────────────────────────

    async def _employee_exists_or_404(self, employee_id: int) -> None:
        result = await self.db.execute(
            select(Employee.id).where(Employee.id == employee_id)
        )
        if result.scalar_one_or_none() is None:
            raise NotFoundError("Employee", employee_id)

    async def _get_or_404(self, leave_id: int) -> LeaveRequest:
        result = await self.db.execute(
            select(LeaveRequest).where(LeaveRequest.id == leave_id)
        )
        leave = result.scalar_one_or_none()
        if leave is None:
            raise NotFoundError("Leave request", leave_id)
        return leave

    async def _check_overlap(
        self,
        employee_id: int,
        start: date,
        end: date,
        exclude_id: int | None = None,
    ) -> None:
        """
        Raise ValueError if an existing PENDING or APPROVED request for this
        employee overlaps the [start, end] date range.

        Overlap condition: existing.start <= new.end  AND  existing.end >= new.start
        """
        query = select(LeaveRequest).where(
            LeaveRequest.employee_fk == employee_id,
            LeaveRequest.status.in_([LeaveStatus.PENDING, LeaveStatus.APPROVED]),
            LeaveRequest.start_date <= end,
            LeaveRequest.end_date   >= start,
        )
        if exclude_id is not None:
            query = query.where(LeaveRequest.id != exclude_id)

        result  = await self.db.execute(query)
        conflict = result.scalar_one_or_none()
        if conflict is not None:
            raise BusinessRuleError(
                f"Dates overlap an existing {conflict.status.value.lower()} leave request "
                f"(#{conflict.id}: {conflict.start_date} – {conflict.end_date})."
            )

    # ── Public API ────────────────────────────────────────────────────────────

    async def create(
        self, employee_id: int, payload: LeaveRequestCreate
    ) -> LeaveRequest:
        """Submit a new leave request for an employee."""
        await self._employee_exists_or_404(employee_id)
        await self._check_overlap(employee_id, payload.start_date, payload.end_date)

        leave = LeaveRequest(
            employee_fk=employee_id,
            leave_type=payload.leave_type,
            start_date=payload.start_date,
            end_date=payload.end_date,
            reason=payload.reason,
            # status defaults to PENDING via server_default; set explicitly for clarity
            status=LeaveStatus.PENDING,
        )
        self.db.add(leave)
        await self.db.flush()
        await self.db.refresh(leave)
        return leave

    async def list_by_employee(
        self,
        employee_id: int,
        status: LeaveStatus | None = None,
    ) -> list[LeaveRequest]:
        """Return all leave requests for one employee, newest first."""
        await self._employee_exists_or_404(employee_id)

        query = (
            select(LeaveRequest)
            .where(LeaveRequest.employee_fk == employee_id)
            .order_by(LeaveRequest.created_at.desc())
        )
        if status is not None:
            query = query.where(LeaveRequest.status == status)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_all(
        self,
        status: LeaveStatus | None = None,
    ) -> list[LeaveRequest]:
        """Return all leave requests across all employees (admin/HR view), newest first."""
        query = select(LeaveRequest).order_by(LeaveRequest.created_at.desc())
        if status is not None:
            query = query.where(LeaveRequest.status == status)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, leave_id: int) -> LeaveRequest:
        """Fetch a single leave request by its primary key."""
        return await self._get_or_404(leave_id)

    async def update_status(
        self, leave_id: int, payload: LeaveStatusUpdate
    ) -> LeaveRequest:
        """
        Approve or reject a PENDING leave request.
        Attempting to change the status of an already-decided request raises ValueError.
        """
        leave = await self._get_or_404(leave_id)

        if leave.status != LeaveStatus.PENDING:
            raise BusinessRuleError(
                f"Only PENDING leave requests can be actioned. "
                f"This request is already {leave.status.value.lower()}."
            )

        leave.status = payload.status
        await self.db.flush()
        await self.db.refresh(leave)
        return leave

    async def delete(self, leave_id: int) -> None:
        """
        Delete a leave request.
        Only PENDING requests may be deleted — approved/rejected requests are
        kept for audit purposes.
        """
        leave = await self._get_or_404(leave_id)

        if leave.status != LeaveStatus.PENDING:
            raise BusinessRuleError(
                f"Only PENDING leave requests can be deleted. "
                f"This request is {leave.status.value.lower()}."
            )

        await self.db.delete(leave)
        await self.db.flush()
