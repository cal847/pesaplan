import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Merchant

logger = logging.getLogger(__name__)

class MerchantService:
    def __init__(self, db:AsyncSession):
        self.db = db
        
    async def get_or_create(self, merchant_name: str) -> Merchant:
        """
        Looks up merchant by normalised name and autocreates if none is found.
        Uses flush()
        """
        normalised = merchant_name.strip().upper()
        result = await self.db.execute(
            select(Merchant).where(Merchant.merchant_name == normalised)
        )
        merchant = result.scalar_one_or_none()
        
        if merchant:
            return merchant
        
        merchant = Merchant(merchant_name=normalised)
        self.db.add(merchant)
        await self.db.flush()

        logger.info("merchant_auto_created name=%s", normalised)
        return merchant
