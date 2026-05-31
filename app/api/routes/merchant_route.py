import logging
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from datetime import datetime

from app.schemas.merchant import MerchantResponse, TopMerchantResponse, MerchantSpendingResponse, CategorizeMerchantRequest
from app.database import get_db
from app.api.dependencies.auth import get_current_verified_user
from app.models import User
from app.services.merchant_service import MerchantService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/merchants",tags=["Merchants"])


@router.get(
    "",
    response_model=list[MerchantResponse],
    status_code=status.HTTP_200_OK,
)
def get_merchants(
    search: Optional[str] = Query(None, description="Search by merchant name"),
    category_name: Optional[str] = Query(None, description="Search by category name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user)
):
    """
    List all merchants for the current user with optional search
    """
    service = MerchantService(db)
    merchants = service.get_merchants(
        user_id=current_user.user_id,
        search=search,
        category_name=category_name
    )
    return [MerchantResponse.model_validate(m) for m in merchants]

@router.get(
    "/top_merchants",
    response_model=TopMerchantResponse,
    status_code=status.HTTP_200_OK,
)
def get_top_merchants(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    """
    Get top merchants by spending amounts
    """
    service = MerchantService(db)
    return service.get_top_merchants(
        user_id=current_user.user_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )
@router.get(
    "/{merchant_id}/spending",
    response_model=MerchantSpendingResponse,
    status_code=status.HTTP_200_OK,
)
def get_merchant_spending(
    merchant_id: UUID,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    """Get spending per merchant"""
    service = MerchantService(db)
    return service.get_merchant_spending(
        user_id=current_user.user_id,
        merchant_id=merchant_id,
        start_date=start_date,
        end_date=end_date,
    )
    
@router.get(
    "/{merchant_id}",
    response_model=MerchantResponse,
    status_code=status.HTTP_200_OK,
)
def get_merchant(
    merchant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user)
):
    """Single merchant lookup"""
    service = MerchantService(db)
    merchant = service.get_merchant(
        user_id=current_user.user_id,
        merchant_id=merchant_id,
    )
    return MerchantResponse.model_validate(merchant)
    
@router.patch(
    "/{merchant_id}",
    response_model=MerchantResponse,
    status_code=status.HTTP_200_OK,
)
def categorize_merchant(
    merchant_id: UUID,
    payload: CategorizeMerchantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    """
    Assign or remove a category from a merchant.
    Backfills all existing transactions for this merchant.
    Pass category_id=null to remove the category.
    """
    service = MerchantService(db)
    merchant = service.set_category(
        user_id=current_user.user_id,
        merchant_id=merchant_id,
        category_id=payload.category_id,
    )
    return MerchantResponse.model_validate(merchant)