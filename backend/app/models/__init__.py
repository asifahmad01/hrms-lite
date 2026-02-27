# Import all models here so SQLAlchemy / Alembic can discover them
# without requiring callers to import each model file individually.
from app.models.attendance import Attendance, AttendanceStatus
from app.models.employee import Employee

__all__ = ["Employee", "Attendance", "AttendanceStatus"]
