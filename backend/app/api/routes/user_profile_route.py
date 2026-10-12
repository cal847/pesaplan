"""Routes for user profile management"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.user import User
from app.services.user_service import UserService
from app.schemas.user import (
    UserProfileResponse,
    UserProfileUpdate,
    NotificationPreference,
    AccountDeletionRequest
)
from app.core.exceptions import (
    UserNotFoundException,
    InvalidPasswordException
)

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user profile"""
    return current_user

@router.patch("/me", response_model=UserProfileResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    try:
        user = UserService.update_profile(db, current_user.user_id, profile_data)
        return user
    except UserNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/notifications", response_model=UserProfileResponse)
async def update_notifications(
    preferences: NotificationPreference,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update notification preferences"""
    user = UserService.update_notification_preferences(
        db,
        current_user.user_id,
        preferences.model_dump(exclude_unset=True)
    )
    return user

@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_account(
    deletion_data: AccountDeletionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user"""
    try:
        UserService.soft_delete_user(
            db,
            current_user.user_id,
            deletion_data.password
        )
        return {
            "message": "Account deleted successfully"
        }
    except (UserNotFoundException, InvalidPasswordException) as e:
        raise HTTPException(status_code=401, detail=str(e))
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))