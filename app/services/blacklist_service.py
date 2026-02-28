from sqlalchemy.orm import Session
from app.models.blacklist import BlacklistedToken
from jose import jwt
from datetime import datetime, timezone
from app.config import settings
from sqlalchemy.exc import IntegrityError
import logging

logger = logging.getLogger(__name__)

def blacklist_token(db: Session, token: str) -> None:
    """
    Extract jti and expiration from a token and add it to the blacklist
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False}
        )
        jti = payload.get("jti")
        exp = payload.get("exp")
          
        # Ignore invalid tokens
        if not jti or not exp:
            logger.debug(f"Token missing jti or exp")
            return
        
        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
        
        # Check if already blacklisted
        existing = db.query(BlacklistedToken).filter(
            BlacklistedToken.jti == jti
        ).first()
        
        if existing:
            logger.debug(f"Token {jti} already blacklisted")
            return
        
        blacklisted = BlacklistedToken(
            jti=jti,
            user_id=payload.get("sub"),
            expires_at=expires_at
        )
        db.add(blacklisted)
        db.commit()
    except jwt.JWTError as e:
        logger.debug(f"JWT decode error: {e}")
        db.rollback()  # Rollback on error
    except IntegrityError as e:
        # Handle duplicate key error gracefully
        logger.debug(f"Integrity error (likely duplicate): {e}")
        db.rollback()