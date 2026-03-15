"""
Leave-request routers.

Two APIRouter instances are registered in main.py:

  router        prefix="/employees"  →  /api/v1/employees/{id}/leaves  (submit / list by employee)
  admin_router  prefix="/leaves"     →  /api/v1/leaves/...              (admin: list all, get, action, delete)

URL map
───────
POST   /api/v1/employees/{employee_id}/leaves             submit a new leave request
GET    /api/v1/employees/{employee_id}/leaves             list leaves for one employee
GET    /api/v1/leaves                                      list all leaves (admin, filterable)
GET    /api/v1/leaves/{leave_id}                          get a single leave request
PATCH  /api/v1/leaves/{leave_id}/status                   approve or reject
DELETE /api/v1/leaves/{leave_id}                          delete (PENDING only)
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.db.session import get_db
from app.models.leave_request import LeaveStatus
from app.schemas.common import APIResponse
from app.schemas.leave_request import LeaveRequestCreate, LeaveRequestRead, LeaveStatusUpdate
from app.services.leave_request import LeaveRequestService

# ── Routers ───────────────────────────────────────────────────────────────────

router       = APIRouter(prefix="/employees",  tags=["Leave Requests"])
admin_router = APIRouter(prefix="/leaves",     tags=["Leave Requests"])


# ── Shared dependency ─────────────────────────────────────────────────────────

def _svc(db: AsyncSession = Depends(get_db)) -> LeaveRequestService:
    return LeaveRequestService(db)


# ═══════════════════════════════════════════════════════════════════════════════
# Employee-scoped endpoints   →  /api/v1/employees/{employee_id}/leaves
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/{employee_id}/leaves",
    response_model=APIResponse[LeaveRequestRead],
    status_code=status.HTTP_201_CREATED,
    summary="Submit a leave request for an employee",
    responses={
        404: {"description": "Employee not found"},
        422: {"description": "Validation error or date overlap with existing request"},
    },
)
async def submit_leave_request(
    employee_id: int,
    payload: LeaveRequestCreate,
    svc: LeaveRequestService = Depends(_svc),
) -> APIResponse[LeaveRequestRead]:
    try:
        leave = await svc.create(employee_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except BusinessRuleError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    return APIResponse(
        message="Leave request submitted successfully.",
        data=LeaveRequestRead.model_validate(leave),
    )


@router.get(
    "/{employee_id}/leaves",
    response_model=APIResponse[list[LeaveRequestRead]],
    summary="List leave requests for an employee",
    responses={404: {"description": "Employee not found"}},
)
async def list_leave_requests_by_employee(
    employee_id: int,
    status_filter: LeaveStatus | None = Query(
        None,
        alias="status",
        description="Filter by status: PENDING | APPROVED | REJECTED",
    ),
    svc: LeaveRequestService = Depends(_svc),
) -> APIResponse[list[LeaveRequestRead]]:
    try:
        leaves = await svc.list_by_employee(employee_id, status=status_filter)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return APIResponse(
        message=f"{len(leaves)} leave request(s) found.",
        data=[LeaveRequestRead.model_validate(lr) for lr in leaves],
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Admin / resource-level endpoints   →  /api/v1/leaves/...
# ═══════════════════════════════════════════════════════════════════════════════

@admin_router.get(
    "",
    response_model=APIResponse[list[LeaveRequestRead]],
    summary="List all leave requests (admin view)",
)
async def list_all_leave_requests(
    status_filter: LeaveStatus | None = Query(
        None,
        alias="status",
        description="Filter by status: PENDING | APPROVED | REJECTED",
    ),
    svc: LeaveRequestService = Depends(_svc),
) -> APIResponse[list[LeaveRequestRead]]:
    leaves = await svc.list_all(status=status_filter)
    return APIResponse(
        message=f"{len(leaves)} leave request(s) found.",
        data=[LeaveRequestRead.model_validate(lr) for lr in leaves],
    )


@admin_router.get(
    "/{leave_id}",
    response_model=APIResponse[LeaveRequestRead],
    summary="Get a single leave request by ID",
    responses={404: {"description": "Leave request not found"}},
)
async def get_leave_request(
    leave_id: int,
    svc: LeaveRequestService = Depends(_svc),
) -> APIResponse[LeaveRequestRead]:
    try:
        leave = await svc.get_by_id(leave_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return APIResponse(
        message="Leave request retrieved.",
        data=LeaveRequestRead.model_validate(leave),
    )


@admin_router.patch(
    "/{leave_id}/status",
    response_model=APIResponse[LeaveRequestRead],
    summary="Approve or reject a leave request",
    responses={
        404: {"description": "Leave request not found"},
        422: {"description": "Request is not in PENDING state"},
    },
)
async def update_leave_status(
    leave_id: int,
    payload: LeaveStatusUpdate,
    svc: LeaveRequestService = Depends(_svc),
) -> APIResponse[LeaveRequestRead]:
    try:
        leave = await svc.update_status(leave_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except BusinessRuleError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    action = "approved" if leave.status == LeaveStatus.APPROVED else "rejected"
    return APIResponse(
        message=f"Leave request {action}.",
        data=LeaveRequestRead.model_validate(leave),
    )


@admin_router.delete(
    "/{leave_id}",
    response_model=APIResponse[None],
    summary="Delete a leave request (PENDING only)",
    responses={
        404: {"description": "Leave request not found"},
        422: {"description": "Only PENDING requests can be deleted"},
    },
)
async def delete_leave_request(
    leave_id: int,
    svc: LeaveRequestService = Depends(_svc),
) -> APIResponse[None]:
    try:
        await svc.delete(leave_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except BusinessRuleError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    return APIResponse(message="Leave request deleted.")
