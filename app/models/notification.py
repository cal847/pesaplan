"""
Notification Model
Stores in-app notifications for users
"""

from sqlalchemy import Column, String, UUID, ForeignKey, Boolean, DateTime, Enum, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
import uuid
import enum

from app.database import Base

class NotificationType(str, enum.Enum):
    """Enum for notification types."""
    BUDGET_ALERT = "budget_alert"
    GOAL_UPDATE = "goal_update"
    BILL_REMINDER = "bill_reminder"
    SYSTEM = "system"

class NotificationPriority(str, enum.Enum):
    """Enum for notification priority."""
    LOW = "low"
    NORMAL = "normal"
    URGENT = "urgent"
    
class Notification(Base):
    """
    Notification model for user alerts and messages.
    
    Used for budget alerts, bill reminders, goal updates, and system messages.
    """
    __tablename__ = "notifications"
    
    notification_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    
    type = Column(Enum(NotificationType), nullable=False)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.NORMAL)
    title = Column(String(255), nullable=False)
    
    message = Column(String(1000), nullable=False)
    data = Column(JSON, nullable=True)
    is_read = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    
    # Indexes
    __table_args__ = (
        Index('ix_notifications_user_id', 'user_id'),
        Index('ix_notifications_user_read', 'user_id', 'is_read'),
        Index('ix_notifications_type', 'type'),
        Index('ix_notifications_created', 'created_at'),
        Index('ix_notifications_expiry', 'expires_at'),
    )
    
    def mark_as_read(self) -> None:
        """Mark notification as read."""
        self.is_read = True
        self.read_at = datetime.now(timezone.utc)
    
    def __repr__(self) -> str:
        return f"<Notification {self.title} (user={self.user_id})>"