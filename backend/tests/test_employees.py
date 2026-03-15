from httpx import AsyncClient
import pytest


@pytest.mark.asyncio
async def test_employee_create_list_delete_flow(client: AsyncClient) -> None:
    # Create a new employee
    create_payload = {
        "employee_code": "EMP-001",
        "full_name": "Alice Example",
        "email": "alice@example.com",
        "department": "Engineering",
    }
    resp = await client.post("/api/v1/employees/", json=create_payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["data"]["employee_code"] == create_payload["employee_code"]
    assert body["data"]["email"] == create_payload["email"]
    employee_code = body["data"]["id"]

    # List employees should include the created employee
    resp = await client.get("/api/v1/employees/")
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body["data"], list)
    assert any(e["id"] == employee_code for e in body["data"])

    # Delete the employee
    resp = await client.delete(f"/api/v1/employees/{employee_code}")
    assert resp.status_code == 200
    body = resp.json()
    assert "deleted" in body["message"].lower()

    # Listing again should not contain the deleted employee
    resp = await client.get("/api/v1/employees/")
    assert resp.status_code == 200
    body = resp.json()
    assert all(e["id"] != employee_code for e in body["data"])


@pytest.mark.asyncio
async def test_employee_create_duplicate_employee_code(client: AsyncClient) -> None:
    # First employee with a given employee_code
    payload1 = {
        "employee_code": "EMP-100",
        "full_name": "Bob One",
        "email": "bob1@example.com",
        "department": "HR",
    }
    resp = await client.post("/api/v1/employees/", json=payload1)
    assert resp.status_code == 201

    # Second employee with same employee_code but different email should fail with 409
    payload2 = {
        "employee_code": "EMP-100",
        "full_name": "Bob Two",
        "email": "bob2@example.com",
        "department": "HR",
    }
    resp = await client.post("/api/v1/employees/", json=payload2)
    assert resp.status_code == 409
    body = resp.json()
    # Our error envelope should expose a clear duplicate message
    assert "employee_code" in body["message"].lower()

