from datetime import datetime

import re

from pydantic import BaseModel, Field, field_validator


class EmployeeBase(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=20, examples=["EMP-001"])
    full_name: str = Field(..., min_length=1, max_length=255)
    email: str
    department: str = Field(..., min_length=1, max_length=100)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Lightweight email validation to avoid requiring `email-validator` package.
        # For stricter validation, install `email-validator` and switch to EmailStr.
        v = v.strip()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", v):
            raise ValueError("Invalid email address.")
        return v


class EmployeeCreate(EmployeeBase):
    """Request body for POST /employees."""
    pass


class EmployeeUpdate(BaseModel):
    """Request body for PATCH /employees/{id} — all fields optional."""
    full_name: str | None = Field(None, min_length=1, max_length=255)
    email: str | None = None
    department: str | None = Field(None, min_length=1, max_length=100)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", v):
            raise ValueError("Invalid email address.")
        return v


class EmployeeRead(EmployeeBase):
    """Response schema — includes DB-generated fields."""
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
