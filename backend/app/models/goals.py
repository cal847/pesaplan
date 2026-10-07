"""
Goals Model
Helps users save towards specific targets with deadlines.
"""

from sqlalchemy import Column, String, UUID, ForeignKey, Numeric, DateTime, Boolean, Enum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from decimal import Decimal
import uuid
import enum

class GoalStatus(str, enum.Enum):
    """Enum for goal status."""
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Goal(Base):
    """
    Goal model for savings targets.
    """
    __tablename__ = "goals"
    
    goal_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)

    title = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    target_amount = Column(Numeric(12, 2), nullable=False)
    current_amount = Column(Numeric(12, 2), default=0)
    target_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(GoalStatus), default=GoalStatus.ACTIVE)
    completed_date = Column(DateTime(timezone=True), nullable=True)
    
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
     # Relationships
    user = relationship("User", back_populates="goals")
    
    # Indexes
    __table_args__ = (
        Index('ix_goals_user_id', 'user_id'),
        Index('ix_goals_status', 'status'),
        Index('ix_goals_target_date', 'target_date'),
    )
    
    @property
    def progress(self) -> float:
        """Calculate progress percentage."""
        if self.target_amount == 0:
            return 0
        return (self.current_amount / self.target_amount) * 100
    
    @property
    def remaining_amount(self) -> Decimal:
        """Calculate remaining amount to save."""
        return self.target_amount - self.current_amount
    
    def __repr__(self) -> str:
        return f"<Goal {self.title}: {self.current_amount}/{self.target_amount}>"