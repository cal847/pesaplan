"""User Database Model"""
from sqlalchemy import Column, String, Boolean, DateTime, UUID, Index, JSON, Numeric, Integer
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True) 
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), unique=False, nullable=False, index=True)
    email = Column(String(255), unique=False, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    
    verification_token = Column(String(255))
    reset_password_token = Column(String(255))
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    verification_sent_at = Column(DateTime(timezone=True), nullable=True)
    verification_expires_at = Column(DateTime(timezone=True), nullable=True)
        
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    #OAuth
    oauth_provider = Column(String, nullable=True)
    oauth_id = Column(String, nullable=True)
    
    # Notifications
    notification_preferences = Column(JSON, default={
        "email_notifications": True,
        "sms_notifications": True,
        "budget_alerts": True,
        "weekly_report": True,
    })
    
    # Budget
    spending_limit = Column(Numeric(12, 2), nullable=True)
    threshold = Column(Integer, default=80)
    
    # Relationships
    budgets = relationship("Budget", back_populates="user")
    categories = relationship("Category", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    goals = relationship("Goal", back_populates="user")
    merchants = relationship("Merchant", back_populates="user")
    # Index for faster lookups
    __table_args__ = (
        Index('ix_users_oauth', 'oauth_provider', 'oauth_id'),
    )
    @property
    def full_name(self) -> str:
        """Gets users full name"""
        return f"{self.first_name} {self.last_name}"
    
    def __repr__(self):
        return f"Name: {self.full_name} email:{self.email}"