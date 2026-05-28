from pydantic import BaseModel, Field
from typing import Optional 
from uuid import UUID
from datetime import datetime
from decimal import Decimal

class MerchantCreate(BaseModel):
    """Schema for creating merchants"""
    merchant_name: str = Field(..., min_length=1, max_length=255)
    category_id: Optional[UUID] = None
    
class MerchantResponse(BaseModel):
    """Schema for merchant response"""
    merchant_name: str
    user_id: UUID
    merchant_id: UUID
    category_id: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
class MerchantUpdate(BaseModel):
    """Schema for merchant update"""
    merchant_name: Optional[str] = Field(..., min_length=1, max_length=255)
    category_id: UUID
    
class MerchantSpendingResponse(BaseModel):
    """Schema for per merchant spending"""
    merchant_id: UUID
    merchant_name: str
    category_id: Optional[UUID] = None
    category_name: Optional[str] = None
    total_amount: Decimal
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None

class TopMerchantResponse(BaseModel):
    """Schema for top merchants by spending"""
    merchant_id: UUID
    merchant_name: str
    total_amount: Decimal
    percentage_of_total: float
    
class MergeMerchantsRequest(BaseModel):
    """Schema for merging duplicate merchants."""
    source_merchant_id: UUID
    target_merchant_id: UUID

class CategorizeMerchantRequest(BaseModel):
    """Schema for categorizing a merchant."""
    category_id: Optional[UUID] = None