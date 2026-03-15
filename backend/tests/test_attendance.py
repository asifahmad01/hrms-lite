from datetime import date

from httpx import AsyncClient
import pytest


async def _create_employee(client: AsyncClient) -> int:
    payload = {
        "employee_id": "EMP-A1",
        "full_name": "Attendance Tester",
        "email": "attend@example.com",
        "department": "QA",
    }
    resp = await client.post("/api/v1/employees/", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    return body["data"]["id"]


@pytest.mark.asyncio
async def test_attendance_unique_per_date(client: AsyncClient) -> None:
    employee_id = await _create_employee(client)
    test_date = date(2024, 1, 1).isoformat()

    # First mark should succeed
    payload = {"date": test_date, "status": "PRESENT"}
    resp = await client.post(
        f"/api/v1/employees/{employee_id}/attendance", json=payload
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["data"]["date"] == test_date
    assert body["data"]["status"] == "PRESENT"

    # Second mark for the same employee & date should fail with 409
    resp = await client.post(
        f"/api/v1/employees/{employee_id}/attendance", json=payload
    )
    assert resp.status_code == 409
    body = resp.json()
    # Error message should indicate duplicate attendance date
    assert "attendance" in body["message"].lower() or "date" in body["message"].lower()

