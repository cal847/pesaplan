from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Literal
import logging

from app.database import get_db
from app.models.user import User
from app.api.dependencies.auth import get_current_user
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import (
    SpendingByCategoryResponse,
    SpendingByMerchantResponse,
    IncomeExpenseTrendResponse,
    SavingsRateResponse,
    GoalsAchievedResponse
)

router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)

@router.get("/spending-by-category", response_model=SpendingByCategoryResponse)
def get_spending_by_category(
    period: Literal["daily", "weekly", "monthly", "yearly"] = Query("monthly"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get spending breakdown by category."""
    try:
        service = AnalyticsService(db)
        return service.get_spending_by_category(current_user.user_id, period)
    except Exception as e:
        logger.error(f"Failed to fetch spending by category: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")

@router.get("/spending-by-merchant", response_model=SpendingByMerchantResponse)
def get_spending_by_merchant(
    period: Literal["daily", "weekly", "monthly", "yearly"] = Query("monthly"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get spending breakdown by merchant."""
    try:
        service = AnalyticsService(db)
        return service.get_spending_by_merchant(current_user.user_id, period)
    except Exception as e:
        logger.error(f"Failed to fetch spending by merchant: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")

@router.get("/income-expense-trend", response_model=IncomeExpenseTrendResponse)
def get_income_expense_trend(
    period: Literal["daily", "weekly", "monthly", "yearly"] = Query("monthly"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get income vs expenses trend."""
    try:
        service = AnalyticsService(db)
        return service.get_income_expense_trend(current_user.user_id, period)
    except Exception as e:
        logger.error(f"Failed to fetch income/expense trend: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")

@router.get("/savings", response_model=SavingsRateResponse)
def get_savings_rate(
    period: Literal["daily", "weekly", "monthly", "yearly"] = Query("monthly"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get savings rate."""
    try:
        service = AnalyticsService(db)
        return service.get_savings_rate(current_user.user_id, period)
    except Exception as e:
        logger.error(f"Failed to fetch savings rate: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")

@router.get("/goals", response_model=GoalsAchievedResponse)
def get_goals_achieved(
    period: Literal["daily", "weekly", "monthly", "yearly"] = Query("monthly"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get goals achievement statistics."""
    try:
        service = AnalyticsService(db)
        return service.get_goals_achieved(current_user.user_id, period)
    except Exception as e:
        logger.error(f"Failed to fetch goals analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")