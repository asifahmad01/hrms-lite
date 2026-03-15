#!/usr/bin/env python3
"""
HRMS Lite — demo seed script.

Truncates all data and repopulates with:
  - 18 realistic employees across 5 departments
  - ~50 working days of attendance history (Jan 5 – Mar 13, 2026)
  - 16 leave requests with mixed statuses

NOTE: This script writes directly to the ORM — it bypasses service-layer
business rules intentionally (no overlap checks, no status guards). It is
safe to run repeatedly; each run wipes and rebuilds demo data.

Usage (from the backend/ directory):
    python seed.py
"""
import asyncio
import random
import sys
from datetime import date, timedelta
from pathlib import Path

# Make `app` importable when run from backend/
sys.path.insert(0, str(Path(__file__).parent))

import app.models  # noqa: F401 — registers all ORM models with Base.metadata

from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from app.models.attendance import Attendance, AttendanceStatus
from app.models.employee import Employee, EmployeeStatus, EmploymentType
from app.models.leave_request import LeaveRequest, LeaveStatus, LeaveType

# Reproducible randomness — same data every run
random.seed(42)

TODAY = date(2026, 3, 14)


# ─────────────────────────────────────────────────────────────────────────────
# Employee definitions  (18 employees, 5 departments)
# ─────────────────────────────────────────────────────────────────────────────

