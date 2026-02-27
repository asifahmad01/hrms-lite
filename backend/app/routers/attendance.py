from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateEntryError, NotFoundError
from app.db.session import get_db
from app.schemas.attendance import AttendanceMark, AttendanceRead
from app.schemas.common import APIResponse
from app.services.attendance import AttendanceService

# ── Router ────────────────────────────────────────────────────────────────────
# Prefix is "/employees" here; main.py mounts this under API_PREFIX.
# Final paths become:
#   /api/v1/employees/{employee_id}/attendance        (GET, POST)
router = APIRouter(prefix="/employees", tags=["Attendance"])


# ── Dependency ────────────────────────────────────────────────────────────────
def _svc(db: AsyncSession = Depends(get_db)) -> AttendanceService:
    return AttendanceService(db)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/{employee_id}/attendance",
    response_model=APIResponse[list[AttendanceRead]],
    summary="List attendance records for an employee",
    responses={
        404: {"description": "Employee not found"},
        422: {"description": "from/to date invalid or from > to"},
    },
)
async def list_attendance(
    employee_id: int,
    from_date: date | None = Query(
        None,
        alias="from",
        description="Start of date range (inclusive), format YYYY-MM-DD",
    ),
    to_date: date | None = Query(
        None,
        alias="to",
        description="End of date range (inclusive), format YYYY-MM-DD",
    ),
    svc: AttendanceService = Depends(_svc),
) -> APIResponse[list[AttendanceRead]]:
    # Validate range (Pydantic model_validator cannot run here since params are
    # separate Query fields, so we guard manually)
    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="'from' date must not be after 'to' date.",
        )

    try:
        records = await svc.get_by_employee(
            employee_id, from_date=from_date, to_date=to_date
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    return APIResponse(
        message=f"{len(records)} attendance record(s) found.",
        data=[AttendanceRead.model_validate(r) for r in records],
    )


@router.post(
    "/{employee_id}/attendance",
    response_model=APIResponse[AttendanceRead],
    status_code=status.HTTP_201_CREATED,
    summary="Mark attendance for an employee on a given date",
    responses={
        404: {"description": "Employee not found"},
        409: {"description": "Attendance already marked for this date"},
    },
)
async def mark_attendance(
    employee_id: int,
    payload: AttendanceMark,
    svc: AttendanceService = Depends(_svc),
) -> APIResponse[AttendanceRead]:
    try:
        record = await svc.mark(employee_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except DuplicateEntryError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    return APIResponse(
        message="Attendance marked successfully.",
        data=AttendanceRead.model_validate(record),
    )
