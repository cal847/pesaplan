"""
Budget Model
Tracks spending limits per category over specific periods.
Helps users control their spending and stay on track.
"""

from sqlalchemy import Column, String, UUID, ForeignKey, Numeric, DateTime, Boolean, Integer, Enum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid
import enum

class BudgetPeriod(str, enum.Enum):
    """Enum for budget periods."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"

class Budget(Base):
    __tablename__ = "budgets"
    
    budget_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False,)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.category_id", ondelete="CASCADE"), nullable=False,)
    
    amount = Column(Numeric(12, 2), nullable=False)
    period = Column(Enum(BudgetPeriod), nullable=False, default=BudgetPeriod.MONTHLY)
    start_date = Column(DateTime(timezone=True), nullable=False,)
    end_date = Column(DateTime(timezone=True), nullable=False,)
    threshold = Column(Integer, default=80)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")
    
    # Indexes
    __table_args__ = (
        Index('ix_budgets_user_id', 'user_id', comment="Speed up user budget queries"),
        Index('ix_budgets_category', 'category_id', comment="Speed up category budget queries"),
        Index('ix_budget_dates', 'start_date', 'end_date', comment="Speed up date-range queries"),
    )
    
    def __repr__(self) -> str:
        return f"<Budget {self.amount} ({self.period}) for category {self.category_id}>"