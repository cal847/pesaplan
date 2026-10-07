"""
Authentication API endpoint tests.
Tests all auth routes: registration, email verification, login,
token refresh, password reset, logout, and OAuth flows.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import uuid

from app.models.user import User
from app.models.refresh_token import RefreshToken


class TestAuthRoutes:
    """Test all authentication endpoints (email/password + OAuth)"""

    # ===== REGISTRATION TESTS =====
    
    def test_register_success(self, client: TestClient):
        """Test successful user registration"""
        user_data = {
            "email": "newuser@example.com",
            "first_name": "New",
            "last_name": "User",
            "phone_number": "+1234567890",
            "password": "TestPassword123!"
        }
        
        with patch("app.services.email_service.EmailService.send_verification_email", new_callable=AsyncMock) as mock_email:
            response = client.post("/api/v1/auth/register", json=user_data)
            
            assert response.status_code == 200
            data = response.json()
            assert "verification email has been sent" in data["message"].lower()
            mock_email.assert_called_once()
    
    def test_register_existing_email(self, client: TestClient, test_user: User):
        """Test registration with existing email"""
        user_data = {
            "email": test_user.email,
            "first_name": "Another",
            "last_name": "User",
            "phone_number": "+9999999999",
            "password": "TestPassword123!"
        }
        
        with patch("app.services.email_service.EmailService.send_verification_email", new_callable=AsyncMock) as mock_email:
            response = client.post("/api/v1/auth/register", json=user_data)
            
            assert response.status_code == 200
            # Should still return success message (for security)
            assert "verification email has been sent" in response.json()["message"].lower()
            # Should NOT send email for existing verified user
            mock_email.assert_not_called()
    
    def test_register_invalid_password(self, client: TestClient):
        """Test registration with invalid password"""
        user_data = {
            "email": "newuser@example.com",
            "first_name": "New",
            "last_name": "User",
            "phone_number": "+1234567890",
            "password": "weak"  # Too short, no uppercase, no digit, no special
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        
        assert response.status_code == 422  # Validation error
    
    # ===== EMAIL VERIFICATION TESTS =====
    
    def test_verify_email_success(self, client: TestClient, test_unverified_user: User):
        """Test successful email verification"""
        response = client.post(
            "/api/v1/auth/verify-email",
            json={"token": test_unverified_user.verification_token}
        )
        
        assert response.status_code == 200
        assert "email verified successfully" in response.json()["message"].lower()
    
    def test_verify_email_invalid_token(self, client: TestClient):
        """Test verification with invalid token"""
        response = client.post(
            "/api/v1/auth/verify-email",
            json={"token": "invalid-token-123"}
        )
        
        assert response.status_code == 400
        assert "invalid verification token" in response.json()["detail"].lower()
    
    def test_verify_email_already_verified(self, client: TestClient, test_user: User, db_session: Session):
        """Test verifying an already verified email"""
        # Set a token on verified user
        test_user.verification_token = "some-token"
        db_session.commit()
        
        response = client.post(
            "/api/v1/auth/verify-email",
            json={"token": "some-token"}
        )
        
        assert response.status_code == 400
        detail = response.json()["detail"].lower()
        assert "already verified" in detail or "email_already_verified" in detail    
        
    # ===== LOGIN TESTS =====
    
    def test_login_success(self, client: TestClient, test_user: User):
        """Test successful login"""
        login_data = {
            "email": test_user.email,
            "password": "TestPassword12345!"
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_invalid_password(self, client: TestClient, test_user: User):
        """Test login with wrong password"""
        login_data = {
            "email": test_user.email,
            "password": "WrongPassword123!"
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
        assert "incorrect email or password" in response.json()["detail"].lower()
    
    def test_login_nonexistent_email(self, client: TestClient):
        """Test login with non-existent email"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "TestPassword123!"
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
        assert "incorrect email or password" in response.json()["detail"].lower()
    
    def test_login_unverified_user(self, client: TestClient, test_unverified_user: User):
        """Test login with unverified email"""
        login_data = {
            "email": test_unverified_user.email,
            "password": "TestPassword123!"
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 400 
    
    # ===== TOKEN REFRESH TESTS =====
    
    def test_refresh_token_success(self, client: TestClient, test_user: User):
        """Test successful token refresh"""
        # First login to get tokens
        login_data = {
            "email": test_user.email,
            "password": "TestPassword12345!"
        }
        login_response = client.post("/api/v1/auth/login", json=login_data)
        tokens = login_response.json()
        
        # Refresh the token
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["refresh_token"] != tokens["refresh_token"]  # Token rotation
    
    def test_refresh_token_invalid(self, client: TestClient):
        """Test refresh with invalid token"""
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid.token.here"}
        )
        
        assert response.status_code == 401
    
    def test_refresh_token_with_access_token(self, client: TestClient, test_user: User):
        """Test trying to refresh with an access token"""
        # Login to get tokens
        login_data = {
            "email": test_user.email,
            "password": "TestPassword12345!"
        }
        login_response = client.post("/api/v1/auth/login", json=login_data)
        tokens = login_response.json()
        
        # Try to use access token as refresh token
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens["access_token"]}
        )
        
        assert response.status_code == 401
        assert "invalid token type" in response.json()["detail"].lower()
    
    # ===== PASSWORD RESET TESTS =====
    
    def test_forgot_password_success(self, client: TestClient, test_user: User):
        """Test password reset request for existing user"""
        with patch("app.services.email_service.EmailService.send_password_reset_email", new_callable=AsyncMock) as mock_email:
            response = client.post(
                "/api/v1/auth/forgot-password",
                json={"email": test_user.email}
            )
            
            assert response.status_code == 200
            assert "if your email is registered" in response.json()["message"].lower()
            mock_email.assert_called_once()
    
    def test_forgot_password_nonexistent_email(self, client: TestClient):
        """Test password reset with non-existent email (should return same message)"""
        with patch("app.services.email_service.EmailService.send_password_reset_email", new_callable=AsyncMock) as mock_email:
            response = client.post(
                "/api/v1/auth/forgot-password",
                json={"email": "nonexistent@example.com"}
            )
            
            assert response.status_code == 200  # Same message for security
            assert "if your email is registered" in response.json()["message"].lower()
            mock_email.assert_not_called()  # No email sent
    
    def test_reset_password_success(self, client: TestClient, test_user: User, db_session: Session):
        """Test successful password reset"""
        from app.core.security import generate_reset_token
        
        # Create reset token
        reset_token = generate_reset_token()
        test_user.reset_password_token = reset_token
        test_user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        db_session.commit()
        
        response = client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": reset_token,
                "new_password": "NewStrongPass123!"
            }
        )
        
        assert response.status_code == 200
        assert "password reset successfully" in response.json()["message"].lower()
        
        # Try logging in with new password
        login_data = {
            "email": test_user.email,
            "password": "NewStrongPass123!"
        }
        login_response = client.post("/api/v1/auth/login", json=login_data)
        assert login_response.status_code == 200
    
    def test_reset_password_invalid_token(self, client: TestClient):
        """Test reset with invalid token"""
        response = client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": "invalid-token",
                "new_password": "NewStrongPass123!"
            }
        )
        
        assert response.status_code == 400
        assert "invalid reset token" in response.json()["detail"].lower()
    
    def test_reset_password_expired_token(self, client: TestClient, test_user: User, db_session: Session):
        """Test reset with expired token"""
        from app.core.security import generate_reset_token
        
        # Create expired token
        reset_token = generate_reset_token()
        test_user.reset_password_token = reset_token
        test_user.reset_token_expires_at = datetime.now(timezone.utc) - timedelta(hours=1)  # Expired
        db_session.commit()
        
        response = client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": reset_token,
                "new_password": "NewStrongPass123!"
            }
        )
        
        assert response.status_code == 400
        assert "expired" in response.json()["detail"].lower()
    
    # ===== CURRENT USER TESTS =====
    
    # def test_get_current_user_success(self, client: TestClient, test_user: User, auth_headers: dict):
    #     """Test getting current user info"""
    #     response = client.get("/api/v1/auth/me", headers=auth_headers)
        
    #     assert response.status_code == 200
    #     data = response.json()
    #     assert data["email"] == test_user.email
    #     assert test_user.first_name in data["full_name"]
    #     assert test_user.last_name in data["full_name"]
    
    # def test_get_current_user_unauthenticated(self, client: TestClient):
    #     """Test getting user info without auth"""
    #     response = client.get("/api/v1/auth/me")
        
    #     assert response.status_code == 401
    
    # def test_get_current_user_with_refresh_token(self, client: TestClient, test_user: User):
    #     """Test accessing protected endpoint with refresh token (should fail)"""
    #     # Login to get tokens
    #     login_data = {
    #         "email": test_user.email,
    #         "password": "TestPassword12345!"
    #     }
    #     login_response = client.post("/api/v1/auth/login", json=login_data)
    #     tokens = login_response.json()
        
    #     # Try to use refresh token as access token
    #     response = client.get(
    #         "/api/v1/auth/me",
    #         headers={"Authorization": f"Bearer {tokens['refresh_token']}"}
    #     )
        
    #     assert response.status_code == 401
    #     assert "invalid token type" in response.json()["detail"].lower()
    
    # ===== LOGOUT TESTS =====
    
    def test_logout_success(self, client: TestClient, test_user: User):
        """Test successful logout"""
        # First login to get tokens
        login_data = {
            "email": test_user.email,
            "password": "TestPassword12345!"
        }
        login_response = client.post("/api/v1/auth/login", json=login_data)
        tokens = login_response.json()
        
        # Logout with the refresh token
        logout_response = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={"refresh_token": tokens["refresh_token"]}
        )
        
        assert logout_response.status_code == 200
        assert "logged out successfully" in logout_response.json()["message"].lower()
        
        # Try to refresh with the same token (should fail)
        refresh_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]}
        )
        assert refresh_response.status_code == 401
    
    def test_logout_twice(self, client: TestClient, test_user: User):
        """Test logging out twice (should still succeed)"""
        # Login
        login_data = {
            "email": test_user.email,
            "password": "TestPassword12345!"
        }
        login_response = client.post("/api/v1/auth/login", json=login_data)
        tokens = login_response.json()
        
        # First logout
        logout1 = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={"refresh_token": tokens["refresh_token"]}
        )
        assert logout1.status_code == 200
        
        # Second logout with same token (should still return success)
        logout2 = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={"refresh_token": tokens["refresh_token"]}
        )
        assert logout2.status_code == 200
    
    # ===== OAUTH ROUTE TESTS =====
    
    def test_google_login_redirect(self, client: TestClient):
        """Test Google OAuth login redirect endpoint"""
        response = client.get("/api/v1/auth/google/login")
        
        assert response.status_code == 200
        data = response.json()
        assert "authorization_url" in data
        assert "accounts.google.com" in data["authorization_url"]
        assert "client_id" in data["authorization_url"]
    
    def test_google_login_not_configured(self, client: TestClient, monkeypatch):
        """Test Google OAuth when not configured"""
        # Mock settings to disable Google OAuth
        monkeypatch.setattr("app.config.settings.GOOGLE_CLIENT_ID", None)
        monkeypatch.setattr("app.config.settings.GOOGLE_CLIENT_SECRET", None)
        
        response = client.get("/api/v1/auth/google/login")
        
        assert response.status_code == 503
        assert "not configured" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_google_callback_success(self, client: TestClient, db_session):
        """Test successful Google OAuth callback"""
        import uuid
        from app.models.user import User
        from starlette.middleware.sessions import SessionMiddleware
        
        # Mock session state - need to use the session object, not raw cookie
        with client as c:
            # Create a session by making a request first
            c.get("/")  # This initializes the session
            
            # Now set the state in the session (this goes through the middleware)
            with patch("starlette.requests.Request.session") as mock_session:
                mock_session.get.return_value = "test-state-123"
                mock_session.__contains__.return_value = True
                
                with patch("app.services.auth_service.AuthService.authenticate_google", new_callable=AsyncMock) as mock_auth:
                    # Mock the authenticated user
                    mock_user = User(
                        user_id=uuid.uuid4(),
                        email="googleuser@example.com",
                        first_name="Google",
                        last_name="User",
                        phone_number="",
                        is_verified=True
                    )
                    mock_auth.return_value = mock_user
                    
                    with patch("app.services.auth_service.AuthService.create_tokens") as mock_tokens:
                        mock_tokens.return_value = {
                            "access_token": "fake-access-token",
                            "refresh_token": "fake-refresh-token",
                            "token_type": "bearer"
                        }
                        
                        response = c.get(
                            "/api/v1/auth/google/callback",
                            params={"code": "test-auth-code", "state": "test-state-123"}
                        )
                        
                        if response.status_code != 200:
                            print(f"Response status: {response.status_code}")
                            print(f"Response body: {response.json()}")
                        
                        assert response.status_code == 200
                        data = response.json()
                        assert "access_token" in data
                        assert "refresh_token" in data
                        assert data["token_type"] == "bearer"
                    
    def test_google_callback_invalid_state(self, client: TestClient):
        """Test Google callback with invalid state parameter"""
        with client as c:
            # Set different session state
            c.cookies.set("oauth_session", "real-state")
            
            response = c.get(
                "/api/v1/auth/google/callback",
                params={"code": "test-code", "state": "wrong-state"}
            )
            
            assert response.status_code == 400
            assert "invalid state" in response.json()["detail"].lower()
    
    def test_google_callback_missing_state(self, client: TestClient):
        """Test Google callback with missing state parameter"""
        with client as c:
            c.cookies.set("oauth_session", "real-state")
            
            response = c.get(
                "/api/v1/auth/google/callback",
                params={"code": "test-code"}  # No state
            )
            
            assert response.status_code == 400
            assert "invalid state" in response.json()["detail"].lower()