EMPLOYEES: list[dict] = [

    # ── HR (3) ───────────────────────────────────────────────────────────────
    {
        "employee_code":   "HR-001",
        "full_name":       "Sarah Mitchell",
        "email":           "s.mitchell@hrms.demo",
        "department":      "HR",
        "designation":     "HR Manager",
        "employment_type": EmploymentType.FULL_TIME,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2021, 3, 15),
        "phone":           "+1-555-0101",
        "location":        "New York",
        "manager_name":    None,
    },
    {
        "employee_code":   "HR-002",
        "full_name":       "James Okonkwo",
        "email":           "j.okonkwo@hrms.demo",
        "department":      "HR",
        "designation":     "HR Specialist",
        "employment_type": EmploymentType.FULL_TIME,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2022, 7, 1),
        "phone":           "+1-555-0102",
        "location":        "New York",
        "manager_name":    "Sarah Mitchell",
    },
    {
        "employee_code":   "HR-003",
        "full_name":       "Priya Sharma",
        "email":           "p.sharma@hrms.demo",
        "department":      "HR",
        "designation":     "HR Coordinator",
        "employment_type": EmploymentType.FULL_TIME,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2023, 1, 9),
        "phone":           "+1-555-0103",
        "location":        "New York",
        "manager_name":    "Sarah Mitchell",
    },

    # ── IT (5) ────────────────────────────────────────────────────────────────
    {
        "employee_code":   "IT-001",
        "full_name":       "Michael Chen",
        "email":           "m.chen@hrms.demo",
        "department":      "IT",
        "designation":     "Senior Software Engineer",
        "employment_type": EmploymentType.FULL_TIME,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2020, 6, 1),
        "phone":           "+1-555-0201",
        "location":        "San Francisco",
        "manager_name":    None,
    },
    {
        "employee_code":   "IT-002",
        "full_name":       "Aisha Rahman",
        "email":           "a.rahman@hrms.demo",
        "department":      "IT",
        "designation":     "Software Engineer",
        "employment_type": EmploymentType.FULL_TIME,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2021, 9, 15),
        "phone":           "+1-555-0202",
        "location":        "San Francisco",
        "manager_name":    "Michael Chen",
    },
    {
        "employee_code":   "IT-003",
        "full_name":       "David Kowalski",
        "email":           "d.kowalski@hrms.demo",
        "department":      "IT",
        "designation":     "DevOps Engineer",
        "employment_type": EmploymentType.FULL_TIME,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2022, 2, 14),
        "phone":           "+1-555-0203",
        "location":        "San Francisco",
        "manager_name":    "Michael Chen",
    },
    {
        "employee_code":   "IT-004",
        "full_name":       "Elena Torres",
        "email":           "e.torres@hrms.demo",
        "department":      "IT",
        "designation":     "Frontend Developer",
        "employment_type": EmploymentType.FULL_TIME,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2023, 4, 3),
        "phone":           "+1-555-0204",
        "location":        "San Francisco",
        "manager_name":    "Michael Chen",
    },
    {
        "employee_code":   "IT-005",
        "full_name":       "Nathan Park",
        "email":           "n.park@hrms.demo",
        "department":      "IT",
        "designation":     "Junior Developer",
        "employment_type": EmploymentType.INTERN,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2025, 9, 1),
        "phone":           "+1-555-0205",
        "location":        "San Francisco",
        "manager_name":    "Aisha Rahman",
    },

    # ── Finance (4) ───────────────────────────────────────────────────────────
    {
        "employee_code":   "FIN-001",
        "full_name":       "Catherine Walsh",
        "email":           "c.walsh@hrms.demo",
        "department":      "Finance",
        "designation":     "Finance Manager",
        "employment_type": EmploymentType.FULL_TIME,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2019, 11, 1),
        "phone":           "+1-555-0301",
        "location":        "Chicago",
        "manager_name":    None,
    },
    {
        "employee_code":   "FIN-002",
        "full_name":       "Ravi Patel",
        "email":           "r.patel@hrms.demo",
        "department":      "Finance",
        "designation":     "Senior Accountant",
        "employment_type": EmploymentType.FULL_TIME,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2021, 1, 20),
        "phone":           "+1-555-0302",
        "location":        "Chicago",
        "manager_name":    "Catherine Walsh",
    },
    {
        "employee_code":   "FIN-003",
        "full_name":       "Sophie Laurent",
        "email":           "s.laurent@hrms.demo",
        "department":      "Finance",
        "designation":     "Financial Analyst",
        "employment_type": EmploymentType.FULL_TIME,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2022, 5, 16),
        "phone":           "+1-555-0303",
        "location":        "Chicago",
        "manager_name":    "Catherine Walsh",
    },
    {
        "employee_code":   "FIN-004",
        "full_name":       "Marcus Johnson",
        "email":           "m.johnson@hrms.demo",
        "department":      "Finance",
        "designation":     "Junior Accountant",
        "employment_type": EmploymentType.CONTRACT,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2024, 8, 1),
        "phone":           "+1-555-0304",
        "location":        "Chicago",
        "manager_name":    "Ravi Patel",
    },

    # ── Operations (4) ────────────────────────────────────────────────────────
    {
        "employee_code":   "OPS-001",
        "full_name":       "Omar Hassan",
        "email":           "o.hassan@hrms.demo",
        "department":      "Operations",
        "designation":     "Operations Manager",
        "employment_type": EmploymentType.FULL_TIME,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2020, 3, 2),
        "phone":           "+1-555-0401",
        "location":        "Houston",
        "manager_name":    None,
    },
    {
        "employee_code":   "OPS-002",
        "full_name":       "Lisa Nguyen",
        "email":           "l.nguyen@hrms.demo",
        "department":      "Operations",
        "designation":     "Operations Analyst",
        "employment_type": EmploymentType.FULL_TIME,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2022, 10, 10),
        "phone":           "+1-555-0402",
        "location":        "Houston",
        "manager_name":    "Omar Hassan",
    },
    {
        "employee_code":   "OPS-003",
        "full_name":       "Tom Bradley",
        "email":           "t.bradley@hrms.demo",
        "department":      "Operations",
        "designation":     "Logistics Coordinator",
        "employment_type": EmploymentType.FULL_TIME,
        "status":          EmployeeStatus.ON_LEAVE,
        "joining_date":    date(2021, 6, 21),
        "phone":           "+1-555-0403",
        "location":        "Houston",
        "manager_name":    "Omar Hassan",
    },
    {
        "employee_code":   "OPS-004",
        "full_name":       "Fatima Al-Zahra",
        "email":           "f.alzahra@hrms.demo",
        "department":      "Operations",
        "designation":     "Supply Chain Analyst",
        "employment_type": EmploymentType.PART_TIME,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2023, 7, 17),
        "phone":           "+1-555-0404",
        "location":        "Houston",
        "manager_name":    "Omar Hassan",
    },

    # ── Admin (2) ─────────────────────────────────────────────────────────────
    {
        "employee_code":   "ADM-001",
        "full_name":       "Robert Garcia",
        "email":           "r.garcia@hrms.demo",
        "department":      "Admin",
        "designation":     "Office Manager",
        "employment_type": EmploymentType.FULL_TIME,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2020, 8, 3),
        "phone":           "+1-555-0501",
        "location":        "New York",
        "manager_name":    None,
    },
    {
        "employee_code":   "ADM-002",
        "full_name":       "Hannah Lee",
        "email":           "h.lee@hrms.demo",
        "department":      "Admin",
        "designation":     "Administrative Assistant",
        "employment_type": EmploymentType.FULL_TIME,
        "status":          EmployeeStatus.ACTIVE,
        "joining_date":    date(2024, 2, 1),
        "phone":           "+1-555-0502",
        "location":        "New York",
        "manager_name":    "Robert Garcia",
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Attendance patterns
#
# "high"   — managers / senior staff:  93% PRESENT
# "normal" — regular full-time:        85% PRESENT
# "intern" — interns / junior:         78% PRESENT
#
# OPS-003 (Tom, ON_LEAVE):  LEAVE for all dates ≥ leave start; "normal" before
# OPS-004 (Fatima, PART_TIME): Mon/Wed/Fri only, "normal" distribution
# ─────────────────────────────────────────────────────────────────────────────

def _build_pool(present: int, absent: int, half_day: int, leave: int) -> list[AttendanceStatus]:
    return (
        [AttendanceStatus.PRESENT]   * present
        + [AttendanceStatus.ABSENT]  * absent
        + [AttendanceStatus.HALF_DAY] * half_day
        + [AttendanceStatus.LEAVE]   * leave
    )


ATTENDANCE_POOLS: dict[str, list[AttendanceStatus]] = {
    "high":   _build_pool(93, 3, 2, 2),
    "normal": _build_pool(85, 7, 4, 4),
    "intern": _build_pool(78, 12, 5, 5),
}

# employee_code → profile name
ATTENDANCE_PROFILE: dict[str, str] = {
    "HR-001": "high",   "HR-002": "normal", "HR-003": "normal",
    "IT-001": "high",   "IT-002": "normal", "IT-003": "high",
    "IT-004": "normal", "IT-005": "intern",
    "FIN-001": "high",  "FIN-002": "normal", "FIN-003": "high",  "FIN-004": "normal",
    "OPS-001": "high",  "OPS-002": "normal",
    "ADM-001": "high",  "ADM-002": "normal",
}

# Tom's sick leave starts on this date; LEAVE attendance recorded from here
TOM_LEAVE_START = date(2026, 2, 24)

# Fatima works Mon=0, Wed=2, Fri=4
PART_TIME_WEEKDAYS = {0, 2, 4}


def working_days(start: date, end: date) -> list[date]:
    """Return all Mon–Fri dates between start and end inclusive."""
    days: list[date] = []
    d = start
    while d <= end:
        if d.weekday() < 5:
            days.append(d)
        d += timedelta(days=1)
    return days


# ─────────────────────────────────────────────────────────────────────────────
# Leave request definitions  (16 total)
#
# Bypasses the service-layer overlap guard — this is intentional in a seed.
# ─────────────────────────────────────────────────────────────────────────────

LEAVE_REQUESTS: list[dict] = [

    # ── APPROVED (6) — all in the past ───────────────────────────────────────
    {
        "emp_code":   "IT-002",
        "leave_type": LeaveType.ANNUAL,
        "start":      date(2026, 1, 6),
        "end":        date(2026, 1, 8),
        "reason":     "Family vacation planned around the new year holiday period.",
        "status":     LeaveStatus.APPROVED,
    },
    {
        "emp_code":   "FIN-002",
        "leave_type": LeaveType.SICK,
        "start":      date(2026, 1, 13),
        "end":        date(2026, 1, 14),
        "reason":     "Down with flu and fever; doctor advised two days of rest.",
        "status":     LeaveStatus.APPROVED,
    },
    {
        "emp_code":   "HR-003",
        "leave_type": LeaveType.CASUAL,
        "start":      date(2026, 1, 22),
        "end":        date(2026, 1, 22),
        "reason":     "Personal matter requiring my presence at home.",
        "status":     LeaveStatus.APPROVED,
    },
    {
        "emp_code":   "IT-004",
        "leave_type": LeaveType.ANNUAL,
        "start":      date(2026, 2, 3),
        "end":        date(2026, 2, 7),
        "reason":     "Planned holiday trip to Europe; flights and accommodation booked.",
        "status":     LeaveStatus.APPROVED,
    },
    {
        "emp_code":   "OPS-002",
        "leave_type": LeaveType.SICK,
        "start":      date(2026, 2, 10),
        "end":        date(2026, 2, 11),
        "reason":     "Medical procedure and post-appointment recovery.",
        "status":     LeaveStatus.APPROVED,
    },
    {
        "emp_code":   "ADM-002",
        "leave_type": LeaveType.CASUAL,
        "start":      date(2026, 2, 18),
        "end":        date(2026, 2, 18),
        "reason":     "Attending sibling's wedding ceremony out of town.",
        "status":     LeaveStatus.APPROVED,
    },

    # ── Tom (OPS-003) extended sick leave ─────────────────────────────────────
    {
        "emp_code":   "OPS-003",
        "leave_type": LeaveType.SICK,
        "start":      date(2026, 2, 24),
        "end":        date(2026, 3, 20),
        "reason":     (
            "Extended medical leave following emergency surgery. "
            "Doctor has cleared return to work on March 23."
        ),
        "status":     LeaveStatus.APPROVED,
    },

    # ── REJECTED (4) — various reasons ────────────────────────────────────────
    {
        "emp_code":   "IT-005",
        "leave_type": LeaveType.ANNUAL,
        "start":      date(2026, 1, 27),
        "end":        date(2026, 1, 30),
        "reason":     "Would like a short break before the next sprint begins.",
        "status":     LeaveStatus.REJECTED,
    },
    {
        "emp_code":   "FIN-004",
        "leave_type": LeaveType.UNPAID,
        "start":      date(2026, 2, 2),
        "end":        date(2026, 2, 6),
        "reason":     "Extended personal travel; annual leave balance already exhausted.",
        "status":     LeaveStatus.REJECTED,
    },
    {
        "emp_code":   "HR-002",
        "leave_type": LeaveType.CASUAL,
        "start":      date(2026, 2, 23),
        "end":        date(2026, 2, 24),
        "reason":     "Attending a friend's destination event over the weekend.",
        "status":     LeaveStatus.REJECTED,
    },
    {
        "emp_code":   "IT-003",
        "leave_type": LeaveType.ANNUAL,
        "start":      date(2026, 3, 2),
        "end":        date(2026, 3, 6),
        "reason":     "International travel during the team's critical release week.",
        "status":     LeaveStatus.REJECTED,
    },

    # ── PENDING (5) — recent / upcoming ───────────────────────────────────────
    {
        "emp_code":   "OPS-004",
        "leave_type": LeaveType.SICK,
        "start":      date(2026, 3, 16),
        "end":        date(2026, 3, 17),
        "reason":     "Feeling unwell since yesterday; need to see a doctor and rest.",
        "status":     LeaveStatus.PENDING,
    },
    {
        "emp_code":   "HR-002",
        "leave_type": LeaveType.ANNUAL,
        "start":      date(2026, 3, 17),
        "end":        date(2026, 3, 19),
        "reason":     "Visiting parents for a short break next week.",
        "status":     LeaveStatus.PENDING,
    },
    {
        "emp_code":   "IT-001",
        "leave_type": LeaveType.CASUAL,
        "start":      date(2026, 3, 18),
        "end":        date(2026, 3, 18),
        "reason":     "Attending a family member's graduation ceremony.",
        "status":     LeaveStatus.PENDING,
    },
    {
        "emp_code":   "FIN-003",
        "leave_type": LeaveType.ANNUAL,
        "start":      date(2026, 3, 23),
        "end":        date(2026, 3, 27),
        "reason":     "Spring break family vacation; flights already booked.",
        "status":     LeaveStatus.PENDING,
    },
    {
        "emp_code":   "ADM-001",
        "leave_type": LeaveType.CASUAL,
        "start":      date(2026, 3, 25),
        "end":        date(2026, 3, 25),
        "reason":     "Personal appointment that cannot be rescheduled.",
        "status":     LeaveStatus.PENDING,
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Seed runner
# ─────────────────────────────────────────────────────────────────────────────

async def seed() -> None:
    print("HRMS Lite — seed script")
    print("=" * 50)

    async with AsyncSessionLocal() as db:

        # ── 1. Clear all tables (FK order: dependents first) ──────────────────
        print("\n[1/4] Clearing existing data …")
        await db.execute(text("DELETE FROM leave_requests"))
        await db.execute(text("DELETE FROM attendance"))
        await db.execute(text("DELETE FROM employees"))
        # Reset sequences so IDs start from 1
        for seq in ("employees_id_seq", "attendance_id_seq", "leave_requests_id_seq"):
            await db.execute(text(f"ALTER SEQUENCE {seq} RESTART WITH 1"))
        await db.commit()

        # ── 2. Insert employees ───────────────────────────────────────────────
        print(f"[2/4] Inserting {len(EMPLOYEES)} employees …")
        emp_objects: list[Employee] = []
        for data in EMPLOYEES:
            emp = Employee(**data)
            db.add(emp)
            emp_objects.append(emp)
        await db.flush()

        # Build a lookup: employee_code → DB id
        code_to_id: dict[str, int] = {e.employee_code: e.id for e in emp_objects}

        # ── 3. Generate attendance records ────────────────────────────────────
        print("[3/4] Generating attendance records …")

        # History window: Jan 5 – Mar 13, 2026 (Mon–Fri, ~50 working days)
        history = working_days(date(2026, 1, 5), date(2026, 3, 13))

        attendance_count = 0
        for emp in emp_objects:
            code = emp.employee_code
            emp_id = emp.id

            if code == "OPS-003":
                # Tom is on extended sick leave from Feb 24 onward
                for d in history:
                    att_status = (
                        AttendanceStatus.LEAVE
                        if d >= TOM_LEAVE_START
                        else random.choice(ATTENDANCE_POOLS["normal"])
                    )
                    db.add(Attendance(employee_fk=emp_id, date=d, status=att_status))
                    attendance_count += 1

            elif code == "OPS-004":
                # Fatima works part-time: Mon, Wed, Fri only
                for d in history:
                    if d.weekday() in PART_TIME_WEEKDAYS:
                        att_status = random.choice(ATTENDANCE_POOLS["normal"])
                        db.add(Attendance(employee_fk=emp_id, date=d, status=att_status))
                        attendance_count += 1

            else:
                pool = ATTENDANCE_POOLS[ATTENDANCE_PROFILE.get(code, "normal")]
                for d in history:
                    db.add(Attendance(employee_fk=emp_id, date=d, status=random.choice(pool)))
                    attendance_count += 1

        await db.flush()

        # ── 4. Insert leave requests ──────────────────────────────────────────
        print(f"[4/4] Inserting {len(LEAVE_REQUESTS)} leave requests …")
        for lr in LEAVE_REQUESTS:
            db.add(LeaveRequest(
                employee_fk=code_to_id[lr["emp_code"]],
                leave_type=lr["leave_type"],
                start_date=lr["start"],
                end_date=lr["end"],
                reason=lr["reason"],
                status=lr["status"],
            ))
        await db.flush()

        await db.commit()

    # ── Summary ───────────────────────────────────────────────────────────────
    approved = sum(1 for lr in LEAVE_REQUESTS if lr["status"] == LeaveStatus.APPROVED)
    rejected = sum(1 for lr in LEAVE_REQUESTS if lr["status"] == LeaveStatus.REJECTED)
    pending  = sum(1 for lr in LEAVE_REQUESTS if lr["status"] == LeaveStatus.PENDING)

    print()
    print("Done!")
    print("-" * 50)
    print(f"  Employees:       {len(EMPLOYEES)}")
    print(f"    HR:            {sum(1 for e in EMPLOYEES if e['department'] == 'HR')}")
    print(f"    IT:            {sum(1 for e in EMPLOYEES if e['department'] == 'IT')}")
    print(f"    Finance:       {sum(1 for e in EMPLOYEES if e['department'] == 'Finance')}")
    print(f"    Operations:    {sum(1 for e in EMPLOYEES if e['department'] == 'Operations')}")
    print(f"    Admin:         {sum(1 for e in EMPLOYEES if e['department'] == 'Admin')}")
    print(f"  Attendance:      {attendance_count} records (~50 working days)")
    print(f"  Leave requests:  {len(LEAVE_REQUESTS)}")
    print(f"    Approved:      {approved}")
    print(f"    Rejected:      {rejected}")
    print(f"    Pending:       {pending}")
    print("-" * 50)


if __name__ == "__main__":
    asyncio.run(seed())
