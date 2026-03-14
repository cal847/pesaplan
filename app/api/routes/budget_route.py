"""
Budget Router
Provides endpoints for budget management, progress tracking, and bill handling.
"""

from fastapi import APIRouter, status, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.schemas.budget import BudgetResponse, BudgetCreate, BudgetSummaryResponse, BudgetUpdate, BudgetAlertResponse, SpendingLimitUpdate, BudgetProgressResponse, SpendingLimitResponse
from app.models.user import User
from app.models.budget import BudgetPeriod
from app.api.dependencies.auth import get_current_user
from app.services.budget_service import BudgetService
from app.utils.budget_helpers import get_budget_or_raise
from app.database import get_db
from uuid import UUID

router = APIRouter(prefix="/budgets", tags=["budgets"])

@router.get("/summary", response_model=BudgetSummaryResponse)
async def get_budget_summary(
    period: Optional[BudgetPeriod] = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get period summary with totals and spending limit."""
    summary = BudgetService.get_budget_summary(
        db,
        current_user.user_id,
        period,
    )
    return summary

@router.get("/alerts", response_model=List[BudgetAlertResponse])
async def get_budget_alerts(
    period: BudgetPeriod = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get active threshold and bill alerts."""
    return BudgetService.get_budget_alerts(db, current_user.user_id, period)

@router.get("/spending-limit", response_model=SpendingLimitResponse)
async def get_spending_limit(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get global spending limit."""
    return BudgetService.get_spending_limit(db, current_user.user_id)

@router.put("/spending-limit", response_model=SpendingLimitResponse)
async def update_spending_limit(
    data: SpendingLimitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update global spending limit."""
    return BudgetService.update_spending_limit(db, current_user.user_id, data)
     

@router.get("/progress", response_model=BudgetProgressResponse)
def get_budget_progress(
    period: BudgetPeriod = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Global spending progress vs spending limit."""
    return BudgetService.calculate_budget_progress(db, current_user.user_id, period)
 
@router.get("", response_model=List[BudgetResponse])
async def get_budgets(
    category_id: Optional[UUID] = Query(None),
    period: Optional[BudgetPeriod] = Query(None),
    is_bill: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Gets a flat list of budgets with optional filters"""
    return BudgetService.get_budgets(
        db,
        current_user.user_id,
        period=period,
        category_id=category_id,
        is_bill=is_bill
    )

@router.get("/{budget_id}", response_model=BudgetResponse)
async def get_budget(
    budget_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single budget"""
    return get_budget_or_raise(db, current_user.user_id, budget_id)

@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    data: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new budget/bill"""
    return BudgetService.create_budget(db, current_user.user_id, data)
    
@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: UUID,
    data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a budget or bill."""
    return BudgetService.update_budget(db, current_user.user_id, budget_id, data)
    
    # Get category name
    # from app.models.category import Category
    # category = db.query(Category).filter(
    #     Category.category_id == budget.category_id
    # ).first()
    
    # response = BudgetResponse.model_validate(budget)
    # response.category_name = category.name if category else None
    # return response
    
@router.delete("/{budget_id}", status_code=204)
def delete_budget(
    budget_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a budget."""
    BudgetService.delete_budget(db, current_user.user_id, budget_id)
