from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateEntryError, NotFoundError
from app.db.session import get_db
from app.schemas.attendance import (
    AttendanceMark,
    AttendanceMonthlySummary,
    AttendanceRead,
    DailyAttendanceItem,
)
from app.schemas.common import APIResponse
from app.schemas.employee import EmployeeRead
from app.services.attendance import AttendanceService

# ── Routers ───────────────────────────────────────────────────────────────────
#
#  router       prefix="/employees"  →  /api/v1/employees/{id}/attendance
#  daily_router prefix="/attendance" →  /api/v1/attendance/daily
#
router       = APIRouter(prefix="/employees",  tags=["Attendance"])
daily_router = APIRouter(prefix="/attendance", tags=["Attendance"])


# ── Dependency ────────────────────────────────────────────────────────────────
def _svc(db: AsyncSession = Depends(get_db)) -> AttendanceService:
    return AttendanceService(db)


# ═══════════════════════════════════════════════════════════════════════════════
# Daily view  →  GET /api/v1/attendance/daily?date=YYYY-MM-DD
# ═══════════════════════════════════════════════════════════════════════════════

@daily_router.get(
    "/daily",
    response_model=APIResponse[list[DailyAttendanceItem]],
    summary="Get all employees with their attendance status for a given date",
)
async def get_daily_attendance(
    date: date = Query(..., description="Date to view (YYYY-MM-DD)"),
    svc: AttendanceService = Depends(_svc),
) -> APIResponse[list[DailyAttendanceItem]]:
    rows = await svc.get_daily_view(date)
    items = [
        DailyAttendanceItem(
            employee=EmployeeRead.model_validate(emp),
            record=AttendanceRead.model_validate(att) if att is not None else None,
        )
        for emp, att in rows
    ]
    return APIResponse(message=f"{len(items)} employees.", data=items)


# ═══════════════════════════════════════════════════════════════════════════════
# Employee-scoped endpoints   →  /api/v1/employees/{employee_id}/attendance/...
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/{employee_id}/attendance/summary",
    response_model=APIResponse[AttendanceMonthlySummary],
    summary="Monthly attendance summary for a single employee",
    responses={404: {"description": "Employee not found"}},
)
async def get_monthly_summary(
    employee_id: int,
    year:  int = Query(..., ge=2000, le=2100, description="Calendar year (e.g. 2026)"),
    month: int = Query(..., ge=1,    le=12,   description="Calendar month 1–12"),
    svc: AttendanceService = Depends(_svc),
) -> APIResponse[AttendanceMonthlySummary]:
    try:
        data = await svc.get_monthly_summary(employee_id, year, month)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return APIResponse(
        message=f"Summary for employee {employee_id}, {year}-{month:02d}.",
        data=AttendanceMonthlySummary(**data),
    )


@router.get(
    "/{employee_id}/attendance",
    response_model=APIResponse[list[AttendanceRead]],
    summary="List attendance records for an employee",
    responses={
        404: {"description": "Employee not found"},
        422: {"description": "from > to"},
    },
)
async def list_attendance(
    employee_id: int,
    from_date: date | None = Query(None, alias="from"),
    to_date:   date | None = Query(None, alias="to"),
    svc: AttendanceService = Depends(_svc),
) -> APIResponse[list[AttendanceRead]]:
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


@router.patch(
    "/{employee_id}/attendance",
    response_model=APIResponse[AttendanceRead],
    summary="Create or update attendance for an employee on a given date (upsert)",
    responses={404: {"description": "Employee not found"}},
)
async def upsert_attendance(
    employee_id: int,
    payload: AttendanceMark,
    svc: AttendanceService = Depends(_svc),
) -> APIResponse[AttendanceRead]:
    try:
        record = await svc.upsert(employee_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return APIResponse(
        message="Attendance recorded.",
        data=AttendanceRead.model_validate(record),
    )


@router.post(
    "/{employee_id}/attendance",
    response_model=APIResponse[AttendanceRead],
    status_code=status.HTTP_201_CREATED,
    summary="Mark attendance for an employee (strict — 409 if already marked)",
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
