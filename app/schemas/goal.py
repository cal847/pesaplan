from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.models.goals import Goal, GoalStatus

class GoalBase(BaseModel):
    """Base schema for goal creation and response"""
    title: Optional[str] = Field(..., min_length=1)
    description: Optional[str] = Field(None, max_length=500)
    target_amount: Optional[Decimal] = None
    target_date: Optional[datetime] = None

class GoalCreate(GoalBase):
    pass

class GoalResponse(GoalBase):
    goal_id: UUID
    user_id: UUID
    current_amount: Decimal
    status: GoalStatus
    completed_date: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    @property
    def progress(self) -> float:
        if self.target_amount == 0:
            return 0
        return float((self.current_amount / self.target_amount) * 100)
    
    @property
    def remaining_amount(self) -> Decimal:
        return self.target_amount - self.current_amount
    
class GoalUpdate(GoalBase):
    pass

class GoalProgressResponse(BaseModel):
    goal_id: UUID
    title: str
    target_amount: Decimal
    current_amount: Decimal
    remaining_amount: Decimal
    progress_percentage: float
    target_date: Optional[datetime]
    status: GoalStatus

class GoalTopUpRequest(BaseModel):
    amount: Decimal = Field(..., gt=0)

class GoalStatsResponse(BaseModel):
    total_goals: int
    active_goals: int
    completed_goals: int
    cancelled_goals: int
    achievement_rate: float