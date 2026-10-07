"""
Utility helpers for BUdget Service
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from dateutil.relativedelta import relativedelta
from app.models.budget import Budget, BudgetPeriod, BillRecurrence, BillStatus
from app.core.exceptions import BudgetNotFoundException
from uuid import UUID

def get_budget_or_raise(db: Session, user_id: UUID, budget_id: UUID) -> Budget:
    budget = db.query(Budget).filter(
        Budget.budget_id == budget_id,
        Budget.user_id == user_id
    ).first()
    if not budget:
        raise BudgetNotFoundException()
    
    return budget
    
def get_period_dates(
        period: BudgetPeriod, reference_date: datetime
    ) -> tuple[datetime, datetime]:
    """Return (start_date, end_date) for a given period relative to reference_date."""
    ref = reference_date.replace(hour=0, minute=0, second=0, microsecond=0)

    if period == BudgetPeriod.DAILY:
        start = ref
        end = ref.replace(hour=23, minute=59, second=59)

    elif period == BudgetPeriod.WEEKLY:
        start = ref - timedelta(days=ref.weekday())  # Monday
        end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)

    elif period == BudgetPeriod.MONTHLY:
        start = ref.replace(day=1)
        end = (start + relativedelta(months=1)) - timedelta(seconds=1)

    elif period == BudgetPeriod.QUARTERLY:
        quarter_start_month = ((ref.month - 1) // 3) * 3 + 1
        start = ref.replace(month=quarter_start_month, day=1)
        end = (start + relativedelta(months=3)) - timedelta(seconds=1)

    elif period == BudgetPeriod.YEARLY:
        start = ref.replace(month=1, day=1)
        end = ref.replace(month=12, day=31, hour=23, minute=59, second=59)

    else:
        # CUSTOM — caller is responsible for providing explicit dates
        raise ValueError("Cannot auto-compute dates for CUSTOM period")

    return start, end

def advance_bill_cycle(budget):
    """Advance due_date based on recurrence and reset status to PENDING."""
    if not budget.due_date or not budget.recurrence:
        return

    budget.last_paid_at = datetime.now(timezone.utc)

    if budget.recurrence == BillRecurrence.WEEKLY:
        budget.due_date = budget.due_date + timedelta(weeks=1)
    elif budget.recurrence == BillRecurrence.MONTHLY:
        budget.due_date = budget.due_date + relativedelta(months=1)
    elif budget.recurrence == BillRecurrence.QUARTERLY:
        budget.due_date = budget.due_date + relativedelta(months=3)
    elif budget.recurrence == BillRecurrence.ANNUAL:
        budget.due_date = budget.due_date + relativedelta(years=1)
    elif budget.recurrence == BillRecurrence.ONE_OFF:
        # One-off bills stay PAID permanently — no cycle to advance
        return

    budget.bill_status = BillStatus.PENDING
