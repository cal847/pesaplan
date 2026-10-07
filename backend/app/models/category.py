"""
Category Model
Represents income/expense categories that users can create and organize hierarchically.
Supports nesting (parent-child relationships) for better organization.
"""
from sqlalchemy import Column, String, UUID, ForeignKey, Boolean, Integer, Index, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Category(Base):
    """
    Category model for organizing transactions.
    
    Users can create custom categories and organize them hierarchically using parent-child relationships.
    """
    __tablename__ = "categories"
    
    category_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("categories.category_id", ondelete="CASCADE"), nullable=True)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)
    
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="categories")
    parent = relationship("Category", remote_side=[category_id], back_populates="children")
    children = relationship("Category", back_populates="parent")
    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category")
    merchants = relationship("Merchant", back_populates="category")
    
    # Indexes for performance
    __table_args__ = (
        Index('ix_categories_parent_id', 'parent_id'),
        Index('ix_categories_user_parent', 'user_id', 'parent_id')    
    )
    
    def __repr__(self) -> str:
        return f"<Category {self.name} (user_id={self.user_id})>"