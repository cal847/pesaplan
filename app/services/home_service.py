# Home service to handle dashboard summaries
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta, timezone
from uuid import UUID
import logging
from decimal import Decimal

from app.models.transaction import Transaction, TransactionType
from app.models.budget import Budget, BillStatus
from app.schemas.home import (
    BalanceSummary,
    RecentTransactions,
    HomeSummary,
    UpcomingBills,
)

logger = logging.getLogger(__name__)

class HomeService:
    def __init__(self, db: Session):
        self.db = db

    def get_home_summary(self, user_id: UUID, period: str = "monthly") -> HomeSummary:
        balance = self.get_balance_summary(user_id, period)
        bills = self.get_upcoming_bills(user_id)
        transactions = self.get_recent_transactions(user_id)

        return HomeSummary(
            balance=balance,
            upcoming_bills=bills,
            recent_transactions=transactions,
        )

    def get_balance_summary(self, user_id: UUID, period: str = "monthly") -> BalanceSummary:
        start_date = self._get_period_start(period)

        rows = (
            self.db.query(Transaction.type, Transaction.amount)
            .filter(
                Transaction.user_id == user_id,
                Transaction.transaction_date >= start_date,
                Transaction.type.in_([TransactionType.INCOME, TransactionType.EXPENSE]),
            )
            .all()
        )

        income = sum(r.amount for r in rows if r.type == TransactionType.INCOME) or Decimal("0")
        expenses = sum(r.amount for r in rows if r.type == TransactionType.EXPENSE) or Decimal("0")

        return BalanceSummary(
            total_income=income,
            total_expenses=expenses,
            net_balance=income - expenses,
            period=period,
        )

    def get_upcoming_bills(self, user_id: UUID, limit: int = 5) -> list[UpcomingBills]:
        now = datetime.now(timezone.utc)
        lookahead = now + timedelta(days=7)

        bills = (
            self.db.query(Budget)
            .filter(
                Budget.user_id == user_id,
                Budget.is_bill == True,
                Budget.due_date <= lookahead,
                Budget.bill_status != BillStatus.PAID,
            )
            .order_by(Budget.due_date.asc())
            .limit(limit)
            .all()
        )

        return [
            UpcomingBills(
                budget_id=bill.budget_id,
                bill_name=bill.bill_name,
                amount=bill.amount,
                due_date=bill.due_date,
                bill_status=bill.bill_status,
                days_remaining=bill.days_remaining,
            )
            for bill in bills
        ]

    def get_recent_transactions(self, user_id: UUID, limit: int = 5) -> list[RecentTransactions]:
        transactions = (
            self.db.query(Transaction)
            .options(joinedload(Transaction.merchant))
            .filter(
                Transaction.user_id == user_id,
                Transaction.type.in_([TransactionType.INCOME, TransactionType.EXPENSE]),
            )
            .order_by(Transaction.transaction_date.desc())
            .limit(limit)
            .all()
        )

        return [
            RecentTransactions(
                transaction_id=tx.transaction_id,
                amount=tx.amount,
                type=tx.type,
                merchant_name=tx.merchant_name,
                transaction_date=tx.transaction_date,
                transaction_code=tx.transaction_code,
            )
            for tx in transactions
        ]

    def _get_period_start(self, period: str) -> datetime:
        now = datetime.now(timezone.utc)
        return {
            "daily": now - timedelta(days=1),
            "weekly": now - timedelta(weeks=1),
            "monthly": now.replace(day=1, hour=0, minute=0, second=0, microsecond=0),
            "yearly": now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0),
        }.get(period, now.replace(day=1, hour=0, minute=0, second=0, microsecond=0))