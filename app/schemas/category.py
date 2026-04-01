"""Category Schemas"""
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class CategoryCreate(BaseModel):
    name: str
    type: str
    parent_id: Optional[UUID] = None
    
class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    display_order : Optional[int] = None
    
class CategoryResponse(BaseModel):
    category_id: UUID
    user_id: UUID
    parent_id: Optional[UUID] = None
    name: str
    type: str
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = {"from_attributes": True}
    
class CategoryTreeResponse(BaseModel):
    category_id: UUID
    name: str
    type: str
    display_order: int
    children: list["CategoryTreeResponse"] = []
    
class CategoryReorderRequest(BaseModel):
    ordered_ids: list[UUID]