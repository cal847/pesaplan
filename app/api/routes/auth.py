"""Routes for authentication"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Any
import uuid
from urllib.parse import urlencode

from app.database import get_db
from app.services.auth_service import AuthService
from app.services.email_service import EmailService
from app.services.blacklist_service import blacklist_token
from app.api.dependencies.auth import get_current_user, get_current_verified_user
from app.models.user import User
from app.config import settings

from app.schemas.auth import(
    UserCreate,
    UserResponse,
    LoginRequest,
    EmailVerificationRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    Token.
)

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
    
@router.get("/google/login")
async def google_login(request: Request):
    """
    Redirect to Google OAuth authorization page
    """
    if not settings.GOOGLE_OAUTH_ENABLED:
        raise HTTPException(status_code=503, detail="Google OAuth not configured")
    
    state = str(uuid.uuid4())
    request.session["oauth_state"] = state
    
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": f"{settings.FRONTEND_URL}/api/v1/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent"
    }
    
    auth_url = f"https://accounts.google.com/o/oauth2/auth?{urlencode(params)}"
    
    return {"authorization_url": auth_url}

@router.get("google/callback")
async def google_callback(
    request: Request,
    code: str, 
    state: str = None,
    db: Session = Depends(get_db)
):
    """
    Google redirects here after user authorization
    """
    # Verify state
    stored_state = request.session.get("oauth_state")
    if not stored_state or stored_state != state:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    # Clear state
    request.session.pop("oauth_state", None)
    
    # Build redirect URI
    redirect_uri = http://localhost:8000/api/v1/auth/google/callback   (for local development)
    
    try:
        user = await AuthService.authenticate_google(db, code, redirect_uri)
        tokens = AuthService.create_tokens(user)
        return tokens
    except OAuthException as e:
        raise HTTPException(status_code=401, detail=e.detail)
    
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