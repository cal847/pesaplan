"""Service for user profile management"""
from sqlalchemy.orm import Session
from typing import Optional
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.api.dependencies.auth import get_user_by_id
from app.core.exceptions import UserNotFoundException, InvalidPasswordException
from app.schemas.user import UserProfileUpdate
from app.core.security import verify_password
import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID

logger = logging.getLogger(__name__)

class UserService:
    @staticmethod
    def update_profile(
        db: Session,
        user_id: UUID,
        profile_data: UserProfileUpdate
    ):
        """Update user profile"""
        user = get_user_by_id(db, user_id)
        if not user:
            raise UserNotFoundException
        
        update_data = profile_data.model_dump(exclude_unset=True, exclude_none=True)
        
        for field, value in update_data.items():
            setattr(user, field, value)
                
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        
        logger.info(f"User {user_id} profile updated successfully")
        return user
    
    @staticmethod
    def update_notification_preferences(
        db: Session,
        user_id: UUID,
        preferences: dict
    ):
        """Update user notifications preferences"""
        user = get_user_by_id(db, user_id)
        if not user:
            raise UserNotFoundException
        
        current = user.notification_preferences or {}
        updated = current.copy()  # Create a copy
        updated.update(preferences)  # Update the copy
        user.notification_preferences = updated  
        
        user.notification_preferences.update(preferences)
        user.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"User {user_id} updated notification preferences successfully")
        return user
    
    @staticmethod
    def soft_delete_user(
        db: Session,
        user_id: UUID,
        password: Optional[str] = None
    ):
        """Soft delete a user"""
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise UserNotFoundException()
        
        if user.password_hash is not None:
            if not password:
                raise ValueError("Password required for account deletion")
            if not verify_password(password, user.password_hash):
                raise InvalidPasswordException()
        
        user.deleted_at = datetime.now(timezone.utc)
        
        db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id
        ).update({"revoked": True})
        
        db.commit()
        
        logger.info(f"User {user_id} soft deleted, will be permanently removed after 30 days")
        return True
