# Transaction service for saving transactions to models/transactions.py
import logging
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from app.models.transaction import Transaction
from app.schemas.sms import SMSParseResult
from app.services.merchant_service import MerchantService
from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
)

logger = logging.getLogger(__name__)

AIRTIME_DEDUP_WINDOW_SECONDS = 60

class TransactionService:
    def __init__(self, db: Session):
        self.db = db
        self.merchant_service = MerchantService(db)
        
    ## Dedup
    def find_by_code(self, transaction_code: str) -> Optional[Transaction]:
        """Checks for duplicate transactions using the transaction code"""
        return self.db.query(Transaction).filter(
            Transaction.transaction_code == transaction_code
        ).first()
    
    def _is_duplicate(self, parsed: SMSParseResult, user_id: str) -> bool:
        """Entry point for all dedup logic"""
        if parsed.transaction_code:
            return  self.find_by_code(parsed.transaction_code) is not None
        
        return False
    
    def get_all_transactions(self, user_id: UUID) -> list[TransactionResponse]:
        return (
            self.db.query(Transaction)
            .filter(Transaction.user_id == user_id)
            .order_by(Transaction.transaction_date.desc())
            .all()
        )
    
    def get_by_id(self, user_id: UUID, transaction_id: UUID) -> Optional[Transaction]:
        return (
            self.db.query(Transaction)
            .filter(
                Transaction.transaction_id == transaction_id,
                Transaction.user_id == user_id
            )
            .first()
        )
    
    def create_from_sms(self, parsed: SMSParseResult, user_id: str) -> Optional[Transaction]:
        """
        Saves a parsed sms as a Transaction
        Returns None if transaction is duplicate
        """
        if  self._is_duplicate(parsed, user_id):
            logger.info(
                "duplicate_transaction",
                extra={
                    "transaction_code": parsed.transaction_code,
                    "user_id": str(user_id),
                }
            )
            return None
        
        merchant_id = None
        category_id = None
        
        if parsed.merchant_name:
            merchant =  self.merchant_service.get_or_create(user_id, parsed.merchant_name)
            merchant_id = merchant.merchant_id
            category_id = merchant.category_id
            
        transaction = Transaction(
            user_id=user_id,
            transaction_code=parsed.transaction_code,
            amount=parsed.amount,
            type=parsed.transaction_type,
            merchant_id=merchant_id,
            category_id=category_id,
            # paybill_account_number=getattr(parsed, "account_number", None),
            transaction_date=parsed.transaction_date,
        )
        
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)

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
    
    def create_manual(self, data: TransactionCreate, user_id: UUID) -> Transaction:
        """Users manually upload transactions"""
        merchant_id = None

        if data.merchant_name:
            merchant = self.merchant_service.get_or_create(
                user_id, data.merchant_name
            )
            merchant_id = merchant.merchant_id

        transaction = Transaction(
            user_id=user_id,
            amount=data.amount,
            type=data.type,
            merchant_id=merchant_id,
            category_id=data.category_id,
            # paybill_account_number=data.paybill_account_number,
            transaction_date=data.transaction_date or datetime.now(timezone.utc),
        )

        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction
    
    def get_transactions(
            self,
            user_id: UUID,
    ) -> TransactionResponse:
        try:
            return self.get_all_transactions(user_id)

        except Exception as e:
            logger.error("Failed to fetch transactions", extra={"error": str(e)})
            raise ValueError (f"failed to fetch transactions: {str(e)}")