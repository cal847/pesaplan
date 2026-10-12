import logging

from app.worker.celery_app import celery_app
from app.database import SessionLocal
from app.services.import_service import SMSImportService

logger = logging.getLogger(__name__)

@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    name='sms.process_batch',
)
def process_sms_batch(self, messages: list[str], user_id: str) -> dict:
    try:
        with SessionLocal() as db:
            service = SMSImportService(db)
            results = service.process_batch(
                messages=messages,
                user_id=user_id,
            )
            logger.info(
                "sms_batch_task_complete",
                extra={"task_id": self.request.id, "user_id": user_id, **results}
            )
            return results
        
    except Exception as e:
        logger.error(
            "sms_batch_task_failed",
            extra={"task_id": self.request.id, "error": str(e)}
        )
        raise self.retru(e=e)