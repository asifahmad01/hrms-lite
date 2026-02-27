# HRMS Lite

A lightweight **Human Resource Management System** built with a React TypeScript frontend, FastAPI Python backend, and PostgreSQL database. Manage employees and track daily attendance through a clean, responsive dashboard.

---

## Features

- **Employee Management** — Create, list, and delete employees with duplicate detection on employee ID and email
- **Attendance Tracking** — Mark daily attendance (Present/Absent) per employee with date range filtering
- **Async API** — Fully async FastAPI backend with SQLAlchemy 2.0 ORM
- **Type-safe** — TypeScript frontend with Pydantic v2 schemas on the backend
- **Toast notifications** — Real-time success/error feedback in the UI
- **Consistent error handling** — Centralized HTTP error envelope (`success`, `message`, `data`)

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 18, TypeScript, React Router v6, Vite     |
| Backend   | FastAPI, Python 3.11+, Pydantic v2              |
| Database  | PostgreSQL (async via asyncpg + SQLAlchemy 2.0) |
| Testing   | Pytest, pytest-asyncio, HTTPX                   |
| Migrations| Alembic                                         |

---

## Project Structure

```
hrms-lite/
├── backend/
│   ├── app/
│   │   ├── main.py              # App factory: CORS, exception handlers, router mounts
│   │   ├── core/
│   │   │   ├── config.py        # Settings loaded from .env (BaseSettings)
│   │   │   └── exceptions.py    # AppError, NotFoundError, DuplicateEntryError
│   │   ├── db/
│   │   │   ├── base.py          # SQLAlchemy DeclarativeBase
│   │   │   └── session.py       # Async engine, session factory, get_db dependency
│   │   ├── models/
│   │   │   ├── employee.py      # Employee ORM model
│   │   │   └── attendance.py    # Attendance ORM model + status enum
│   │   ├── schemas/
│   │   │   ├── common.py        # APIResponse / ErrorResponse envelopes
│   │   │   ├── employee.py      # EmployeeCreate, EmployeeUpdate, EmployeeRead
│   │   │   └── attendance.py    # AttendanceMark, AttendanceRead, date filter
│   │   ├── services/
│   │   │   ├── employee.py      # CRUD with duplicate-check logic
│   │   │   └── attendance.py    # Mark, list, update attendance; date range queries
│   │   └── routers/
│   │       ├── employees.py     # /api/v1/employees/* endpoints
│   │       └── attendance.py    # /api/v1/employees/{id}/attendance/* endpoints
│   ├── tests/
│   │   ├── conftest.py          # Fixtures: SQLite in-memory DB override
│   │   ├── test_employees.py    # Employee CRUD and duplicate tests
│   │   └── test_attendance.py   # Attendance unique-per-date constraint tests
│   ├── database/
│   │   ├── schema_postgres.sql  # PostgreSQL DDL (enums, indexes, FK cascades)
│   │   └── schema_mysql.sql     # MySQL DDL variant
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts        # Fetch wrapper with ApiError typing
│   │   │   ├── employees.ts     # Employee API calls
│   │   │   ├── attendance.ts    # Attendance API calls
│   │   │   └── errors.ts        # HTTP status → user-friendly message mapping
│   │   ├── components/
│   │   │   ├── layout/          # AppLayout, Sidebar, Topbar
│   │   │   └── ui/              # Button, Card, Table, Badge, Spinner, Toast
│   │   ├── pages/
│   │   │   ├── employees/       # Employee list + create modal
│   │   │   └── attendance/      # Mark attendance + history with date filter
│   │   ├── routes/index.tsx     # React Router config
│   │   └── utils/               # Date formatting, classname helper
│   ├── vite.config.ts           # Dev proxy: /api → http://localhost:8000
│   ├── package.json
│   └── .env.example
│
└── README.md
```

---

## Prerequisites

- **Python 3.11+**
- **Node.js** (LTS) + npm
- **PostgreSQL** (running locally or accessible over the network)

---

## Getting Started

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_URL>/hrms-lite.git
cd hrms-lite
```

### 2. Database setup

Create the PostgreSQL database and user:

```sql
CREATE USER hrms_user WITH PASSWORD 'changeme';
CREATE DATABASE hrms_lite OWNER hrms_user;
```

Apply the schema:

```bash
psql -U hrms_user -d hrms_lite -f backend/database/schema_postgres.sql
```

### 3. Backend setup

```bash
cd backend

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your DB credentials and a strong SECRET_KEY

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
uvicorn app.main:app --reload
```

The backend will be available at **http://localhost:8000**.

> Interactive API docs: **http://localhost:8000/docs**

### 4. Frontend setup

Open a new terminal:

```bash
cd frontend

# Copy and configure environment variables
cp .env.example .env
# VITE_API_BASE_URL defaults to http://localhost:8000

# Install dependencies
npm install

