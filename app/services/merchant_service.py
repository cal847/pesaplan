import logging
from sqlalchemy import func
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.models import Merchant
from app.schemas.merchant import MerchantSpendingResponse, TopMerchantResponse
from app.models.transaction import Transaction, TransactionType
from app.models.category import Category
from app.core.exceptions import MerchantNotFoundException

logger = logging.getLogger(__name__)

class MerchantService:
    def __init__(self, db: Session):
        self.db = db
        
    def get_merchant(self, user_id: UUID, merchant_id: UUID) -> Merchant:
        merchant = self.db.query(Merchant).filter(
            Merchant.user_id == user_id,
            Merchant.merchant_id == merchant_id
        ).first()
        
        if not merchant:
            raise MerchantNotFoundException(f"Merchant {merchant_id} not found")
        
        return merchant
    
    def get_merchants(
        self,
        user_id: UUID,
        search: Optional[str] = None,
        category_name: Optional[str] = None,
    ) -> List[Merchant]:
        """
        Gets all the merchants fora certain user.
        Optionally filters by name and/or category
        """
        query = self.db.query(Merchant).filter(
            Merchant.user_id == user_id
        )      
        
        if search:
            query = query.filter(
                Merchant.merchant_name.ilike(f"%{search.upper()}%")
            )
        
        if category_name:
            category = self.db.query(Category).filter(
                Category.name.ilike(category_name),
                Category.user_id == user_id
            ).first()
            
            if category:
                query = query.filter(Merchant.category_id == category.category_id)
            else:
                return []
            
        return query.order_by(Merchant.merchant_name).all()
    
    def get_or_create(self, user_id: UUID, merchant_name: str) -> Merchant:
        """
        Looks up merchant by normalised name and autocreates if none is found.
        Uses flush()
        """
        normalised = merchant_name.strip().upper()
        
        merchant = self.db.query(Merchant).filter(
            Merchant.user_id == user_id,
            Merchant.merchant_name == normalised
        ).first()
                
        if merchant:
            logger.debug("merchant_found name=%s user=%s", normalised, user_id)
            return merchant
        
        merchant = Merchant(user_id=user_id, merchant_name=normalised)
        self.db.add(merchant)
        self.db.flush()

        logger.info("merchant_auto_created name=%s", normalised)
        return merchant
    
    def set_category(self, user_id: UUID, merchant_id: UUID, category_id: UUID) -> Merchant:
        """Set or remove categories for a merchant"""
        merchant = self.db.query(Merchant).filter(
            Merchant.user_id == user_id,
            Merchant.merchant_id == merchant_id
        ).first()
        
        if not merchant:
            raise MerchantNotFoundException("Merchant not found")
        
        merchant.category_id = category_id
        
        # Backfill existing transactions
        updated = self.db.query(Transaction).filter(
            Transaction.merchant_id == merchant_id,
            Transaction.user_id == user_id
        ).update({"category_id": category_id})
        
        self.db.commit()
        self.db.refresh(merchant)
        
        logger.info(
            "merchant_categorized",
            extra={
                "user_id": str(user_id),
                "merchant": merchant.merchant_name,
                "category_id": str(category_id) if category_id else None,
                "transactions_updated": updated,
            }
        )
        return merchant
        
    def get_merchant_spending(
        self,
        merchant_id: UUID,
        user_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        ) -> MerchantSpendingResponse:
        """
        Calculate spending for a specific merchant
        """
        merchant = self.get_merchant(user_id, merchant_id)
        
        query = self.db.query(
            func.coalesce(func.sum(Transaction.amount), 0).label('total_amount'),
            func.count(Transaction.transaction_id).label('transaction_count')
        ).filter(
            Transaction.merchant_id == merchant_id,
            Transaction.user_id == user_id,
            Transaction.type == TransactionType.EXPENSE
        )
        
        if start_date:
            query = query.filter(Transaction.transaction_date >= start_date)
        if end_date:
            query = query.filter(Transaction.transaction_date <= end_date)
            
        result = query.first()
        
        # Get category name if exists
        category_name = None
        if merchant.category_id:
            category = self.db.query(Category).filter(
                Category.category_id == merchant.category_id
            ).first()
            category_name = category.name if category else None

        return MerchantSpendingResponse(
            merchant_id=merchant.merchant_id,
            merchant_name=merchant.merchant_name,
            category_id=merchant.category_id,
            category_name=category_name,
            total_amount=Decimal(str(result.total_amount)),
            transaction_count=result.transaction_count,
            period_start=start_date,
            period_end=end_date
        )
    
    def get_top_merchants(
        self,
        user_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 10
    ) -> List[TopMerchantResponse]:
        """
        Get top merchants by spending amount.
        """
        query = self.db.query(
            Merchant.merchant_id,
            Merchant.merchant_name,
            func.coalesce(func.sum(Transaction.amount), 0).label('total_amount'),
            func.count(Transaction.transaction_id).label('transaction_count')
        ).join(
            Transaction, Transaction.merchant_id == Merchant.merchant_id
        ).filter(
            Merchant.user_id == user_id,
            Transaction.user_id == user_id,
            Transaction.type == TransactionType.EXPENSE
        )
        
        if start_date:
            query = query.filter(Transaction.transaction_date >= start_date)
        if end_date:
            query = query.filter(Transaction.transaction_date <= end_date)
        
        # Calculate total spending for percentage
        total_spending = self.db.query(
            func.coalesce(func.sum(Transaction.amount), 0)
        ).filter(
            Transaction.user_id == user_id,
            Transaction.type == TransactionType.EXPENSE
        )
        if start_date:
            total_spending = total_spending.filter(Transaction.transaction_date >= start_date)
        if end_date:
            total_spending = total_spending.filter(Transaction.transaction_date <= end_date)
        
        total = Decimal(str(total_spending.scalar()))
        
        results = query.group_by(
            Merchant.merchant_id, Merchant.merchant_name
        ).order_by(
            func.sum(Transaction.amount).desc()
        ).limit(limit).all()
        
        top_merchants = []
        for result in results:
            percentage = float(result.total_amount / total * 100) if total > 0 else 0.0
            top_merchants.append(
                TopMerchantResponse(
                    merchant_id=result.merchant_id,
                    merchant_name=result.merchant_name,
                    total_amount=Decimal(str(result.total_amount)),
                    transaction_count=result.transaction_count,
                    percentage_of_total=round(percentage, 2)
                )
            )
        
        return top_merchants