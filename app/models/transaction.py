"""
Transaction Model
Records all financial transactions.
Supports M-Pesa SMS parsing and bill tracking.
"""
from sqlalchemy import Column, String, UUID, ForeignKey, Numeric, DateTime, Enum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid
import enum

class TransactionType(str, enum.Enum):
    """Enum for transaction types"""
    INCOME = "income"
    EXPENSE = "expense"
    
class TransactionStatus(str, enum.Enum):
    """Enum for transaction/bill status."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    PAID = "paid" 
    OVERDUE = "overdue"

class Transaction(Base):
    __tablename__ = "transactions"
    
    transaction_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.category_id", ondelete="SET NULL"), nullable=True)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.merchant_id", ondelete="SET NULL"), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    type = Column(Enum(TransactionType), nullable=False)
    transaction_date = Column(DateTime(timezone=True), nullable=False, default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    merchant = relationship("Merchant", back_populates="transactions")
    
    # Indexes
    __table_args__ = (
        Index('ix_transactions_user_id', 'user_id'),
        Index('ix_transactions_date', 'transaction_date'),
        Index('ix_transactions_type', 'type'),
    )
    
    def __repr__(self) -> str:
        return f"<Transaction {self.amount} {self.type} (user={self.user_id})>"
