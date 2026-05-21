import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.sms import SMSBatch, SMSMessage, SMSImportResponse
from app.services.import_service import SMSImportService
from app.api.dependencies.auth import get_current_verified_user
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sms", tags=["sms"])

@router.post(
    "/parse",
    status_code=status.HTTP_201_CREATED,
)
async def parse_single_sms(
    payload: SMSMessage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
): 
    """
    Real-time single sms processing
    """
    service = SMSImportService(db)
    transaction = await service.process_one(
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    """
    Bulk sms processing
    """
    service = SMSImportService(db)
    results = await service.process_batch(
        messages=[m.messages for m in payload.message],
        user_id=current_user.user_id
    )
    
    return SMSImportResponse(
        total=len(payload.messages),
        saved=results["created"],
        skipped=results["skipped"],
        failed=results["failed"],
    )