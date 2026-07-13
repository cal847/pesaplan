from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from uuid import UUID

class CategorySpending(BaseModel):
    category_id: UUID
    category_name: str
    total_spent: Decimal
    percentage: float

class SpendingByCategoryResponse(BaseModel):
    period: str
    start_date: datetime
    end_date: datetime
    categories: List[CategorySpending]
    total_spent: Decimal

class MerchantSpending(BaseModel):
    merchant_id: Optional[UUID] = None
    merchant_name: str
    total_spent: Decimal
    transaction_count: int
    percentage: float

class SpendingByMerchantResponse(BaseModel):
    period: str
    start_date: datetime
    end_date: datetime
    merchants: List[MerchantSpending]
    total_spent: Decimal

class TrendDataPoint(BaseModel):
    date: str
    income: Decimal
    expenses: Decimal
    net: Decimal

class IncomeExpenseTrendResponse(BaseModel):
    period: str
    data_points: List[TrendDataPoint]
    total_income: Decimal
    total_expenses: Decimal
    net_change: Decimal

class GoalsAchievedResponse(BaseModel):
    period: str
    total_goals: int
    completed_goals: int
    completion_rate: float  
    total_amount_achieved: Decimal