from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from uuid import UUID
import logging
from datetime import datetime, timezone

from app.database import get_db
from app.services.transaction_service import TransactionService
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.models.user import User
from app.api.dependencies.auth import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])
logger = logging.getLogger(__name__)


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new manual transaction with proper error handling.
    """
    try:
        service = TransactionService(db)
        result = service.create_manual(data, current_user.user_id)

        logger.info(
            "transaction_created_successfully",
            extra={
                "transaction_id": str(result.transaction_id),
                "user_id": str(current_user.user_id),
                "amount": float(data.amount),
                "type": data.type,
                "category_id": str(data.category_id),
            }
        )

        return result

    except ValueError as e:
        # Handle business logic/validation errors (e.g. invalid category, etc.)
        logger.warning(
            "transaction_creation_validation_error",
            extra={"error": str(e), "user_id": str(current_user.user_id), "payload": data.model_dump()}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    except HTTPException as e:
        # Re-raise if already an HTTPException
        raise

    except Exception as e:
        # Catch unexpected errors
        logger.error(
            "transaction_creation_failed_unexpected",
            extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "user_id": str(current_user.user_id),
                "payload": data.model_dump()
            },
            exc_info=True  # This logs the full traceback
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while creating the transaction. Please try again later."
        )


@router.get("", response_model=list[TransactionResponse])
def get_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all transactions for the current user."""
    try:
        service = TransactionService(db)
        return service.get_all_transactions(current_user.user_id)

    except Exception as e:
        logger.error(
            "get_transactions_failed",
            extra={"error": str(e), "user_id": str(current_user.user_id)},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve transactions"
        )