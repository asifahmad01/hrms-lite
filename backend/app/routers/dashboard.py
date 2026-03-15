from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.common import APIResponse
from app.schemas.dashboard import DashboardStats
from app.services.dashboard import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ── Dependency ────────────────────────────────────────────────────────────────

def _svc(db: AsyncSession = Depends(get_db)) -> DashboardService:
    return DashboardService(db)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/stats",
    response_model=APIResponse[DashboardStats],
    summary="Dashboard KPI stats",
    description=(
        "Returns all data required to render the dashboard page in a single "
        "request: employee counts, today's attendance totals, recent hires, "
        "and today's attendance summary."
    ),
)
async def get_dashboard_stats(
    svc: DashboardService = Depends(_svc),
) -> APIResponse[DashboardStats]:
    stats = await svc.get_stats()
    return APIResponse(message="Dashboard stats loaded.", data=stats)
