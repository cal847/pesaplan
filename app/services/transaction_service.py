# Transaction service for saving transactions to models/transactions.py
import logging
from sqlalchemy.orm import Session
from typing import Optional

from app.models.transaction import Transaction, TransactionType
from app.schemas.sms import SMSParseResult, ParsedTransactionType
from app.services.merchant_service import MerchantService

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
            merchant =  self.merchant_service.get_or_create(parsed.merchant_name)
            merchant_id = merchant.merchant_id
            category_id = merchant.category_id
            
        transaction = Transaction(
            user_id=user_id,
            transaction_code=parsed.transaction_code,
            amount=parsed.amount,
            type=parsed.transaction_type,
            merchant_id=merchant_id,
            category_id=category_id,
            paybill_account_number=getattr(parsed, "account_number", None),
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