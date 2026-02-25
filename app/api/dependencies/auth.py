"""Auth Dependencies"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from models.user import User
from models.blacklist import BlacklistedToken
from schemas.auth import TokenPayload
from core.exceptions import InvalidTokenException, UserNotFoundException, EmailNotVerifiedException
import uuid

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_user_by_email(
    db: Session,
    email: str
    ) -> Optional[User]:
    """Gets active user by email"""
    return db.query(User).filter(
        User.email == email,
        User.deleted_at.is_(None)
    ).first()
    
def get_user_by_id(
    db: Session,
    user_id: UUID
) -> Optional[User]:
    """Gets active user by id"""
    return db.query(User).filter(
        User.user_id == user_id,
        User.deleted_at.is_(None)
    ).first()

def get_user_by_number(
    db: Session,
    number: str
):
    """Gets active user by phone number"""
    return db.query(User).filter(
        User.phone_number == number,
        User.deleted_at.is_(None)
    ).first()

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Gets the current user, validates the JWT token and returns the user object
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        jti = payload.get("jti")
        if not jti:
            raise InvalidTokenException
        
        # Check if token is blacklisted
        blacklisted = db.query(BlacklistedToken).filter(BlacklistedToken.jti == jti).first()
        if blacklisted:
            raise InvalidTokenException(detail="Token has been revoked")
        
        # Get user id
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "access":
            raise InvalidTokenException()
        
        token_data = TokenPayload(sub=user_id)
        
    except JWTError:
        raise InvalidTokenException()
    
    user = get_user_by_id(db, uuid.UUID(user_ids))
    if user is None:
        raise UserNotFoundException
    
    return user

def get_current_verified_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Used in endpoints that require email verification
    """
    if not current_user.is_verified:
        raise EmailNotVerifiedException
    
    return current_user