from datetime import date as Date, datetime

from pydantic import BaseModel, Field, model_validator

from app.models.attendance import AttendanceStatus


class AttendanceBase(BaseModel):
    employee_fk: int = Field(..., gt=0)
    date: Date
    status: AttendanceStatus


class AttendanceCreate(AttendanceBase):
    """Request body when employee_fk is supplied explicitly (internal / admin use)."""
    pass


class AttendanceMark(BaseModel):
    """
    Request body for POST /employees/{id}/attendance.
    The employee id comes from the URL — only date + status are needed in the body.
    """
    date: Date = Field(..., description="ISO-8601 date to mark attendance for (YYYY-MM-DD)")
    status: AttendanceStatus = Field(..., description="PRESENT or ABSENT")


class AttendanceUpdate(BaseModel):
    """Request body for PATCH — only status is updatable."""
    status: AttendanceStatus


class AttendanceRead(AttendanceBase):
    """Response schema including DB-generated fields."""
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Date-range filter used by the list endpoint ───────────────────────────────
class AttendanceDateFilter(BaseModel):
    """
    Validated query-param group for GET /employees/{id}/attendance.
    Injected via Depends() in the router so validation errors are auto-422.
    """
    from_date: Date | None = Field(None, alias="from")
    to_date: Date | None = Field(None, alias="to")

    model_config = {"populate_by_name": True}

    @model_validator(mode="after")
    def check_range(self) -> "AttendanceDateFilter":
        if self.from_date and self.to_date and self.from_date > self.to_date:
            raise ValueError("'from' date must not be after 'to' date")
        return self
