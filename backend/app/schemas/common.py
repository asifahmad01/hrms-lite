"""
Shared response envelope used by every endpoint.

Success:    {"success": true,  "message": "...", "data": {...}}
Error:      {"success": false, "message": "...", "errors": [...]}
"""
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ErrorDetail(BaseModel):
    """Single field-level validation or business-logic error."""
    field: str | None = None   # None → general / non-field error
    message: str


class APIResponse(BaseModel, Generic[T]):
    """
    Generic success envelope.

    Usage:
        return APIResponse(success=True, message="Created", data=employee_schema)
    """
    success: bool = True
    message: str
    data: T | None = None


class ErrorResponse(BaseModel):
    """
    Structured error envelope returned by all exception handlers.

    Usage:
        return JSONResponse(
            status_code=422,
            content=ErrorResponse(message="Validation failed", errors=[...]).model_dump()
        )
    """
    success: bool = False
    message: str
    errors: list[ErrorDetail] | None = None
