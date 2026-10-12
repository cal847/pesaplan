import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.sms import SMSBatch, SMSMessage, SMSImportResponse
from app.services.import_service import SMSImportService
from app.api.dependencies.auth import get_current_verified_user
from app.models import User
from app.worker.tasks import process_sms_batch

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sms", tags=["sms"])

@router.post(
    "/parse",
    status_code=status.HTTP_201_CREATED,
)
async def parse_single_sms(
    payload: SMSMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
): 
    """
    Real-time single sms processing
    """
    service = SMSImportService(db)
    transaction = service.process_one(
        raw=payload.message,
        user_id=current_user.user_id,
    )
    
    if transaction is None:
        return {
            "status": "skipped",
            "message": "SMS could not be parsed or was a duplicate",
        }
        
    return {
        "status": "created",
        "transaction_id": str(transaction.transaction_id),
        "amount": str(transaction.amount),
        "type": transaction.type,
    }

@router.post(
    "/import",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=SMSImportResponse
)
async def import_sms_batch(
    payload: SMSBatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    """
    Bulk sms processing
    """
    results =  process_sms_batch.delay(
        messages=[m.message for m in payload.messages],
        user_id=str(current_user.user_id),
    )
    
    return SMSImportResponse(
        total=len(payload.messages)
    )