# tests/test_services/test_oauth_service.py
import pytest
from unittest.mock import patch, AsyncMock, Mock
import httpx
from jose import jwt
import uuid

from app.services.oauth_service import GoogleAuthService
from app.core.exceptions import OAuthException
from app.config import settings
from app.schemas.auth import OAuthUserInfo


class TestGoogleAuthService:
    """Test Google OAuth service"""

    @pytest.mark.asyncio
    async def test_exchange_code_success(self):
        """Test successful code exchange with Google"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "fake-access-token",
            "refresh_token": "fake-refresh-token",
            "expires_in": 3600,
            "id_token": "fake-id-token"
        }
        
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
            
            result = await GoogleAuthService.exchange_code(
                code="test-auth-code",
                redirect_uri="http://localhost:3000/callback"
            )
            
            assert result["access_token"] == "fake-access-token"
            assert result["refresh_token"] == "fake-refresh-token"
            assert result["expires_in"] == 3600
    
    @pytest.mark.asyncio
    async def test_exchange_code_failure(self):
        """Test failed code exchange with Google"""
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = "Invalid code"
        
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
            
            with pytest.raises(OAuthException) as exc_info:
                await GoogleAuthService.exchange_code(
                    code="invalid-code",
                    redirect_uri="http://localhost:3000/callback"
                )
            
            assert "Google" in str(exc_info.value.detail)
            assert "Failed to exchange" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_exchange_code_network_error(self):
        """Test network error during code exchange"""
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post.side_effect = httpx.RequestError("Network error")
            
            with pytest.raises(httpx.RequestError):
                await GoogleAuthService.exchange_code(
                    code="test-auth-code",
                    redirect_uri="http://localhost:3000/callback"
                )
    
    @pytest.mark.asyncio
    async def test_get_user_info_success(self):
        """Test successfully fetching user info from Google"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "sub": "123456789",
            "email": "user@gmail.com",
            "name": "John Doe",
            "given_name": "John",
            "family_name": "Doe",
            "picture": "https://example.com/photo.jpg"
        }
        
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            result = await GoogleAuthService.get_user_info(access_token="fake-token")
            
            assert isinstance(result, OAuthUserInfo)
            assert result.provider == "google"
            assert result.provider_id == "123456789"
            assert result.email == "user@gmail.com"
            assert result.first_name == "John"
            assert result.last_name == "Doe"
            assert result.full_name == "John Doe"
    
    @pytest.mark.asyncio
    async def test_get_user_info_no_name_parts(self):
        """Test fetching user info when name parts are missing"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "sub": "123456789",
            "email": "user@gmail.com",
            "name": "JohnDoe"  # No spaces
            # No given_name or family_name
        }
        
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            result = await GoogleAuthService.get_user_info(access_token="fake-token")
            
            assert result.first_name == "JohnDoe"  # Falls back to full name
            assert result.last_name is None
    
    @pytest.mark.asyncio
    async def test_get_user_info_failure(self):
        """Test failed user info fetch"""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.text = "Invalid token"
        
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            with pytest.raises(OAuthException) as exc_info:
                await GoogleAuthService.get_user_info(access_token="invalid-token")
            
            assert "Google" in str(exc_info.value.detail)
            assert "Failed to fetch" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_get_user_info_network_error(self):
        """Test network error during user info fetch"""
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get.side_effect = httpx.RequestError("Network error")
            
            with pytest.raises(httpx.RequestError):
                await GoogleAuthService.get_user_info(access_token="fake-token")
    
    @pytest.mark.asyncio
    async def test_integration_mocked(self):
        """Test the full flow with mocked responses"""
        # Mock the token exchange
        with patch("httpx.AsyncClient") as mock_client:
            # Mock token exchange response
            token_mock = Mock()
            token_mock.status_code = 200
            token_mock.json.return_value = {
                "access_token": "fake-access-token",
                "expires_in": 3600
            }
            
            # Mock user info response
            user_mock = Mock()
            user_mock.status_code = 200
            user_mock.json.return_value = {
                "sub": "123456789",
                "email": "user@gmail.com",
                "name": "John Doe",
                "given_name": "John",
                "family_name": "Doe"
            }
            
            # Set up the mock client to return different responses for different calls
            mock_client.return_value.__aenter__.return_value.post.return_value = token_mock
            mock_client.return_value.__aenter__.return_value.get.return_value = user_mock
            
            # Execute the full flow
            tokens = await GoogleAuthService.exchange_code(
                code="test-code",
                redirect_uri="http://localhost:3000/callback"
            )
            
            user_info = await GoogleAuthService.get_user_info(tokens["access_token"])
            
            # Verify results
            assert user_info.email == "user@gmail.com"
            assert user_info.provider_id == "123456789"
            assert user_info.first_name == "John"
            assert user_info.last_name == "Doe"