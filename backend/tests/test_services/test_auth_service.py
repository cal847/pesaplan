"""
Authentication service tests.
Tests all auth business logic: registration, email verification, login,
token management, password reset, OAuth authentication, and logout.
"""

import pytest
from sqlalchemy.orm import Session
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime, timedelta, timezone

from app.services.auth_service import AuthService
from app.services.email_service import EmailService
from app.schemas.auth import UserCreate, OAuthUserInfo
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.core.exceptions import (
    InvalidCredentialsException,
    InvalidVerificationTokenException,
    EmailAlreadyVerifiedException,
    EmailNotVerifiedException,
    InvalidTokenException,
    InvalidTokenTypeException,
    InvalidResetTokenException,
    ResetTokenExpiredException,
    OAuthException
)
from app.config import settings


class TestAuthService:
    """Test all authentication service methods (email/password + OAuth)"""

    # ===== REGISTRATION TESTS =====
    
    @pytest.mark.asyncio
    async def test_register_user_success(self, db_session: Session, background_tasks: MagicMock):
        """Test successful user registration"""
        user_data = UserCreate(
            email="newuser@example.com",
            first_name="New",
            last_name="User",
            phone_number="+1234567890",
            password="TestPassword123!"
        )
        
        user = await AuthService.register_user(db_session, user_data, background_tasks)
        
        assert user.email == user_data.email
        assert user.first_name == user_data.first_name
        assert user.last_name == user_data.last_name
        assert user.phone_number == user_data.phone_number
        assert user.is_verified is False
        assert user.verification_token is not None
        assert user.verification_expires_at is not None
        
        # Verify add_task was called with correct arguments
        background_tasks.add_task.assert_called_once_with(
            EmailService.send_verification_email,
            user_data.email,
            user.verification_token
        )
    
    @pytest.mark.asyncio
    async def test_register_existing_unverified_user_resends_email(
        self, 
        db_session: Session, 
        test_unverified_user: User, 
        background_tasks: MagicMock
    ):
        """Test registering with existing unverified email resends verification"""
        user_data = UserCreate(
            email=test_unverified_user.email,
            first_name="Any",
            last_name="Name",
            phone_number="+9999999999",
            password="TestPassword123!"
        )
        
        old_token = test_unverified_user.verification_token
        
        user = await AuthService.register_user(db_session, user_data, background_tasks)
        
        assert user.user_id == test_unverified_user.user_id
        assert user.verification_token != old_token  # Token was refreshed
        
        # Verify add_task was called with correct arguments
        background_tasks.add_task.assert_called_once_with(
            EmailService.send_verification_email,
            user_data.email,
            user.verification_token
        )
    
    @pytest.mark.asyncio
    async def test_register_existing_verified_user_returns_user(
        self, 
        db_session: Session, 
        test_user: User, 
        background_tasks: MagicMock
    ):
        """Test registering with existing verified email returns user without email"""
        user_data = UserCreate(
            email=test_user.email,
            first_name="Any",
            last_name="Name",
            phone_number="+9999999999",
            password="TestPassword123!"
        )
        
        user = await AuthService.register_user(db_session, user_data, background_tasks)
        
        assert user.user_id == test_user.user_id
        # Verify add_task was NOT called (no email for verified users)
        background_tasks.add_task.assert_not_called()
    
    # ===== EMAIL VERIFICATION TESTS =====
    
    def test_verify_email_success(self, db_session: Session, test_unverified_user: User):
        """Test successful email verification"""
        verified_user = AuthService.verify_email(db_session, test_unverified_user.verification_token)
        
        assert verified_user.is_verified is True
        assert verified_user.verification_token is None
    
    def test_verify_email_invalid_token(self, db_session: Session):
        """Test verification with invalid token"""
        with pytest.raises(InvalidVerificationTokenException):
            AuthService.verify_email(db_session, "invalid-token-123")
    
    def test_verify_email_already_verified(self, db_session: Session, test_user: User):
        """Test verifying an already verified email"""
        # Set a token on verified user
        test_user.verification_token = "some-token"
        db_session.commit()
        
        with pytest.raises(EmailAlreadyVerifiedException):
            AuthService.verify_email(db_session, "some-token")
    
    def test_verify_email_expired_token(self, db_session: Session, test_unverified_user: User):
        """Test verification with expired token"""
        test_unverified_user.verification_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db_session.commit()
        
        with pytest.raises(InvalidVerificationTokenException):
            AuthService.verify_email(db_session, test_unverified_user.verification_token)
    
    # ===== AUTHENTICATION TESTS =====
    
    def test_authenticate_user_success(self, db_session: Session, test_user: User):
        """Test successful authentication"""
        user = AuthService.authenticate_user(db_session, test_user.email, "TestPassword12345!")
        
        assert user.user_id == test_user.user_id
    
    def test_authenticate_user_wrong_password(self, db_session: Session, test_user: User):
        """Test authentication with wrong password"""
        with pytest.raises(InvalidCredentialsException):
            AuthService.authenticate_user(db_session, test_user.email, "WrongPassword123!")
    
    def test_authenticate_user_nonexistent_email(self, db_session: Session):
        """Test authentication with non-existent email"""
        with pytest.raises(InvalidCredentialsException):
            AuthService.authenticate_user(db_session, "nonexistent@example.com", "AnyPassword123!")
    
    def test_authenticate_user_unverified(self, db_session: Session, test_unverified_user: User):
        """Test authentication with unverified email"""
        with pytest.raises(EmailNotVerifiedException):
            AuthService.authenticate_user(db_session, test_unverified_user.email, "TestPassword123!")
    
    # ===== TOKEN TESTS =====
    
    def test_create_tokens(self, db_session: Session, test_user: User):
        """Test token creation"""
        tokens = AuthService.create_tokens(db_session, test_user)
        
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "bearer"
        
        # Verify refresh token was stored in database
        refresh_token = db_session.query(RefreshToken).filter(
            RefreshToken.user_id == test_user.user_id
        ).first()
        assert refresh_token is not None
        assert refresh_token.revoked is False
    
    def test_refresh_access_token_success(self, db_session: Session, test_user: User):
        """Test successful token refresh"""
        # Create initial tokens
        initial_tokens = AuthService.create_tokens(db_session, test_user)
        
        # Refresh the token
        new_tokens = AuthService.refresh_access_token(db_session, initial_tokens["refresh_token"])
        
        assert "access_token" in new_tokens
        assert "refresh_token" in new_tokens
        assert new_tokens["refresh_token"] != initial_tokens["refresh_token"]
        
        # Old token should be revoked
        old_token = db_session.query(RefreshToken).filter(
            RefreshToken.jti == initial_tokens["refresh_token"]
        ).first()
        assert old_token is None or old_token.revoked is True
    
    def test_refresh_token_invalid_token(self, db_session: Session):
        """Test refresh with invalid token"""
        with pytest.raises(InvalidTokenException):
            AuthService.refresh_access_token(db_session, "invalid.token.here")
    
    def test_refresh_token_wrong_type(self, db_session: Session, test_user: User):
        """Test refresh with access token instead of refresh token"""
        from app.core.security import create_access_token
        access_token = create_access_token({"sub": str(test_user.user_id)})
        
        with pytest.raises(InvalidTokenTypeException) as exc_info:
            AuthService.refresh_access_token(db_session, access_token)
        
        # Check the error message
        error_detail = str(exc_info.value.detail).lower()
        assert "invalid token type" in error_detail
    
    def test_refresh_token_reuse_detection(self, db_session: Session, test_user: User):
        """Test that using same refresh token twice is detected"""
        tokens = AuthService.create_tokens(db_session, test_user)
        
        # First refresh - should work
        AuthService.refresh_access_token(db_session, tokens["refresh_token"])
        
        # Second refresh with same token - should fail
        with pytest.raises(InvalidTokenException):
            AuthService.refresh_access_token(db_session, tokens["refresh_token"])
    
    def test_refresh_token_expired(self, db_session: Session, test_user: User):
        """Test refresh with expired token"""
        from jose import jwt
        import uuid
        from datetime import datetime, timedelta, timezone
        
        # Create a properly signed but expired token
        expired_token = jwt.encode(
            {
                "sub": str(test_user.user_id),
                "jti": str(uuid.uuid4()),
                "type": "refresh",
                "exp": datetime.now(timezone.utc) - timedelta(days=1)  # Expired
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        with pytest.raises(InvalidTokenException) as exc_info:
            AuthService.refresh_access_token(db_session, expired_token)
        
        # Check it's an expiration error
        error_detail = str(exc_info.value.detail).lower()
        assert "expired" in error_detail or "invalid" in error_detail
    
    # ===== PASSWORD RESET TESTS =====
    
    def test_request_password_reset_success(self, db_session: Session, test_user: User):
        """Test successful password reset request"""
        token = AuthService.request_password_reset(db_session, test_user.email)
        
        assert token is not None
        assert test_user.reset_password_token == token
        assert test_user.reset_token_expires_at is not None
        
        # Handle timezone-aware comparison
        expires_at = test_user.reset_token_expires_at
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        assert expires_at > datetime.now(timezone.utc)
    
    def test_request_password_reset_nonexistent_email(self, db_session: Session):
        """Test password reset with non-existent email"""
        token = AuthService.request_password_reset(db_session, "nonexistent@example.com")
        
        assert token is None
    
    def test_reset_password_success(self, db_session: Session, test_user: User):
        """Test successful password reset"""
        # First request reset
        reset_token = AuthService.request_password_reset(db_session, test_user.email)
        
        # Store old password hash
        old_hash = test_user.password_hash
        
        # Then reset password
        new_password = "NewStrongPass123!"
        user = AuthService.reset_password(db_session, reset_token, new_password)
        
        assert user.password_hash != old_hash
        
        # Should be able to authenticate with new password
        AuthService.authenticate_user(db_session, test_user.email, new_password)
    
    def test_reset_password_invalid_token(self, db_session: Session):
        """Test reset with invalid token"""
        with pytest.raises(InvalidResetTokenException):
            AuthService.reset_password(db_session, "invalid-token", "NewPassword123!")
    
    def test_reset_password_expired_token(self, db_session: Session, test_user: User):
        """Test reset with expired token"""
        # Request reset
        reset_token = AuthService.request_password_reset(db_session, test_user.email)
        
        # Manually expire the token
        test_user.reset_token_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db_session.commit()
        
        with pytest.raises(ResetTokenExpiredException):
            AuthService.reset_password(db_session, reset_token, "NewPassword123!")
    
    def test_reset_password_revokes_refresh_tokens(self, db_session: Session, test_user: User):
        """Test that password reset revokes all refresh tokens"""
        # Create some refresh tokens
        AuthService.create_refresh_token(db_session, test_user)
        AuthService.create_refresh_token(db_session, test_user)
        
        # Request and use password reset
        reset_token = AuthService.request_password_reset(db_session, test_user.email)
        AuthService.reset_password(db_session, reset_token, "NewPassword123!")
        
        # All refresh tokens should be revoked
        active_tokens = db_session.query(RefreshToken).filter(
            RefreshToken.user_id == test_user.user_id,
            RefreshToken.revoked == False
        ).count()
        assert active_tokens == 0
    
    # ===== LOGOUT TESTS =====
    
    def test_logout_success(self, db_session: Session, test_user: User):
        """Test successful logout"""
        # Create a refresh token
        token_string = AuthService.create_refresh_token(db_session, test_user)
        
        # Get the token record from database
        token_record = db_session.query(RefreshToken).filter(
            RefreshToken.user_id == test_user.user_id
        ).first()
        assert token_record is not None
        assert token_record.revoked is False
        
        # Logout using the token string
        AuthService.logout(db_session, token_string)
        
        # Refresh the token record and check it's revoked
        db_session.refresh(token_record)
        assert token_record.revoked is True
    
    def test_logout_invalid_token(self, db_session: Session):
        """Test logout with invalid token (should not raise error)"""
        # This should not raise any exception
        AuthService.logout(db_session, "invalid.token.here")
        # Test passes if no exception
    
    # ===== OAUTH TESTS =====
    
    @pytest.mark.asyncio
    async def test_authenticate_google_new_user(self, db_session: Session):
        """Test Google OAuth with new user"""
        with patch("app.services.oauth_service.GoogleAuthService.exchange_code", new_callable=AsyncMock) as mock_exchange:
            with patch("app.services.oauth_service.GoogleAuthService.get_user_info", new_callable=AsyncMock) as mock_user_info:
                # Mock token exchange
                mock_exchange.return_value = {"access_token": "fake-access-token"}
                
                # Mock user info
                mock_user_info.return_value = OAuthUserInfo(
                    provider="google",
                    provider_id="123456789",
                    email="oauthuser@gmail.com",
                    first_name="OAuth",
                    last_name="User",
                    full_name="OAuth User"
                )
                
                user = await AuthService.authenticate_google(
                    db_session, 
                    "fake-auth-code", 
                    "http://localhost:8000/callback"
                )
                
                assert user.email == "oauthuser@gmail.com"
                assert user.oauth_provider == "google"
                assert user.oauth_id == "123456789"
                assert user.is_verified is True
                assert user.password_hash is None
    
    @pytest.mark.asyncio
    async def test_authenticate_google_existing_user_by_email(self, db_session: Session, test_user: User):
        """Test Google OAuth with existing user (linking accounts)"""
        with patch("app.services.oauth_service.GoogleAuthService.exchange_code", new_callable=AsyncMock) as mock_exchange:
            with patch("app.services.oauth_service.GoogleAuthService.get_user_info", new_callable=AsyncMock) as mock_user_info:
                mock_exchange.return_value = {"access_token": "fake-access-token"}
                
                # Use the test user's email
                mock_user_info.return_value = OAuthUserInfo(
                    provider="google",
                    provider_id="987654321",
                    email=test_user.email,
                    first_name="Any",
                    last_name="Name",
                    full_name="Any Name"
                )
                
                user = await AuthService.authenticate_google(
                    db_session, 
                    "fake-auth-code", 
                    "http://localhost:8000/callback"
                )
                
                assert user.user_id == test_user.user_id
                assert user.oauth_provider == "google"
                assert user.oauth_id == "987654321"
                assert user.is_verified is True
    
    @pytest.mark.asyncio
    async def test_authenticate_google_existing_oauth_user(self, db_session: Session, test_user: User):
        """Test Google OAuth with existing OAuth user"""
        # First, link the test user as an OAuth user
        test_user.oauth_provider = "google"
        test_user.oauth_id = "555555555"
        db_session.commit()
        
        with patch("app.services.oauth_service.GoogleAuthService.exchange_code", new_callable=AsyncMock) as mock_exchange:
            with patch("app.services.oauth_service.GoogleAuthService.get_user_info", new_callable=AsyncMock) as mock_user_info:
                mock_exchange.return_value = {"access_token": "fake-access-token"}
                
                # Return same provider ID
                mock_user_info.return_value = OAuthUserInfo(
                    provider="google",
                    provider_id="555555555",
                    email="different@example.com",  # Different email, but same provider ID
                    first_name="Any",
                    last_name="Name",
                    full_name="Any Name"
                )
                
                user = await AuthService.authenticate_google(
                    db_session, 
                    "fake-auth-code", 
                    "http://localhost:8000/callback"
                )
                
                # Should find by provider ID, not email
                assert user.user_id == test_user.user_id
    
    @pytest.mark.asyncio
    async def test_authenticate_google_failure(self, db_session: Session):
        """Test Google OAuth failure"""
        with patch("app.services.oauth_service.GoogleAuthService.exchange_code", new_callable=AsyncMock) as mock_exchange:
            mock_exchange.side_effect = Exception("Google API error")
            
            with pytest.raises(OAuthException) as exc_info:
                await AuthService.authenticate_google(
                    db_session, 
                    "fake-auth-code", 
                    "http://localhost:8000/callback"
                )
            
            assert "Google" in str(exc_info.value.detail)
    
    def test_handle_oauth_user_new(self, db_session: Session):
        """Test handling new OAuth user"""
        user_info = OAuthUserInfo(
            provider="google",
            provider_id="111222333",
            email="newoauth@example.com",
            first_name="New",
            last_name="OAuth",
            full_name="New OAuth"
        )
        
        user = AuthService._handle_oauth_user(db_session, user_info)
        
        assert user.email == "newoauth@example.com"
        assert user.oauth_provider == "google"
        assert user.oauth_id == "111222333"
        assert user.is_verified is True
        assert user.password_hash is None
        assert user.phone_number == ""  # Default empty string
    
    def test_handle_oauth_user_existing_by_email(self, db_session: Session, test_user: User):
        """Test handling OAuth user that exists by email"""
        user_info = OAuthUserInfo(
            provider="google",
            provider_id="444555666",
            email=test_user.email,
            first_name="Any",
            last_name="Name",
            full_name="Any Name"
        )
        
        user = AuthService._handle_oauth_user(db_session, user_info)
        
        assert user.user_id == test_user.user_id
        assert user.oauth_provider == "google"
        assert user.oauth_id == "444555666"
    
    def test_handle_oauth_user_existing_by_provider(self, db_session: Session, test_user: User):
        """Test handling OAuth user that exists by provider ID"""
        # Set up existing OAuth link
        test_user.oauth_provider = "google"
        test_user.oauth_id = "777888999"
        db_session.commit()
        
        user_info = OAuthUserInfo(
            provider="google",
            provider_id="777888999",
            email="different@example.com",  # Different email
            first_name="Any",
            last_name="Name",
            full_name="Any Name"
        )
        
        user = AuthService._handle_oauth_user(db_session, user_info)
        
        assert user.user_id == test_user.user_id  # Found by provider ID, not email