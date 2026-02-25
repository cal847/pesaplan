"""Service for OAuth authentication"""
import httpx
from jose import jwt
from datetime import datetime, timezone
import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.config import settings
from app.models.user import User
from app.core.exceptions import OAuthException
from app.schemas.auth import OAuthUserInfo
import logging

logger = logging.getLogger(__name__)

class GoogleAuthService:
    """
    Handles Google OAuth authentication flow
    """
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
    
    @classmethod
    async def exchange_code(cls, code: str, redirect_uri: str) -> Dict[str, Any]:
        """
        Exchange authorization code for tokens
        """
        async with httpx.AsyncClient() as client:
            
            # Sends code to Google and returns a token response
            token_response = await client.post(
                cls.GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                }
            )
            if token_response.status_code != 200:
                logger.error(f"Google token exchange failed: {token_response.text}")
                raise OAuthException("Google", "Failed to exchange authorization code")
            
            return token_response.json()
    
    @classmethod
    async def get_user_info(cls, access_token: str) -> OAuthUSerInfo:
        """
        Get user info from Google using access token
        """
        async with httpx.AsyncClient() as client:
            user_response = await client.get(
                cls.GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if user_response.status_code != 200:
                raise OAuthException("Google", "Failed to fetch user info")
            
            user_data = user_response.json()
            
            full_name = user_data.get("name", "")
            given_name = user_data.get("given_name", "")
            family_name = user_data.get("family_name", "")
            
            return OAuthUserInfo(
                provider="google",
                provider_id=user_data["sub"],
                email=user_data["email"],
                first_name=given_name or full_name.split()[0] if full_name else None,
                last_name=family_name or " ".join(full_name.split()[1:]) if full_name else None,
                full_name=full_name
            )