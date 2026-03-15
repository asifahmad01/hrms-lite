from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateEntryError, NotFoundError
from app.db.session import get_db
from app.schemas.common import APIResponse
from app.schemas.employee import EmployeeCreate, EmployeeRead, EmployeeUpdate
from app.services.employee import EmployeeService

router = APIRouter(prefix="/employees", tags=["Employees"])


# ── Dependency ────────────────────────────────────────────────────────────────
def _svc(db: Annotated[AsyncSession, Depends(get_db)]) -> EmployeeService:
    return EmployeeService(db)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/",
    summary="List all employees",
)
async def list_employees(
    svc: Annotated[EmployeeService, Depends(_svc)],
) -> APIResponse[list[EmployeeRead]]:
    employees = await svc.get_all()
    return APIResponse(
        message=f"{len(employees)} employee(s) found.",
        data=employees,
    )


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new employee",
    responses={
        409: {"description": "employee_id or email already exists"},
    },
)
async def create_employee(
    payload: EmployeeCreate,
    svc: Annotated[EmployeeService, Depends(_svc)],
) -> APIResponse[EmployeeRead]:
    try:
        employee = await svc.create(payload)
    except DuplicateEntryError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return APIResponse(
        message="Employee created successfully.",
        data=EmployeeRead.model_validate(employee),
    )


@router.get(
    "/{employee_id}",
    summary="Get a single employee by id",
    responses={404: {"description": "Employee not found"}},
)
async def get_employee(
    employee_id: int,
    svc: Annotated[EmployeeService, Depends(_svc)],
) -> APIResponse[EmployeeRead]:
    try:
        employee = await svc.get_by_id(employee_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return APIResponse(
        message="Employee retrieved.",
        data=EmployeeRead.model_validate(employee),
    )


@router.patch(
    "/{employee_id}",
    summary="Partially update an employee",
    responses={
        404: {"description": "Employee not found"},
        409: {"description": "New email already in use"},
    },
)
async def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    svc: Annotated[EmployeeService, Depends(_svc)],
) -> APIResponse[EmployeeRead]:
    try:
        employee = await svc.update(employee_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except DuplicateEntryError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return APIResponse(
        message="Employee updated.",
        data=EmployeeRead.model_validate(employee),
    )


@router.delete(
    "/{employee_id}",
    summary="Delete an employee (cascades attendance)",
    responses={404: {"description": "Employee not found"}},
)
async def delete_employee(
    employee_id: int,
    svc: Annotated[EmployeeService, Depends(_svc)],
) -> APIResponse[None]:
    try:
        await svc.delete(employee_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return APIResponse(message="Employee deleted.")
