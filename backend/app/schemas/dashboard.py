"""
Dashboard statistics schema.

Returned by GET /api/v1/dashboard/stats — drives the entire dashboard page
with a single network request.
"""
from pydantic import BaseModel

from app.schemas.employee import EmployeeRead


class TodaySummaryItem(BaseModel):
    """A single employee's attendance entry for today."""
    employee_code: str     # e.g. "EMP-001"
    full_name: str
    status: str            # AttendanceStatus value: "PRESENT" | "ABSENT"


class DashboardStats(BaseModel):
    """Aggregated KPI data for the dashboard home page."""
    total_employees: int
    present_today: int
    absent_today: int
    departments_count: int
    attendance_rate_today: float       # 0–100 percentage
    recent_employees: list[EmployeeRead]   # last 5 joined
    today_summary: list[TodaySummaryItem]  # all attendance records for today
