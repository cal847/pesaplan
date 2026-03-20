"""
Category service.
Handles category CRUD, hierarchy, seeding and reordering
"""
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional
import logging

from app.models.category import Category
from app.utils.category_helpers import get_category_or_raise, validate_parent, get_next_display_order
from app.schemas.category import (
    CategoryCreate, CategoryUpdate, CategoryResponse,
    CategoryTreeResponse, CategoryReorderRequest,
)
from app.core.exceptions import (
    CategoryNotFoundException,
    CategoryAlreadyExistsException,
)

logger = logging.getLogger(__name__)

# Default categories seeded on registration
DEFAULT_CATEGORIES = [
    {
        "name": "Income",
        "type": "income",
        "children": ["Salary", "Side Hustle", "Dividends"],
    },
    {
        "name": "The Essentials",
        "type": "expense",
        "children": ["Food", "Rent", "Water", "Electricity", "Wifi", "Transport"],
    },
    {
        "name": "Subscriptions",
        "type": "expense",
        "children": ["Spotify", "YouTube", "Netflix"],
    },
    {
        "name": "Savings & Investments",
        "type": "expense",
        "children": ["Mshwari", "NSE", "Bank"],
    },
    {
        "name": "Debt",
        "type": "expense",
        "children": ["KCB Loan", "Equity Loan"],
    },
]

class CategoryService:
    @staticmethod
    def seed_default_categories(db: Session, user_id: UUID) -> None:
        """
        Seed default parent/child categories for new users
        """
        for order, group in enumerate(DEFAULT_CATEGORIES):
            parent = Category(
                user_id=user_id,
                name=group["name"],
                type=group["type"],
                parent_id=None,
                display_order=order,
            )
            db.add(parent)
            db.flush() 
            
            for child_order, child_name in enumerate(group["children"]):
                child = Category(
                    user_id=user_id,
                    name=child_name,
                    type=group["type"],
                    parent_id=parent.category_id,
                    display_order=child_order,
                )
                db.add(child)
                
        db.commit()
        logger.info(f"Seeded default categories for user {user_id}")
        
    @staticmethod
    def create_category(db: Session, user_id: UUID, data: CategoryCreate) -> CategoryResponse:
        """
        Create custom category
        """
        if data.parent_id:
            validate_parent(db, user_id, data.parent_id)
            
        # Check for duplicate under the same parent
        existing = db.query(Category).filter(
            Category.user_id == user_id,
            Category.name == data.name,
            Category.parent_id == data.parent_id,
            Category.is_active == True,
        ).first()
        if existing:
            raise CategoryAlreadyExistsException()
        
        display_order = get_next_display_order(db, user_id, data.parent_id)
        
        
        category = Category(
            user_id=user_id,
            name=data.name,
            type=data.type,
            parent_id=data.parent_id,
            display_order=display_order,
        )
        db.add(category)
        db.commit()
        db.refresh(category)
        
        logger.info(f"Created category '{data.name}' for user {user_id}")
        return CategoryResponse.model_validate(category)
    
    @staticmethod
    def get_categories(db: Session, user_id: UUID, type: Optional[str] = None) -> list[CategoryResponse]:
        """
        Flat list of active categories with optional type filter
        """
        query = db.query(Category).filter(
            Category.user_id == user_id,
            Category.is_active == True,
        )
        if type:
            query = query.filter(Category.type == type)
        
        categories = query.order_by(
            Category.parent_id.asc().nullsfirst(),
            Category.display_order.asc(),
        ).all()
        
        return [CategoryResponse.model_validate(c) for c in categories]
    
    @staticmethod
    def get_category(db: Session, user_id: UUID, category_id: UUID) -> CategoryResponse:
        """
        Single category lookup
        """
        category = get_category_or_raise(db, user_id, category_id)
        return CategoryResponse.model_validate(category)
    
    @staticmethod
    def category_tree(db: Session, user_id: UUID) -> list[CategoryTreeResponse]:
        """
        Return active categories as parent/child tree
        """
        parents = db.query(Category).filter(
            Category.user_id == user_id,
            Category.parent_id == None,
            Category.is_active == True,
        ).order_by(Category.display_order).all()
        
        tree = []
        for parent in parents:
            children = db.query(Category).filter(
                Category.parent_id == parent.category_id,
                Category.is_active == True,
            ).order_by(Category.display_order).all()
            
            tree.append(CategoryTreeResponse(
                category_id=parent.category_id,
                name=parent.name,
                type=parent.type,
                display_order=parent.display_order,
                children=[
                    CategoryTreeResponse(
                        category_id=c.category_id,
                        name=c.name,
                        type=c.type,
                        display_order=c.display_order,
                        children=[],
                    )
                    for c in children
                ],
            ))
            
        return tree
    
    @staticmethod
    def update_category(db: Session, user_id: UUID, category_id: UUID, data: CategoryUpdate) -> CategoryResponse:
        """ Update Categories """
        category = get_category_or_raise(db, user_id, category_id)
        
        # Check for duplicate name if name is being changed        
        if data.name and data.name != category.name:
            existing = db.query(Category).filter(
                Category.user_id == user_id,
                Category.name == data.name,
                Category.parent_id == category.parent_id,
                Category.is_active == True,
                Category.category_id != category_id,
            ).first()
            if existing:
                raise CategoryAlreadyExistsException()
            
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(category, field, value)
            
        db.commit()
        db.refresh(category)
        
        logger.info(f"Updated category {category_id}")
        return CategoryResponse.model_validate(category)
    
    @staticmethod
    def deactivate_category(db: Session, user_id: UUID, category_id: UUID) -> None:
        """ Mark category as deactivated """
        category = get_category_or_raise(db, user_id, category_id)
        
        # Cascade children
        db.query(Category).filter(
            Category.parent_id == category_id,
            Category.user_id == user_id,
        ).update({"is_active": False})
        
        category.is_active = False
            
        db.commit()
        logger.info(f"Deactivated category {category_id}")
        
    @staticmethod
    def reorder_categories(db: Session, user_id: UUID, data: CategoryReorderRequest) -> None:
        """ Allows users to reorder their children """
        for order, category_id in enumerate(data.ordered_ids):
            category = db.query(Category).filter(
                Category.category_id == category_id,
                Category.user_id == user_id,
                Category.is_active == True,
            ).first()
 
            if not category:
                raise CategoryNotFoundException()
 
            category.display_order = order
 
        db.commit()
        logger.info(f"Reordered {len(data.ordered_ids)} categories for user {user_id}")