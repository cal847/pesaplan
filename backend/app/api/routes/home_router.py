# Endpoint for home dashboard

# app/api/v1/home.py
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
import logging

from app.database import get_db
from app.services.home_service import HomeService
from app.schemas.home import HomeSummary
from app.api.dependencies.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/home", tags=["home"])
logger = logging.getLogger(__name__)


@router.get("", response_model=HomeSummary)
def get_home_summary(
    period: str = Query(default="monthly", enum=["daily", "weekly", "monthly", "yearly"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        service = HomeService(db)
        return service.get_home_summary(current_user.user_id, period)
    except Exception as e:
        logger.error("get_home_summary_failed", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard data"
        )