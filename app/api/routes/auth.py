"""Routes for authentication"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.services.auth_service import AuthService
from app.services.email_service import EmailService
from app.services.blacklist_service import blacklist_token

from app.schemas.auth import(
    UserCreate,
    UserResponse,
    LoginRequest,
    EmailVerificationRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    Token.
)

from app.api.dependencies.auth import get_current_user, get_current_verified_user
from app.models.user import User
from app.core.exceptions import (
    InvalidVerificationTokenException,
    EmailAlreadyVerifiedException,
    InvalidCredentialsException,
    InvalidTokenException,
    InvalidTokenTypeException,
    UserNotFoundException,
    InvalidResetTokenException,
    ResetTokenExpiredException,
    PasswordResetRequest,
)

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post(
    "/register",
    response_model=dict,
    status_code=status.HTTP_200_OK
    )
async def register(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Registration endpoint
    """
    try:
        AuthService.register_user(db, user_data)
        return {
            "message": "A verification email has been sent to your email. If already registered, please proceed to log in"
        }
    except IntegrityError as e:
        db.rollback()
        logger.warning(f"Integrity error during registration (handled silently): {str(e)}")
        return {
            "message": "A verification email has been sent to your email. If already registered, please proceed to log in"
        }
    except Exception as e:
        logger.error(f"Registration process failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration process failed. Please try again later."
        )

@router.post(
    "/verify-email",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
async def verify_email(
    verification: EmailVerificationRequest,
    db: Session = Depends(get_db)    
):
    """
    Verify user email
    """
    try:
        AuthService.verify_email(db, verification.token)
        return {"message": "Email verified successfully. You can now proceed to log in"}
    except (InvalidVerificationTokenException, EmailAlreadyVerifiedException) as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

@router.post(
    "/login",
    response_model=Token
)
async def login(
    db: Session = Depends(get_db),
    login_data: LoginRequest
) -> Any:
    """
    Authenticates user and return access & refresh tokens
    """
    try:
        user = AuthService.authenticate_user(db, login_data.email, login_data.password)
        tokens = AuthService.create_tokens(user)
        return tokens
    except InvalidCredentialsException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    
@router.post("/refresh", response_model=Token)
async def refresh_token(
    db: Session = Depends(get_db),
    refresh_token: str
):
    """
    Refresh access token
    """
    try:
        tokens = AuthService.refresh_access_token(db, refresh_token)
        return tokens
    except (InvalidTokenException, InvalidTokenTypeException, UserNotFoundException) as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    
@router.post("/forgot-password")
async def forgot_password(
    db: Session = Depends(get_db),
    reset_request: PasswordResetRequest
):
    """
    Request a password reset email
    """
    token = AuthService.request_password_reset(db, reset_request.email)
    if token:
        background_tasks.add_task(
            EmailService.send_password_reset_email(db, reset_request.email),
            reset_request.email,
            token
        )
     return {"message": "If your email is registered, you will receive a password reset link."}
 
 @router.post("/reset-password")
 async def reset_password(
     db: Session = Depends(get_db),
     reset_confirm: PasswordResetConfirm
 ) -> Any:
     try:
        user = AuthService.reset_password(db, reset_confirm.token, reset_confirm.new_password)
        return {"message": "Password reset successfully"}
    except (InvalidResetTokenException, ResetTokenExpiredException) as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Gets information about the currently authenticated user
    """
    return current_user

@router.post("/logout")
async def logout(
    token: str = Depends(oauth2_scheme),  # extract the current token
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    blacklist_token(db, token)
    return {"message": "Logged out successfully"}