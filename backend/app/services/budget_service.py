"""
Budget Service
Handles all budget-related business logic including CRUD, progress calculation,
bill cycle management, and alerts.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
from uuid import UUID
from decimal import Decimal
from typing import List, Optional
import logging

from app.models.budget import Budget, BudgetPeriod, BillStatus
from app.models.notification import Notification
from app.models.user import User
from app.models.transaction import Transaction, TransactionType
from app.models.category import Category
from app.utils.budget_helpers import get_budget_or_raise, get_period_dates, advance_bill_cycle
from app.api.dependencies.auth import get_user_by_id
from app.schemas.budget import (
    BudgetCreate, BudgetUpdate, SpendingLimitUpdate,
    BudgetProgressResponse, BudgetAlertResponse, BudgetSummaryResponse, 
    BudgetGroupResponse, BudgetResponse, SpendingLimitResponse
)
from app.core.exceptions import (
    BudgetAlreadyExistsException,
    CategoryNotFoundException
)
from app.services.notification_service import NotificationService, NotificationPriority, NotificationType

logger = logging.getLogger(__name__)

class BudgetService:
    """Service for budget management"""
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)

    def create_budget(self,  user_id: UUID, data: BudgetCreate) -> BudgetResponse:
        """Create a new budget or bill."""
        # Verify category exists
        category = self.db.query(Category).filter(
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
        existing = self.db.query(Budget).filter(
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
            # threshold=data.threshold,
            is_bill=data.is_bill,
            bill_name=data.bill_name,
            due_date=data.due_date,
            recurrence=data.recurrence,
            bill_status=BillStatus.PENDING if data.is_bill else None,
        )
        
        self.db.add(budget)
        self.db.commit()
        self.db.refresh(budget)
        
        logger.info(f"Created {'bill' if data.is_bill else 'budget'} for user {user_id}")
        return BudgetResponse.model_validate(budget)
    
    
    def get_budgets(
        self,
        
        user_id: UUID,
        period: Optional[BudgetPeriod] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        category_id: Optional[UUID] = None,
        is_bill: Optional[bool] = None
    ) -> List[BudgetResponse]:
        """Get flat list of budgets with filters."""
        query = self.db.query(Budget).filter(Budget.user_id == user_id)
        
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
        
        return [BudgetResponse.model_validate(b) for b in query.order_by(Budget.created_at.desc()).all()]
    
    
    def update_budget(
        self,
        
        user_id: UUID,
        budget_id: UUID,
        data: BudgetUpdate
    ) -> Budget:
        """Update a budget or bill."""
        budget = get_budget_or_raise(self.db, user_id, budget_id)
                
        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        
        # Handle bill status change to PAID
        if budget.is_bill and update_data.get('status') == BillStatus.PAID:
            # Advance bill cycle
            advance_bill_cycle(budget)
            # Remove bill_status from update_data to avoid conflict
            update_data.pop('status', None)
        
        # Apply remaining updates
        for field, value in update_data.items():
            setattr(budget, field, value)
        
        budget.updated_at = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(budget)
        
        logger.info(f"Updated {'bill' if budget.is_bill else 'budget'} {budget_id}")
        return budget
    
    
    def delete_budget(self,  user_id: UUID, budget_id: UUID) -> None:
        """Delete a budget."""
        budget = get_budget_or_raise(self.db, user_id, budget_id)
                
        self.db.delete(budget)
        self.db.commit()
        
        logger.info(f"Deleted budget {budget_id}")
        
    
    def calculate_budget_progress(
        self,  user_id: UUID, period
    ) -> BudgetProgressResponse:
        """Calculate spending progress for a single budget."""
        user = get_user_by_id(self.db, user_id)
        
        start_date, end_date = get_period_dates(period, datetime.now(timezone.utc))

        spent = self._calculate_total_period_spending(
            user_id, start_date, end_date
        )
        
        spending_limit = user.spending_limit or Decimal("0.00")
        remaining = max(Decimal("0.00"), spending_limit - spent)
        percentage = float(spent / spending_limit * 100) if spending_limit > 0 else 0.0

        if not spending_limit:
            status = "on_track"
        elif spent > spending_limit:
            status = "exceeded"
        elif percentage >= user.threshold:
            status = "warning"
        else:
            status = "on_track"

        return BudgetProgressResponse(
            spending_limit=spending_limit,
            spent=spent,
            remaining=remaining,
            percentage=round(percentage, 2),
            status=status,
        )
    
    # 
    # def calculate_budget_vs_actual(
    #      user_id: UUID, period: BudgetPeriod
    # ) -> list[BudgetProgressResponse]:
    #     """Compare all budgets against actual spending for a period."""
    #     budgets = db.query(Budget).filter(
    #         Budget.user_id == user_id,
    #         Budget.period == period,
    #     ).all()

    #     return [
    #         BudgetService.calculate_budget_progress(db, user_id, b.budget_id)
    #         for b in budgets
    #     ]
    
    def check_or_create_budget_notification(self, user_id: UUID):
        """Checks for alerts and creates the notification if none exists"""
        user = get_user_by_id(self.db, user_id)
        
        # No spending limit set = no alerts
        if user.spending_limit is None or user.spending_limit <= 0:
            return 0
        

        now = datetime.now(timezone.utc)
        notif_service = NotificationService(self.db)
        alerts_created = 0

        period = user.spending_period or BudgetPeriod.MONTHLY

        start_date, end_date = get_period_dates(period, now)

        # Calculate spent
        spent = self.db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.user_id == user_id,
            Transaction.type == TransactionType.EXPENSE,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date
        ).scalar()
        
        percentage = (spent / user.spending_limit * 100)
        user_threshold = user.threshold or 80  

        if percentage >= 100:
            if not self._alert_already_sent(self.db, user_id, "exceeded"):
                notif_service.create_notification(
                    user_id=user_id,
                    title="Budget Exceeded!",
                    message=f"You've spent {percentage:.1f}% of your budget ({spent}/{user.spending_limit}).",
                    notification_type=NotificationType.BUDGET_ALERT,
                    priority=NotificationPriority.URGENT,
                    data={"threshold": "exceeded", "percentage": percentage, "spent": str(spent)}
                )
                alerts_created += 1
        # ─── 80% Threshold (Warning) ───────────────────────────────────────────
        elif percentage >= 80:
            if not self._alert_already_sent(self.db, user_id, "warning"):
                notif_service.create_notification(
                    user_id=user_id,
                    title="Budget Warning",
                    message=f"You've reached your set budget threshold.",
                    notification_type=NotificationType.BUDGET_ALERT,
                    priority=NotificationPriority.NORMAL,
                    data={"threshold": "warning", "percentage": percentage, "spent": str(spent)}
                )
                alerts_created += 1
        
        return alerts_created
    
    def _alert_already_sent(self, user_id: UUID, threshold: str):
            """Prevents duplicate alerts by checking if it was already sent"""
            title = "Budget Exceeded!" if threshold == "exceeded" else "Budget Warning"

            return self.db.query(Notification).filter(
                Notification.user_id == user_id,
                Notification.type == NotificationType.BUDGET_ALERT,
                Notification.title == title, 
                Notification.data['threshold'].astext == threshold,
            ).first() is not None
    
    def get_budget_alerts(self,  user_id: UUID) -> list[BudgetAlertResponse]:
        """Return all active alertsand notifications"""
        notifications = self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.type.in_([NotificationType.BUDGET_ALERT, NotificationType.BILL_REMINDER]),
            Notification.is_read == False
        ).order_by(Notification.created_at.desc()).all()
        
        alerts = []
        for notif in notifications:
            # Extract data from the JSON column safely
            data = notif.data or {}
            
            alerts.append(BudgetAlertResponse(
                budget_id=data.get('budget_id'),
                bill_name=data.get('bill_name'),
                category_id=None, # Can be added to data dict if needed
                message=notif.message,
                alert_type=notif.type.value,
                priority=notif.priority.value if notif.priority else "normal"
            ))
        
        return alerts    
    
    def get_budget_summary(
        self,  user_id: UUID, period: BudgetPeriod
    ) -> BudgetSummaryResponse:
        """
        Return full dashboard summary grouped by category hierarchy.
        Progress is calculated once globally (total spent vs spending limit).
        Chips show planned budget amounts only — no per-category progress.
        """
        # Fetch user
        user = get_user_by_id(self.db, user_id)

        # Calculate global progress once — not per chip
        progress = self.calculate_budget_progress(user_id, period)
        total_spent = progress.spent

        # Fetch all budgets for this period
        budgets = self.db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.period == period,
        ).all()

        # Fetch parent categories (group headers) ordered by display_order
        parent_categories = self.db.query(Category).filter(
            Category.user_id == user_id,
            Category.parent_id == None,
            Category.is_active == True,
        ).order_by(Category.display_order).all()

        # Map category_id → budget for quick lookup
        budget_map = {b.category_id: b for b in budgets}

        groups = []
        total_budgeted = Decimal("0.00")

        for parent in parent_categories:
            child_categories = self.db.query(Category).filter(
                Category.parent_id == parent.category_id,
                Category.is_active == True,
            ).order_by(Category.display_order).all()

            group_budgets = []
            group_budgeted = Decimal("0.00")

            for child in child_categories:
                budget = budget_map.get(child.category_id)
                if not budget:
                    continue

                # Chips show planned amounts only — no per-budget progress
                group_budgets.append(BudgetResponse.model_validate(budget))
                group_budgeted += budget.amount

            if not group_budgets:
                continue

            groups.append(BudgetGroupResponse(
                group_id=parent.category_id,
                group_name=parent.name,
                group_total_budgeted=group_budgeted,
                group_total_spent=total_spent,  # same figure across all groups
                budgets=group_budgets,
            ))

            total_budgeted += group_budgeted

        return BudgetSummaryResponse(
            period=period,
            spending_limit=user.spending_limit,
            total_budgeted=total_budgeted,
            total_spent=total_spent,
            total_remaining=max(Decimal("0.00"), user.spending_limit - total_spent) if user.spending_limit else Decimal("0.00"),
            groups=groups,
        )
        
    # ─── Spending Limit ──────────────────────────────────────────────────────

    
    def get_spending_limit(self,  user_id: UUID) -> SpendingLimitResponse:
        """Return the user's global spending limit."""
        user = get_user_by_id(self.db, user_id)
        return SpendingLimitResponse(spending_limit=user.spending_limit)

    
    def update_spending_limit(
        self,  user_id: UUID, data: SpendingLimitUpdate
    ) -> SpendingLimitResponse:
        """Update the user's global spending limit."""
        user = get_user_by_id(self.db, user_id)

        user.spending_limit = data.spending_limit
        user.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(user)

        logger.info(f"Spending limit updated for user {user_id}")
        return SpendingLimitResponse(spending_limit=user.spending_limit)

    
    def _calculate_total_period_spending(
        self,        
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> Decimal:
        """
        Sum all expense transactions for a user within a date range.
        """
        result = self.db.query(
            func.coalesce(func.sum(Transaction.amount), 0)
        ).filter(
            Transaction.user_id == user_id,
            Transaction.type == TransactionType.EXPENSE,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        ).scalar()

        return Decimal(str(result))