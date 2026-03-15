from datetime import date, datetime
import re

from pydantic import BaseModel, Field, field_validator

from app.models.employee import EmployeeStatus, EmploymentType

# ── Shared validator helpers ───────────────────────────────────────────────────

_EMAIL_RE = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
_CODE_RE  = re.compile(r"^[A-Z0-9\-]{2,20}$")


def _validate_email(v: str | None) -> str | None:
    if v is None:
        return v
    v = v.strip()
    if not _EMAIL_RE.fullmatch(v):
        raise ValueError("Invalid email address.")
    return v


def _validate_code(v: str) -> str:
    v = v.strip().upper()
    if not _CODE_RE.fullmatch(v):
        raise ValueError(
            "employee_code must be 2-20 uppercase letters, digits, or hyphens (e.g. EMP-001)."
        )
    return v


# ── Base ───────────────────────────────────────────────────────────────────────

class EmployeeBase(BaseModel):
    employee_code: str = Field(..., min_length=2, max_length=20, examples=["EMP-001"])
    full_name: str = Field(..., min_length=1, max_length=255)
    email: str
    department: str = Field(..., min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=30)
    designation: str | None = Field(None, max_length=100)
    joining_date: date | None = None
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    manager_name: str | None = Field(None, max_length=255)
    location: str | None = Field(None, max_length=100)

    @field_validator("employee_code")
    @classmethod
    def validate_employee_code(cls, v: str) -> str:
        return _validate_code(v)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        result = _validate_email(v)
        assert result is not None
        return result


# ── Create ─────────────────────────────────────────────────────────────────────

class EmployeeCreate(EmployeeBase):
    """Request body for POST /employees."""
    pass


# ── Update ─────────────────────────────────────────────────────────────────────

class EmployeeUpdate(BaseModel):
    """Request body for PATCH /employees/{id} — all fields optional."""
    full_name: str | None = Field(None, min_length=1, max_length=255)
    email: str | None = None
    department: str | None = Field(None, min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=30)
    designation: str | None = Field(None, max_length=100)
    joining_date: date | None = None
    employment_type: EmploymentType | None = None
    status: EmployeeStatus | None = None
    manager_name: str | None = Field(None, max_length=255)
    location: str | None = Field(None, max_length=100)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        return _validate_email(v)


# ── Read ───────────────────────────────────────────────────────────────────────

class EmployeeRead(EmployeeBase):
    """Response schema — includes DB-generated fields."""
    id: int
    status: EmployeeStatus
    created_at: datetime

    model_config = {"from_attributes": True}
