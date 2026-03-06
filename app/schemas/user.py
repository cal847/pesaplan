from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserProfileBase(BaseModel):
    """Base user profile with all optional fields for updates"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None)

class UserProfileUpdate(UserProfileBase):
    """For updates - all fields optional"""
    pass

class UserProfileResponse(BaseModel):
    """Response model - includes all fields"""
    user_id: UUID
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    is_verified: bool
    notification_preferences: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
    
class NotificationPreference(BaseModel):
    email_notifications: bool = True
    sms_notifications: bool = True
    budget_alerts: bool = True
    weekly_report: bool = True

class AccountDeletionRequest(BaseModel):
    password:  Optional[str] = None