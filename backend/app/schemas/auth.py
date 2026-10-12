"""Authentication Schemas"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    """Base model for user info"""
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone_number: Optional[str] = None
    
class UserCreate(UserBase):
    """Extends UserBase schema for registering a user"""
    password: str = Field(..., min_length=8, max_length=128)
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit for c in v):
            raise ValueError("Password must contain at least one digit")
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in v):
            raise ValueError("Password must contain at least special character")
        return v
    
class UserLogin(BaseModel):
    """Validates user info during log in"""
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """Info returned when requesting user"""
    user_id: UUID
    email: EmailStr
    full_name: str
    created_at: datetime
    
    class Config:
        from_attributes = True
   
class EmailVerificationRequest(BaseModel):
    token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
    
    @field_validator('new_password')
    def validate_new_password(cls, v):
        """Optional: reuse same validation as registration."""
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        return v
         
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    
class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
    type: Optional[str] = None
    
class LoginRequest(BaseModel):
    email: str
    password: str
   
class LogoutRequest(BaseModel):
    refresh_token: str
     
class RefreshRequest(BaseModel):
    refresh_token: str
    
class OAuthCallbackParams(BaseModel):
    """Query parameters received in OAuth callback"""
    code: str
    state: Optional[str] = None
    
class OAuthUserInfo(BaseModel):
    """Normalized user info fro OAuth providers"""
    provider: str
    provider_id: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None

class OAuthTokenResponse(BaseModel):
    """Response from OAuth token exchange"""
    access_token: str
    refresh_token: Optional[str] = None
    expires_in: int
    id_token: Optional[str] = None