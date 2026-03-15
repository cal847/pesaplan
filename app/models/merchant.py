"""
Merchant Model
Represents businesses, stores, or service providers where users spend money.
Auto-populated from M-Pesa SMS data to help with automatic categorization.
"""

from sqlalchemy import Column, String, UUID, Index, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Merchant(Base):
    """
    Merchant model for tracking where money is spent.
    
    Auto-populated from M-Pesa messages to help with transaction categorization.
    """
    __tablename__ = "merchants"
    
    merchant_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merchant_name = Column(String(255), nullable=False, unique=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    transactions = relationship("Transaction", back_populates="merchant")
    
    # Indexes
    __table_args__ = (
        Index('ix_merchants_name', 'merchant_name'),
    )
    
    def __repr__(self) -> str:
        return f"<Merchant {self.merchant_name}>"