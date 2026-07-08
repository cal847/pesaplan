from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from app.models.transaction import TransactionType

class TransactionBase(BaseModel):
    transaction_code: Optional[str] = None
    amount: Decimal
    merchant_name: Optional[str] = None
    transaction_date: datetime
    type: Optional[TransactionType] = None
    category_id: Optional[UUID] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    transaction_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TransactionFilter(BaseModel):
    type: Optional[TransactionType] = None
    merchant_name: Optional[str] = None
    min_amount: Optional[Decimal] = Field(default=None, gt=0)
    max_amount: Optional[Decimal] = Field(default=None, gt=0)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class PaginatedTransactionResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    limit: int