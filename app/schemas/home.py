from pydantic import BaseModel, ConfigDict
from typing import Optional
from decimal import Decimal
from datetime import datetime
from uuid import UUID

from app.models.transaction import TransactionType
from app.models.budget import BillStatus, BillRecurrence

class BalanceSummary(BaseModel):
    total_income: Decimal
    total_expenses: Decimal
    net_balance: Decimal
    period: str

class RecentTransactions(BaseModel):
    transaction_id: UUID
    transaction_code: Optional[str] = None
    merchant_name: Optional[str] = None
    amount: Decimal
    type: TransactionType
    transaction_date: datetime

    model_config = ConfigDict(from_attributes=True)

class UpcomingBills(BaseModel):
    budget_id: UUID
    bill_name: Optional[str] = None
    amount: Decimal
    due_date: datetime
    bill_status: Optional[BillStatus] = None
    days_remaining: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class HomeSummary(BaseModel):
    balance: BalanceSummary
    upcoming_bills: list[UpcomingBills]
    recent_transactions: list[RecentTransactions]