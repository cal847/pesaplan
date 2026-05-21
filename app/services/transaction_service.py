# Transaction service for saving transactions to models/transactions.py
import logging
from datetime import timedelta, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction, TransactionType
from app.schemas.sms import SMSParseResult, ParsedTransactionType
from app.services.merchant_service import MerchantService

logger = logging.getLogger(__name__)

AIRTIME_DEDUP_WINDOW_SECONDS = 60

class TransactionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.merchant_service = MerchantService(db)
        
    ## Dedup
    async def find_by_code(self, transaction_code: str) -> Optional[Transaction]:
        """Checks for duplicate transactions using the transaction code"""
        result = await self.db.execute(
            select(Transaction).where(
                Transaction.transaction_code == transaction_code
            )
        )
        return result.scalar_one_or_none()
    
    async def _is_duplicate(self, parsed: SMSParseResult, user_id: str) -> bool:
        """Entry point for all dedup logic"""
        if parsed.transaction_code:
            return await self.find_by_code(parsed.transaction_code) is not None
        
        return False
    
    async def create_from_sms(self, parsed: SMSParseResult, user_id: str) -> Optional[Transaction]:
        """
        Saves a parsed sms as a Transaction
        Returns None if transaction is duplicate
        """
        if await self._is_duplicate(parsed, user_id):
            logger.info(
                "duplicate_transaction",
                extra={
                    "transaction_code": parsed.transaction_code,
                    "user_id": str(user_id),
                }
            )
            return None
        
        merchant_id = None
        if parsed.merchant_name:
            merchant = await self.merchant_service.get_or_create(parsed.merchant_name)
            merchant_id = merchant.merchant_id
            
        transaction = Transaction(
            user_id=user_id,
            transaction_code=parsed.transaction_code,
            amount=parsed.amount,
            type=parsed.transaction_type,
            merchant_id=merchant_id,
            paybill_account_number=getattr(parsed, "account_number", None),
            transaction_date=parsed.transaction_date,
        )
        
        self.db.add(transaction)
        await self.db.commit()
        await self.db.refresh(transaction)

        logger.info(
            "transaction_created",
            extra={
                "transaction_code": parsed.transaction_code,
                "amount": str(parsed.amount),
                "type": str(parsed.transaction_type),
                "user_id": str(user_id),
            }
        )
        return transaction