# Start the Vite dev server
npm run dev
```

The frontend will be available at **http://localhost:5173**.

---

## Environment Variables

### Backend — `backend/.env`

| Variable                    | Default                        | Description                              |
|-----------------------------|--------------------------------|------------------------------------------|
| `APP_NAME`                  | `HRMS Lite`                    | Application name                         |
| `APP_ENV`                   | `development`                  | Environment (`development`/`production`) |
| `APP_DEBUG`                 | `true`                         | Enable debug mode                        |
| `APP_HOST`                  | `0.0.0.0`                      | Bind host for uvicorn                    |
| `APP_PORT`                  | `8000`                         | Bind port for uvicorn                    |
| `DB_HOST`                   | `localhost`                    | PostgreSQL host                          |
| `DB_PORT`                   | `5432`                         | PostgreSQL port                          |
| `DB_NAME`                   | `hrms_lite`                    | Database name                            |
| `DB_USER`                   | `hrms_user`                    | Database user                            |
| `DB_PASSWORD`               | `changeme`                     | Database password                        |
| `SECRET_KEY`                | *(change this)*                | Secret key for token signing             |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60`                         | Token expiry in minutes                  |
| `CORS_ORIGINS`              | `["http://localhost:5173"]`    | Allowed CORS origins (JSON array)        |

### Frontend — `frontend/.env`

| Variable            | Default                   | Description              |
|---------------------|---------------------------|--------------------------|
| `VITE_API_BASE_URL` | `http://localhost:8000`   | Backend API base URL     |
| `VITE_APP_NAME`     | `HRMS Lite`               | App display name         |

---

## API Reference

### Health

| Method | Endpoint  | Description   |
|--------|-----------|---------------|
| GET    | `/health` | Server status |

### Employees

| Method | Endpoint                     | Description                            |
|--------|------------------------------|----------------------------------------|
| GET    | `/api/v1/employees/`         | List all employees                     |
| POST   | `/api/v1/employees/`         | Create a new employee (201 / 409)      |
| GET    | `/api/v1/employees/{id}`     | Get a single employee (404 if missing) |
| PATCH  | `/api/v1/employees/{id}`     | Update employee fields                 |
| DELETE | `/api/v1/employees/{id}`     | Delete employee (cascades attendance)  |

### Attendance

| Method | Endpoint                                                          | Description                                     |
|--------|-------------------------------------------------------------------|-------------------------------------------------|
| GET    | `/api/v1/employees/{id}/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD` | List attendance (optional date range filter)   |
| POST   | `/api/v1/employees/{id}/attendance`                               | Mark attendance (201 / 409 if already marked)  |

All responses follow a consistent envelope:

```json
{ "success": true,  "message": "...", "data": { ... } }
{ "success": false, "message": "...", "errors": [ ... ] }
```

---

## Database Schema

### `employees`

| Column        | Type           | Constraints              |
|---------------|----------------|--------------------------|
| `id`          | SERIAL         | PRIMARY KEY              |
| `employee_id` | VARCHAR(20)    | UNIQUE, NOT NULL         |
| `full_name`   | VARCHAR(255)   | NOT NULL                 |
| `email`       | VARCHAR(255)   | UNIQUE, NOT NULL         |
| `department`  | VARCHAR(100)   | NOT NULL                 |
| `created_at`  | TIMESTAMPTZ    | DEFAULT NOW()            |

### `attendance`

| Column         | Type                 | Constraints                          |
|----------------|----------------------|--------------------------------------|
| `id`           | SERIAL               | PRIMARY KEY                          |
| `employee_fk`  | INTEGER              | FK → employees(id) ON DELETE CASCADE |
| `date`         | DATE                 | NOT NULL                             |
| `status`       | attendance_status    | ENUM (PRESENT, ABSENT), NOT NULL     |
| `created_at`   | TIMESTAMPTZ          | DEFAULT NOW()                        |
|                |                      | UNIQUE(employee_fk, date)            |

---

## Running Tests

```bash
cd backend
source .venv/bin/activate

pytest                    # run all tests
pytest -v                 # verbose output
pytest tests/test_employees.py   # single file
```

Tests use an **in-memory SQLite** database (no PostgreSQL required) via `conftest.py` overrides.

---

## Building for Production

### Backend

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Frontend

```bash
cd frontend
npm run build        # outputs to frontend/dist/
npm run preview      # preview the production build locally
```

Serve the `dist/` folder with any static file host (Nginx, Vercel, Netlify, etc.) and point `VITE_API_BASE_URL` to your deployed backend.

---

## Architecture Notes

- **Service layer pattern** — Routers delegate to services; services contain all business logic; models are pure ORM definitions.
- **Async throughout** — FastAPI + asyncpg + SQLAlchemy async sessions for non-blocking I/O.
- **Duplicate safety** — Application-level pre-check + database `IntegrityError` fallback for race-condition safety.
- **Typed API client** — Frontend fetch wrapper returns typed `ApiResponse<T>` objects and maps HTTP errors to user-readable messages.
- **Component composition** — Reusable UI primitives (Button, Card, Badge, Table, Toast) keep page components clean.
