from sqlalchemy.orm import Session
from models.blacklist import BlackListedToken
from jose import jwt
from datetime import datetime, timezone
from app.config import settings

def blacklist_token(db: Session, token: str) -> None:
    """
    Extract jti and expiration from a token and add it to the blacklist
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
            options={"verify_exp": False}
        )
        jti = payload.get("jti")
        exp = payload.get("exp")
        
        # Ignore invalid tokens
        if not jti or not exp:
            return
        
        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
        blacklisted = BlacklistedToken(
            jti=jti,
            user_id=payload.get("sub"),
            expires_at=expires_at
        )
        db.add(blacklisted)
        db.commit()
    except jwt.JWTError:
        pass