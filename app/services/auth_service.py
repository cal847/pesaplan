""" Authentication Business Logic"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone, timedelta
from models.user import User
from schemas.auth import UserCreate
from jose import JWTError, jwt
from api.dependencies.auth import get_user_by_email, get_user_by_number, get_user_by_id
import uuid

from core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token,
    generate_verification_token, generate_reset_token
    )

from core.exceptions import (
    UserAlreadyExistsException, InvalidVerificationTokenException,
    InvalidCredentialsException, InvalidResetTokenException,
    EmailAlreadyVerifiedException, EmailNotVerifiedException,
    InvalidTokenException, InvalidTokenTypeException,
    UserNotFoundException, ResetTokenExpiredException
)

from services.email_service import EmailService
from services.oauth_service import GoogleOAuthService

import logging
from app.config import settings

logger = logging.getLogger(__name__)

class AuthService:
    """
    Handles registration, authentication, email verification and password reset
    """
    @staticmethod
    def register_user(db: Session, user_data: UserCreate) -> User:
        """Register a new user and send email verification"""
        existing_user = get_user_by_email(db, user_data.email)
        if existing_user:
            logger.info("Registration attempt for existing email")
            
            if not existing_user.is_verified:
                verification_token = generate_verification_token()
                existing_user.verification_token = verification_token
                existing_user.verification_sent_at = datetime.now(timezone.utc)
                db.commit()
                EmailService.send_verification_email(user_data.email, verification_token)
                logger.info(f"Resent verification email to {user_data.email}")
                return User
                
            return existing_user
        
        verification_token = generate_verification_token()
        hashed_password = get_password_hash(user_data.password)
        user = User(
            email=user_data.email,
            password_hash=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone_number=user_data.phone_number,
            verification_token=verification_token,
            verification_sent_at=datetime.now(timezone.utc),
            is_verified=False
        )
        
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
            
            EmailService.send_verification_email(user_data.email, verification_token)
            
            logger.info("User registered successfully")
            return user
        except IntegrityError as e:
            db.rollback()
            logger.error(f"Database integrity error during registration: {e}")
            raise ValueError("Database error during registration")
        
    @staticmethod
    def verify_email(db: Session, token: str) -> User:
        """
        Verify user's email
        """
        user = db.query(User).filter(User.verification_token == token).first()
        if not user:
            raise InvalidVerificationTokenException()
        
        if user.is_verified:
            raise EmailAlreadyVerifiedException()
        
        user.is_verified = True
        user.verification_token = None
        db.commit()
        db.refresh(user)
        
        logger.info(f"Email verified successfully: {user.email}")
        return user
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> User:
        """
        Authenticate user with email and password
        """
        user = get_user_by_email(db, email)
        if not user:
            raise InvalidCredentialsException()
        
        if not user.is_verified:
            raise EmailNotVerifiedException()
        
        if not verify_password(password, user.password_hash):
            raise InvalidCredentialsException()
        
        return user
    
    @staticmethod
    def create_tokens(user: User) -> dict:
        """
        Generate access and refresh tokens for a user.
        """
        access_token = create_access_token(data={"sub": str(user.user_id)})
        refresh_token = create_refresh_token(data={"sub": str(user.user_id)})
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    @staticmethod
    def refresh_access_token(db: Session, refresh_token: str) -> dict:
        """
        Validate refresh token and issue new ones
        """
        try:
            payload = jwt.decode(
                refresh_token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            
            user_id = payload.get("sub")
            token_type = payload.get("type")
            
            if token_type != "refresh":
                raise InvalidTokenTypeException("refresh", token_type)
            
            if not user_id:
                raise InvalidTokenException()
            
        except JWTError:
            raise InvalidTokenException()
        
        user = get_user_by_id(db, uuid.UUID(user_id))
        if not user:
            raise UserNotFoundException(user_id=user_id)
        
        return AuthService.create_tokens(user)
    
    @staticmethod
    def request_password_reset(db: Session, email: str) -> Optional[str]:
        user = get_user_by_email(db, email)
        if not User:
            return None
        reset_token = generate_reset_token
        user.reset_password_token = reset_token
        user.reset_token_expires_at = datetime.not(timezone.utc) _timedelta(minutes=10)
        db.commit()
        return reset_token
    
    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> User:
        """
        Resets password using token
        """
        user = db.query(User).filter(User.reset_password_token == token).first()
        if not user:
            raise InvalidResetTokenException()
        
        if user.reset_token_expires_at < datetime.now(timezone.utc):
            raise ResetTokenExpiredException()
        
        user.password_hash = get_password_hash(new_password)
        user.reset_password_token = None
        user.reset_token_expires_at = None
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        
        logger.info(f"Password reset successful: {user.email}")

        return user
    
    @staticmethod
    async def authenticate_google(db: Session, code: str, redirect_uri: str) -> User:
        """
        Authenticate user using Google OAuth
        """
        try:
            tokens = await GoogleAuthService.exchange_code(code, redirect_uri)
            
            user_info = await GoogleAuthService.get_user+info(tokens["access_token"])
            
            return await AuthService._handle_oauth_user(db, user_info)
        except Exception as e:
            logger.error(f"Google authentication error: {e}")
            raise OAuthException("Google", str(e))
    
    @staticmethod
    def _handle_oauth_user(db: Session, user_info: OAuthUserInfo) -> User:
        """
        Finds existing OAuth user or creates a new one
        """
        # Try to find user by provider and provider_id
        user = db.query(User).filter(
            USer.oauth_provider == user_info.provider,
            User.oauth_id == user_info.provider_id
        ).first()
        
        if user: 
            return user
        
        # Try to find user by email
        user = get_user_by_email(db, user_info.email)
        if user:
            # Link OAuth account to existing users
            user.oauth_provider = user_info.provider
            user.oauth_id = user_info.provider_id
            user.is_verified = True
            db.commit()
            db.refresh(user)
            return user
        
        # Create a new user
        user = User(
            email=user_info.email,
            first_name=user_info.first_name,
            last_name=user_info.last_name,
            phone_number="",
            password_hash=None,
            oauth_provider=user_info.provider,
            oauth_id=user_info.provider_id,
            is_verified=True
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        logger.info(f"New OAuth user created: {user.email} via {user_info.provider}")
        return user