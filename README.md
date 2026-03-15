<h1 align="center">HRMS Lite</h1>

<p align="center">
  A lightweight <strong>Human Resource Management System</strong> built for modern teams.<br/>
  Manage employees, track daily attendance, and process leave requests — all from a clean, responsive interface.
</p>

<p align="center">
  <a href="https://hrms-lite-fnz7.vercel.app" target="_blank"><strong>Live Demo →</strong></a>
  &nbsp;·&nbsp;
  <a href="https://hrms-lite-03kx.onrender.com/docs" target="_blank"><strong>API Docs →</strong></a>
  &nbsp;·&nbsp;
  <a href="https://hrms-lite-03kx.onrender.com/health" target="_blank"><strong>Health Check →</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Modules](#modules)
- [Screenshots](#screenshots)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Future Improvements](#future-improvements)

---

## Overview

HRMS Lite is a full-stack web application designed to give small and medium-sized organisations a practical tool for day-to-day HR operations. It is built with a strict separation of concerns across every layer — from the async FastAPI backend with a clean service layer, to a component-driven React frontend with consistent, reusable UI primitives.

The project is intentionally scoped and well-structured rather than feature-bloated, making it easy to extend, maintain, and deploy.

---

## Features

- **Employee Management** — Create, update, and deactivate employees with duplicate detection on employee code and email
- **Attendance Tracking** — Mark and manage daily attendance per employee with date range filtering and bulk-edit support
- **Leave Requests** — Submit, approve, reject, and delete leave applications with overlap detection and status guards
- **Live Dashboard** — At-a-glance stats: headcount, present/absent today, attendance rate, recently joined employees
- **Consistent API envelope** — Every response follows `{ success, message, data }` — never a surprise shape
- **Business rule enforcement** — Overlap guard, status transition guard, delete-only-pending guard — all enforced in the service layer
- **Type-safe end to end** — Pydantic v2 schemas on the backend, TypeScript strict mode on the frontend
- **CI pipeline** — GitHub Actions runs lint, type-check, tests, and build on every push and pull request

---

## Tech Stack

| Layer       | Technology                                                  |
|-------------|-------------------------------------------------------------|
| Frontend    | React 18, TypeScript 5, React Router v6, Vite               |
| Backend     | FastAPI, Python 3.12, Pydantic v2                           |
| Database    | PostgreSQL 16 (async via asyncpg + SQLAlchemy 2.0)          |
| Migrations  | Alembic                                                     |
| Testing     | Pytest, pytest-asyncio, HTTPX, SQLite (in-process)          |
| Linting     | Ruff (backend), ESLint + Prettier (frontend)                |
| Type checks | mypy (backend), tsc --noEmit (frontend)                     |
| CI/CD       | GitHub Actions                                              |
| Hosting     | Vercel (frontend), Render (backend + PostgreSQL)            |

---

## Architecture

```
hrms-lite/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
│
├── backend/
│   ├── app/
│   │   ├── main.py             # App factory: CORS, exception handlers, router mounts
│   │   ├── core/
│   │   │   ├── config.py       # Settings from .env via Pydantic BaseSettings
│   │   │   └── exceptions.py   # AppError → NotFoundError, DuplicateEntryError, BusinessRuleError
│   │   ├── db/
│   │   │   ├── base.py         # SQLAlchemy DeclarativeBase
│   │   │   └── session.py      # Async engine, session factory, get_db dependency
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic v2 request/response schemas
│   │   ├── services/           # Business logic (one class per resource)
│   │   └── routers/            # FastAPI route handlers (thin — delegate to services)
│   ├── tests/                  # pytest test suite (SQLite in-process, no Postgres needed)
│   ├── requirements.txt
│   ├── pyproject.toml          # ruff, mypy, pytest config
│   └── render.yaml             # Render deployment config
│
└── frontend/
    └── src/
        ├── api/                # Typed fetch client + per-resource API modules
        ├── components/
        │   ├── layout/         # AppLayout, Sidebar, Topbar
        │   └── ui/             # Button, Card, Table, Badge, Toast, Spinner, EmptyState…
        ├── pages/              # One folder per module (Dashboard, Employees, Attendance, Leave)
        ├── constants/          # Shared label maps and badge class maps
        └── utils/              # Date formatting, cn() classname helper
```

**Key architectural decisions:**

- **Service layer pattern** — Routers are thin HTTP adapters; all business logic lives in services. Services raise typed exceptions (`NotFoundError`, `BusinessRuleError`) that routers convert to HTTP responses.
- **Async throughout** — FastAPI + asyncpg + SQLAlchemy async sessions for non-blocking I/O.
- **Duplicate safety** — Application-level pre-check query + `IntegrityError` fallback for race-condition safety.
- **Typed API client** — Frontend fetch wrapper returns typed `ApiResponse<T>` objects and maps HTTP errors to user-readable messages via `mapApiError()`.
- **Unified UI primitives** — A single `Badge` system, a single `Button` component, and consistent CSS variables mean no divergent styles across pages.

---

## Modules

### Dashboard
The landing page gives HR managers an instant overview: total headcount, employees present and absent today, attendance rate, department count, a "recently joined" employees table, and today's attendance summary — all fetched in a single API call.

### Employees
Full employee lifecycle management. Create employees with a code, name, email, department, employment type (full-time / part-time / contract / intern), and status. Inline editing via an edit modal. Duplicate detection on both employee code and email. Client-side search and filter by department, status, and employment type.

### Attendance
Mark daily attendance for any employee as Present, Absent, Leave, or Half-Day. View history with a date range filter. Bulk-update support for correcting records. The backend enforces a unique constraint per employee per date — no double-marking possible.

### Leave Requests
Submit leave applications for any employee with type, date range, and reason. The service layer enforces:
- Date overlap guard (no overlapping PENDING or APPROVED requests)
- Status transition guard (only PENDING requests can be approved/rejected)
- Delete guard (only PENDING requests can be deleted — approved/rejected are kept for audit)

HR can approve, reject, or delete requests directly from the table. Status-filtered views and employee-filtered views are available via the toolbar.

---

## Screenshots

> Add screenshots here after deploying or running locally.

| Dashboard | Employees |
|-----------|-----------|
| *(screenshot)* | *(screenshot)* |

| Attendance | Leave Requests |
|------------|----------------|
| *(screenshot)* | *(screenshot)* |

---

## Local Setup

### Prerequisites

- Python 3.12+
- Node.js 20+ (LTS) + npm
- PostgreSQL 14+ running locally (or use the SQLite-backed test suite)

### 1. Clone

```bash
git clone https://github.com/<your-username>/hrms-lite.git
cd hrms-lite
```

### 2. Database

```sql
CREATE USER hrms_user WITH PASSWORD 'changeme';
CREATE DATABASE hrms_lite OWNER hrms_user;
```

Then run Alembic migrations:

```bash
cd backend
alembic upgrade head
```

### 3. Backend

```bash
cd backend

python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env             # then edit .env with your DB credentials

uvicorn app.main:app --reload
```

Backend: **http://localhost:8000**
Interactive API docs: **http://localhost:8000/docs**

### 4. Frontend

```bash
cd frontend

cp .env.example .env             # VITE_API_BASE_URL defaults to http://localhost:8000

npm install
npm run dev
```

Frontend: **http://localhost:5173**

### 5. Seed data (optional)

Load 18 realistic demo employees with attendance history and leave requests:

```bash
cd backend
source .venv/bin/activate
python seed.py
```

### Makefile shortcuts

```bash
make install       # install backend + frontend dependencies
make check         # run all lint, format, and type checks
make test          # run backend test suite
make fix           # auto-fix all fixable lint and format issues
```

---

## Environment Variables

### Backend — `backend/.env`

| Variable                      | Default                         | Description                               |
|-------------------------------|---------------------------------|-------------------------------------------|
| `APP_NAME`                    | `HRMS Lite`                     | Application name                          |
| `APP_ENV`                     | `development`                   | `development` or `production`             |
| `APP_DEBUG`                   | `true`                          | Enable SQL query logging                  |
| `APP_HOST`                    | `0.0.0.0`                       | Uvicorn bind host                         |
| `APP_PORT`                    | `8000`                          | Uvicorn bind port                         |
| `DB_HOST`                     | `localhost`                     | PostgreSQL host                           |
| `DB_PORT`                     | `5432`                          | PostgreSQL port                           |
| `DB_NAME`                     | `hrms_lite`                     | Database name                             |
| `DB_USER`                     | `hrms_user`                     | Database user                             |
| `DB_PASSWORD`                 | `changeme`                      | Database password                         |
| `SECRET_KEY`                  | *(required)*                    | Secret key for signing                    |
| `CORS_ORIGINS`                | `["http://localhost:5173"]`     | Allowed CORS origins (JSON array)         |

### Frontend — `frontend/.env`

| Variable            | Default                   | Description              |
|---------------------|---------------------------|--------------------------|
| `VITE_API_BASE_URL` | `http://localhost:8000`   | Backend API base URL     |

---

## API Reference

All endpoints return:

```json
{ "success": true,  "message": "OK",       "data": { ... } }
{ "success": false, "message": "...",       "errors": [ ... ] }
```

### Employees

| Method   | Endpoint                   | Description                              |
|----------|----------------------------|------------------------------------------|
| `GET`    | `/api/v1/employees/`       | List all employees                       |
| `POST`   | `/api/v1/employees/`       | Create employee (409 on duplicate)       |
| `GET`    | `/api/v1/employees/{id}`   | Get employee by ID (404 if not found)    |
| `PATCH`  | `/api/v1/employees/{id}`   | Update employee fields                   |
| `DELETE` | `/api/v1/employees/{id}`   | Delete employee (cascades attendance)    |

### Attendance

| Method  | Endpoint                                 | Description                                    |
|---------|------------------------------------------|------------------------------------------------|
| `GET`   | `/api/v1/employees/{id}/attendance`      | List records (optional `?from=&to=` filter)    |
| `POST`  | `/api/v1/employees/{id}/attendance`      | Mark attendance (409 if already marked)        |
| `PATCH` | `/api/v1/attendance/{id}`               | Update a record's status                       |

### Leave Requests

| Method   | Endpoint                         | Description                                       |
|----------|----------------------------------|---------------------------------------------------|
| `GET`    | `/api/v1/leave-requests/`        | List all requests (optional `?status=` filter)    |
| `POST`   | `/api/v1/employees/{id}/leave`   | Submit a leave request (422 on overlap)           |
| `GET`    | `/api/v1/leave-requests/{id}`    | Get single request                                |
| `PATCH`  | `/api/v1/leave-requests/{id}`    | Approve or reject (422 if not PENDING)            |
| `DELETE` | `/api/v1/leave-requests/{id}`    | Delete (422 if not PENDING)                       |

### Utility

| Method | Endpoint    | Description                      |
|--------|-------------|----------------------------------|
| `GET`  | `/health`   | Server health check              |
| `GET`  | `/api/v1/dashboard/stats` | Dashboard summary stats |

Full interactive docs: **http://localhost:8000/docs**

---

## Running Tests

The test suite uses an in-process SQLite database — no PostgreSQL required.

```bash
cd backend
source .venv/bin/activate

pytest                              # run all tests
pytest -v                           # verbose output
pytest tests/test_employees.py      # single file
pytest tests/test_attendance.py     # single file
```

Or from the project root:

```bash
make test
```

---

## Deployment

The project is deployed with zero-config infrastructure:

| Service  | Provider | URL |
|----------|----------|-----|
| Frontend | Vercel   | https://hrms-lite-fnz7.vercel.app |
| Backend  | Render   | https://hrms-lite-03kx.onrender.com |
| Database | Render PostgreSQL | Managed, internal networking |

### Backend (Render)

`render.yaml` at the project root configures the Render service and database automatically. On first deploy:

1. Push the repo to GitHub and connect it to Render
2. Render reads `render.yaml` and provisions the web service + managed PostgreSQL
3. Set any missing environment variables in the Render dashboard
4. Trigger a deploy — Render runs `pip install -r requirements.txt` then starts uvicorn

### Frontend (Vercel)

1. Import the repo into Vercel
2. Set the root directory to `frontend`
3. Set `VITE_API_BASE_URL` to your Render backend URL
4. Vercel runs `npm run build` automatically on every push to main

### CI (GitHub Actions)

Every push and pull request triggers two parallel jobs:

- **Backend** — `ruff check`, `pytest`
- **Frontend** — `tsc --noEmit`, `eslint`, `vite build`

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Future Improvements

| Feature | Description |
|---------|-------------|
| Authentication | JWT-based login with role separation (Admin / HR / Employee) |
| Payroll module | Basic salary computation from attendance records |
| Notifications | Email alerts on leave approval/rejection |
| Reporting | Exportable CSV/PDF reports for attendance and leave |
| Calendar view | Visual monthly attendance and leave calendar per employee |
| Audit log | Immutable record of all status changes and data edits |
| Mobile app | React Native companion app for employees to self-serve |
| Pagination | Server-side pagination for large employee rosters |

---

<p align="center">Built with FastAPI · React · PostgreSQL</p>
