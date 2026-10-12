"""Security utility for password hashing and JWT tokens"""
from datetime import datetime, timedelta, timezone
import string
import secrets
import uuid
from typing import Optional, Dict, Any
from jose  import jwt
from passlib.context import CryptContext
from app.config import settings
import hashlib
import bcrypt

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Hash a password using SHA256 + bcrypt."""
    # SHA256 pre-hash
    pre_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
    # bcrypt directly
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pre_hash.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    pre_hash = hashlib.sha256(plain_password.encode('utf-8')).hexdigest()
    return bcrypt.checkpw(pre_hash.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
        
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({
        "jti": str(uuid.uuid4()),
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

def generate_verification_token() -> str:
    """Generate a token for email verification"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(32))

def generate_reset_token() -> str:
    """Generate token for password reset"""
    return secrets.token_urlsafe(32)