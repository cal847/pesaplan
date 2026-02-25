"""Security utility for password hashing and JWT tokens"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose  import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings
import secrets
import string
import uuid

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_pwd: str, hashed_pwd: str) -> bool:
    """Verifies the plain password against a hashed password"""
    return pwd_context.verify(plain_pwd, hashed_pwd)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({
        "jti": str(uuid.uuid4())
        "exp": expire,
        "type": "access",
        "iat": datetime.now(timezone.utc)
    })
    
    # Encode to JWT string using HS256 algorithm
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt

def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create a refresh token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "jti": str(uuid.uuid4())
        "exp": expire,
        "type": "refresh"
    })
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt

def generate_verification_token() -> str:
    """Generate a token for email verification"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(32))

def generate_reset_token() -> str:
    """Generate token for password reset"""
    return secrets.token_urlsafe(32)