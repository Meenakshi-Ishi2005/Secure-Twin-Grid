from fastapi import APIRouter
from app.core.config import settings
from app.core.database import check_db_connection
from app.schemas.health import HealthResponse, DatabaseHealth

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
def get_health() -> HealthResponse:
    """Return health status of the API and its underlying services."""
    db_status = check_db_connection()
    return HealthResponse(
        status="healthy",
        project_name=settings.PROJECT_NAME,
        environment=settings.ENVIRONMENT,
        version="0.1.0",
        database=DatabaseHealth(
            status=db_status.get("status", "unknown"),
            database_type=db_status.get("database_type", "unknown"),
            host=db_status.get("host"),
            error=db_status.get("error"),
        ),
    )
