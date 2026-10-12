"""Utility helpers fot Category Service"""
from sqlalchemy.orm import Session
from uuid import UUID
from app.models.category import Category
from app.core.exceptions import CategoryNotFoundException, InvalidParentCategoryException

def get_category_or_raise(db: Session, user_id: UUID, category_id: UUID) -> Category:
    """Return active category"""
    category = db.query(Category).filter(
        Category.category_id == category_id,
        Category.user_id == user_id,
        Category.is_active == True,
    ).first()
    if not category:
        raise CategoryNotFoundException()
    
    return category

def validate_parent(db: Session, user_id: UUID, parent_id: UUID) -> Category:
    """
    Ensure parent exists, belongs to user, is active, and is a top-level category.
    Max depth is 2 levels (parent → child). Grandchildren are not allowed.
    """
    parent = db.query(Category).filter(
        Category.category_id == parent_id,
        Category.user_id == user_id,
        Category.is_active == True,
    ).first()
    
    if not parent:
        raise CategoryNotFoundException()
    
    if parent.parent_id is not None:
        raise InvalidParentCategoryException()
    
    return parent

def get_next_display_order(db: Session, user_id: UUID, parent_id: UUID | None) -> int:
    """Return the next display_order value under a given parent (or at root level)."""
    last = db.query(Category).filter(
        Category.user_id == user_id,
        Category.parent_id == parent_id,
        Category.is_active == True,   
    ).order_by(Category.display_order.desc()).first()
    
    return (last.display_order +1) if last else 0