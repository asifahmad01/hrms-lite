"""
Pydantic schemas for the LeaveRequest resource.

Validation rules enforced here (not duplicated in the service):
  - end_date must not be before start_date
  - reason must be between 10 and 1 000 characters
  - status cannot be set back to PENDING via the API
"""
from datetime import date as Date, datetime

from pydantic import BaseModel, Field, model_validator

from app.models.leave_request import LeaveStatus, LeaveType


# ── Create ─────────────────────────────────────────────────────────────────────

class LeaveRequestCreate(BaseModel):
    """
    Request body for POST /employees/{id}/leaves.
    The employee id is taken from the URL path — not part of this body.
    """
    leave_type: LeaveType = Field(..., description="Category of leave")
    start_date: Date      = Field(..., description="First day of leave (inclusive)")
    end_date:   Date      = Field(..., description="Last day of leave (inclusive)")
    reason:     str       = Field(..., min_length=10, max_length=1000,
                                  description="Reason for the leave request")

    @model_validator(mode="after")
    def check_date_order(self) -> "LeaveRequestCreate":
        if self.end_date < self.start_date:
            raise ValueError("end_date must not be before start_date.")
        return self


# ── Status update ──────────────────────────────────────────────────────────────

class LeaveStatusUpdate(BaseModel):
    """
    Request body for PATCH /leaves/{id}/status.
    Managers/HR use this to approve or reject a pending request.
    """
    status: LeaveStatus = Field(
        ...,
        description="Target status: APPROVED or REJECTED (cannot revert to PENDING)",
    )

    @model_validator(mode="after")
    def no_revert_to_pending(self) -> "LeaveStatusUpdate":
        if self.status == LeaveStatus.PENDING:
            raise ValueError(
                "Status cannot be set back to PENDING. Use APPROVED or REJECTED."
            )
        return self


# ── Read ───────────────────────────────────────────────────────────────────────

class LeaveRequestRead(BaseModel):
    """Full response schema — returned by every endpoint."""
    id:          int
    employee_fk: int
    leave_type:  LeaveType
    start_date:  Date
    end_date:    Date
    reason:      str
    status:      LeaveStatus
    created_at:  datetime

    model_config = {"from_attributes": True}
