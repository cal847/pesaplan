# Import service for bulk sms imports
import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.schemas.sms import SMSParseResult
from app.services.sms_parser import SMSParserService
from app.services.transaction_service import TransactionService

logger = logging.getLogger(__name__)

class SMSImportService:
    def __init__(self, db: Session):
        self.db = db
        self.parser = SMSParserService()
        self.transaction_service = TransactionService(db)
    
    def process_batch(self, messages: list[str], user_id: str) -> dict:
        """
        Takes raw SMS list, parses it ans persists.
        Returns created/skipped/failed counts
        """
        results = {"created": 0, "skipped": 0, "failed": 0}
        
        for raw in messages:
            try:
                parsed: Optional[SMSParseResult] = self.parser.parse_sms(raw)
                
                # Parser returns None if no pattern matches
                if parsed is None:
                    logger.info("sms_skipped", extra={"preview": raw[:60]})
                
                    results["skipped"] += 1
                    continue
                
                transaction =  self.transaction_service.create_from_sms(parsed, user_id)
                
                if transaction:
                    results["created"] += 1
                    logger.info(
                        "transaction_created_from_batch",
                    )
                else:
                    results["skipped"] += 1
                
            except Exception as e:
                logger.error(
                    "sms_processing_failed",
                    extra={
                        "preview": raw[:60],
                        "error": str(e),
                    }
                )
                results["failed"] += 1
                
        logger.info(
            "sms_batch_complete",
            extra={
                "user_id": str(user_id),
                "total": len(messages),
                **results,
            }
        )
        return results
    
    def process_one(self, raw: str, user_id: str) -> Optional[object]:
        """
        Processes single SMS in real-time
        """
        parsed = self.parser.parse_sms(raw)
        
        if parsed is None:
            logger.info(
                "sms_uparseable",
                extra={"preview": raw[:60]}
            )
            return None
        
        return  self.transaction_service.create_from_sms(parsed, user_id)