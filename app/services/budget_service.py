"""
Budget Service
Handles all budget-related business logic including CRUD, progress calculation,
bill cycle management, and alerts.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timezone
from uuid import UUID
from decimal import Decimal
from typing import List, Optional, Dict, Any
import logging

from app.models.budget import Budget, BudgetPeriod, BillRecurrence, BudgetStatus, BillStatus
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category import Category
from app.schemas.budget import (
    BudgetCreate, BudgetUpdate, SpendingLimitUpdate,
    BudgetProgressResponse, BudgetAlertResponse, BudgetSummaryResponse,
    BudgetGroupResponse, BudgetResponse, AlertType
)
from app.api.dependencies.date_range import DateRangeHelper
from app.core.exceptions import (
    BudgetNotFoundException,
    BudgetAlreadyExistsException,
    InvalidPeriodException,
    CategoryNotFoundException
)

logger = logging.getLogger(__name__)

class BudgetService:
    """Service for budget management"""
    @staticmethod
    def create_budget(db: Session, user_id: UUID, data: BudgetCreate) -> BudgetResponse:
        """Create a new budget or bill."""
        # Verify category exists
        category = db.query(Category).filter(
            Category.category_id == data.category_id,
            Category.user_id == user_id
        ).first()
        if not category:
            raise CategoryNotFoundException()
        
        # Determine end date for custom periods
        end_date = data.end_date
        if data.period != BudgetPeriod.CUSTOM and not end_date:
            # Calculate based on period
            start = data.start_date
            if data.period == BudgetPeriod.DAILY:
                end_date = start.replace(hour=23, minute=59, second=59)
            elif data.period == BudgetPeriod.WEEKLY:
                end_date = start + timedelta(days=6)
                end_date = end_date.replace(hour=23, minute=59, second=59)
            elif data.period == BudgetPeriod.MONTHLY:
                if start.month == 12:
                    end_date = start.replace(year=start.year + 1, month=1, day=1) - timedelta(microseconds=1)
                else:
                    end_date = start.replace(month=start.month + 1, day=1) - timedelta(microseconds=1)
            elif data.period == BudgetPeriod.QUARTERLY:
                # Simple approximation - 90 days
                end_date = start + timedelta(days=90)
            elif data.period == BudgetPeriod.YEARLY:
                end_date = start.replace(year=start.year + 1) - timedelta(microseconds=1)
        
        # Check for overlapping budget with same category
        existing = db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.category_id == data.category_id,
            Budget.period == data.period,
            Budget.start_date <= end_date,
            Budget.end_date >= data.start_date
        ).first()
        
        if existing:
            raise BudgetAlreadyExistsException()
        
        # Create budget
        budget = Budget(
            user_id=user_id,
            category_id=data.category_id,
            amount=data.amount,
            period=data.period,
            start_date=data.start_date,
            end_date=data.end_date,
            threshold=data.threshold,
            is_bill=data.is_bill,
            bill_name=data.bill_name,
            due_date=data.due_date,
            recurrence=data.recurrence,
            icon_url=data.icon_url,
            status=BillStatus.PENDING if data.is_bill else None,
        )
        
        db.add(budget)
        db.commit()
        db.refresh(budget)
        
        logger.info(f"Created {'bill' if data.is_bill else 'budget'} for user {user_id}")
        return BudgetResponse.model_validate(budget)
    
    @staticmethod
    def get_budget(db: Session, user_id: UUID, budget_id: UUID) -> BudgetResponse:
        """Get a single budget by ID."""
        budget = db.query(Budget).filter(
            Budget.budget_id == budget_id,
            Budget.user_id == user_id
        ).first()
        
        if not budget:
            raise BudgetNotFoundException(budget_id)
        
        return BudgetResponse.model_validate(budget)
    
    @staticmethod
    def get_budgets(
        db: Session,
        user_id: UUID,
        period: Optional[BudgetPeriod] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        category_id: Optional[UUID] = None,
        is_bill: Optional[bool] = None
    ) -> List[Budget]:
        """Get flat list of budgets with filters."""
        query = db.query(Budget).filter(Budget.user_id == user_id)
        
        if period:
            query = query.filter(Budget.period == period)
        
        if start_date:
            query = query.filter(Budget.start_date >= start_date)
        
        if end_date:
            query = query.filter(Budget.end_date <= end_date)
        
        if category_id:
            query = query.filter(Budget.category_id == category_id)
        
        if is_bill is not None:
            query = query.filter(Budget.is_bill == is_bill)
        
        return query.order_by(Budget.created_at.desc()).all()
    
    @staticmethod
    def update_budget(
        db: Session,
        user_id: UUID,
        budget_id: UUID,
        data: BudgetUpdate
    ) -> Budget:
        """Update a budget or bill."""
        budget = BudgetService.get_budget(db, user_id, budget_id)
        
        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        
        # Handle bill status change to PAID
        if budget.is_bill and update_data.get('bill_status') == BillStatus.PAID:
            # Advance bill cycle
            budget = BudgetService._advance_bill_cycle(db, budget)
            # Remove bill_status from update_data to avoid conflict
            update_data.pop('bill_status', None)
        
        # Apply remaining updates
        for field, value in update_data.items():
            setattr(budget, field, value)
        
        budget.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(budget)
        
        logger.info(f"Updated {'bill' if budget.is_bill else 'budget'} {budget_id}")
        return budget
    
    @staticmethod
    def delete_budget(db: Session, user_id: UUID, budget_id: UUID) -> None:
        """Delete a budget."""
        budget = BudgetService.get_budget(db, user_id, budget_id)
        
        db.delete(budget)
        db.commit()
        
        logger.info(f"Deleted budget {budget_id}")
        
    # @staticmethod
    # def _advance_bill_cycle(db: Session, budget: Budget) -> Budget:
    #     """Advance bill cycle when marked as paid."""
    #     if not budget.is_bill or not budget.recurrence:
    #         return budget
        
    #     # Advance due date
    #     new_due_date = BillCycleHelper.advance_due_date(budget.due_date, budget.recurrence)
        
    #     # Update budget
    #     budget.due_date = new_due_date
    #     budget.bill_status = BillStatus.PENDING
        
    #     # Reset period dates if needed
    #     start, end = BudgetPeriodHelper.get_period_dates(budget.period, new_due_date)
    #     budget.start_date = start
    #     budget.end_date = end
        
    #     logger.info(f"Advanced bill cycle for {budget.bill_name}, new due date: {new_due_date}")
        
    #     return budget