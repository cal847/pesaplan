import logging
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Merchant

logger = logging.getLogger(__name__)

class MerchantService:
    def __init__(self, db: Session):
        self.db = db
        
    def get_or_create(self, merchant_name: str) -> Merchant:
        """
        Looks up merchant by normalised name and autocreates if none is found.
        Uses flush()
        """
        normalised = merchant_name.strip().upper()
        
        merchant = self.db.query(Merchant).filter(
            Merchant.merchant_name == normalised
        ).first()
                
        if merchant:
            return merchant
        
        merchant = Merchant(merchant_name=normalised)
        self.db.add(merchant)
        self.db.flush()

        logger.info("merchant_auto_created name=%s", normalised)
        return merchant
