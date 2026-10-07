# tests/test_core/test_security.py
import pytest
from datetime import datetime, timedelta, timezone
from jose import jwt
import uuid
import re

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    generate_verification_token,
    generate_reset_token
)
from app.config import settings


class TestSecurity:
    """Test security utility functions"""

    def test_password_hashing(self):
        """Test password hashing and verification"""
        password = "TestPassword123!"
        
        # Hash the password
        hashed = get_password_hash(password)
        
        # Should be different from original
        assert hashed != password
        
        # Should verify correctly
        assert verify_password(password, hashed) is True
        
        # Should not verify wrong password
        assert verify_password("WrongPassword", hashed) is False
        
        # Same password should hash differently each time (due to salt)
        hashed2 = get_password_hash(password)
        assert hashed != hashed2

    def test_create_access_token(self):
        """Test access token creation"""
        user_id = str(uuid.uuid4())
        data = {"sub": user_id}
        
        token = create_access_token(data)
        
        # Decode and verify
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        assert payload["sub"] == user_id
        assert payload["type"] == "access"
        assert "jti" in payload
        assert "exp" in payload
        assert "iat" in payload
        
        # JTI should be a valid UUID
        assert uuid.UUID(payload["jti"])

    def test_create_access_token_with_custom_expiry(self):
        """Test access token with custom expiry"""
        data = {"sub": "test-user-id"}
        expires_delta = timedelta(minutes=5)
        
        token = create_access_token(data, expires_delta)
        
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False}
        )
        
        # Check expiry is approximately 5 minutes from now
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        time_diff = (exp - now).total_seconds()
        
        # Should be close to 300 seconds (5 minutes)
        assert 290 < time_diff < 310

    def test_create_access_token_default_expiry(self):
        """Test access token with default expiry from settings"""
        data = {"sub": "test-user-id"}
        
        token = create_access_token(data)
        
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False}
        )
        
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        time_diff = (exp - now).total_seconds()
        
        # Should match settings.ACCESS_TOKEN_EXPIRE_MINUTES
        expected_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        assert abs(time_diff - expected_seconds) < 10

    def test_create_access_token_includes_jti(self):
        """Test that access token includes unique JTI"""
        data = {"sub": "test-user-id"}
        
        token1 = create_access_token(data)
        token2 = create_access_token(data)
        
        payload1 = jwt.decode(token1, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        payload2 = jwt.decode(token2, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        # JTIs should be different
        assert payload1["jti"] != payload2["jti"]

    def test_generate_verification_token(self):
        """Test verification token generation"""
        token1 = generate_verification_token()
        token2 = generate_verification_token()
        
        # Check length
        assert len(token1) == 32
        
        # Should be unique
        assert token1 != token2
        
        # Should be alphanumeric only (URL safe)
        assert token1.isalnum()
        assert all(c in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" for c in token1)

    def test_generate_reset_token(self):
        """Test reset token generation"""
        token1 = generate_reset_token()
        token2 = generate_reset_token()
        
        # Should be URL-safe base64 (length > 32)
        assert len(token1) > 32
        
        # Should be unique
        assert token1 != token2
        
        # Should be URL-safe (only alphanumeric, -, _)
        url_safe_pattern = re.compile(r'^[a-zA-Z0-9_-]+$')
        assert url_safe_pattern.match(token1) is not None
        assert url_safe_pattern.match(token2) is not None

    def test_multiple_tokens_unique(self):
        """Test that multiple generated tokens are unique"""
        verification_tokens = [generate_verification_token() for _ in range(100)]
        reset_tokens = [generate_reset_token() for _ in range(100)]
        
        # All should be unique
        assert len(set(verification_tokens)) == 100
        assert len(set(reset_tokens)) == 100

    def test_password_hash_verify_edge_cases(self):
        """Test password hashing edge cases"""
        # Empty password
        empty_hash = get_password_hash("")
        assert verify_password("", empty_hash) is True
        assert verify_password("notempty", empty_hash) is False
        
        # Very long password
        long_password = "a" * 100 + "B" * 100 + "1" * 100 + "!" * 100
        long_hash = get_password_hash(long_password)
        assert verify_password(long_password, long_hash) is True
        
        # Unicode password
        unicode_password = "pässwörd123!🌟"
        unicode_hash = get_password_hash(unicode_password)
        assert verify_password(unicode_password, unicode_hash) is True

    def test_token_expiration_claim_format(self):
        """Test that token expiration claim is properly formatted"""
        data = {"sub": "test-user-id"}
        token = create_access_token(data)
        
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False}
        )
        
        # Exp should be an integer (timestamp)
        assert isinstance(payload["exp"], int)
        
        # Should be in the future
        assert payload["exp"] > datetime.now(timezone.utc).timestamp()