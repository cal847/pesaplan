"""
Budget schemas for API requests and responses
"""
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from app.models.budget import BudgetPeriod, BillRecurrence, BillStatus

class BudgetCreate(BaseModel):
    category_id: UUID
    amount: Decimal = Field(..., gt=0)
    period: BudgetPeriod
    start_date: datetime
    end_date: datetime
    # threshold: int = 80
    
    is_bill: bool = False
    bill_name: Optional[str] = None
    due_date: Optional[datetime] = None
    recurrence: Optional[BillRecurrence] = None
    
    @model_validator(mode="after")
    def validate_bill_fields(self):
        if self.is_bill:
            if not self.bill_name:
                raise ValueError("bill_name is required when is_bill is True")
            if not self.due_date:
                raise ValueError("due_date is required when is_bill is True")
            if not self.recurrence:
                raise ValueError("recurrence is required when is_bill is True")
        return self
    
    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self
    
class BudgetUpdate(BaseModel):
    amount: Optional[Decimal] = None
    period: Optional[BudgetPeriod] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    threshold: Optional[int] = None

    # Bill fields
    is_bill: Optional[bool] = None
    bill_name: Optional[str] = None
    due_date: Optional[datetime] = None
    recurrence: Optional[BillRecurrence] = None
    icon_url: Optional[str] = None
    status: Optional[BillStatus] = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v

    @field_validator("threshold")
    @classmethod
    def threshold_must_be_valid(cls, v):
        if v is not None and not (1 <= v <= 100):
            raise ValueError("Threshold must be between 1 and 100")
        return v


class SpendingLimitUpdate(BaseModel):
    spending_limit: Decimal

    @field_validator("spending_limit")
    @classmethod
    def spending_limit_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Spending limit must be greater than 0")
        return v

class BudgetResponse(BaseModel):
    budget_id: UUID
    user_id: UUID
    category_id: UUID
    amount: Decimal
    period: BudgetPeriod
    start_date: datetime
    end_date: datetime
    threshold: int

    # Bill fields
    is_bill: bool
    bill_name: Optional[str]
    due_date: Optional[datetime]
    recurrence: Optional[BillRecurrence]
    icon_url: Optional[str]
    status: Optional[BillStatus]
    last_paid_at: Optional[datetime]
    days_remaining: Optional[int]

    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}

class BudgetProgressResponse(BaseModel):
    budget_id: UUID
    category_id: UUID
    amount: Decimal
    spent: Decimal
    remaining: Decimal
    percentage: float
    status: str 

    model_config = {"from_attributes": True}

class BudgetAlertResponse(BaseModel):
    budget_id: UUID
    bill_name: Optional[str]
    category_id: UUID
    message: str
    alert_type: str

    model_config = {"from_attributes": True}

class BudgetGroupResponse(BaseModel):
    group_id: UUID
    group_name: str
    group_total_budgeted: Decimal
    group_total_spent: Decimal
    budgets: list[BudgetProgressResponse]

    model_config = {"from_attributes": True}

class BudgetSummaryResponse(BaseModel):
    period: BudgetPeriod
    spending_limit: Optional[Decimal]
    total_budgeted: Decimal
    total_spent: Decimal
    total_remaining: Decimal
    groups: list[BudgetGroupResponse]

    model_config = {"from_attributes": True}


class SpendingLimitResponse(BaseModel):
    spending_limit: Optional[Decimal]

    model_config = {"from_attributes": True}
