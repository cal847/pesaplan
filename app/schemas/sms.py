from pydantic import BaseModel, Field, field_validator
from decimal import Decimal
from datetime import datetime
from enum import Enum
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class SMSMessage(BaseModel):
    message: str
    
    @field_validator('message')
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        if not v.strip():
            logger.warning("message_empty")
            raise ValueError('SMS message cannot be empty')
        return v.strip()
    
class SMSBatch(BaseModel):
    messages: list[SMSMessage] = Field(min_length=1, max_length=100)
    
class ParsedTransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"
    SAVINGS = "savings"
    
class SMSParseResult(BaseModel):
    transaction_code: Optional[str]
    amount: Decimal
    merchant_name: Optional[str]
    account_number: Optional[str] =  None
    transaction_type: ParsedTransactionType
    transaction_date: datetime

class SMSImportResponse(BaseModel):
    total: int
    saved: int
    skipped: int
    failed: int
