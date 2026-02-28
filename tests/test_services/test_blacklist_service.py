import pytest
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from jose import jwt
import uuid

from app.services.blacklist_service import blacklist_token
from app.models.blacklist import BlacklistedToken
from app.config import settings


class TestBlacklistService:
    """Test the token blacklisting service"""

    def test_blacklist_token_success(self, db_session: Session):
        """Test successfully blacklisting a valid token"""
        # Create a test token
        jti = str(uuid.uuid4())
        exp = datetime.now(timezone.utc) + timedelta(days=1)
        user_id = str(uuid.uuid4())
        
        token = jwt.encode(
            {
                "jti": jti,
                "exp": exp,
                "sub": user_id,
                "type": "refresh"
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        # Blacklist the token
        blacklist_token(db_session, token)
        
        # Verify it was added to the database
        blacklisted = db_session.query(BlacklistedToken).filter(
            BlacklistedToken.jti == jti
        ).first()
        
        assert blacklisted is not None
        assert blacklisted.jti == jti
        assert blacklisted.user_id == user_id
        assert blacklisted.expires_at.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc)
    
    def test_blacklist_token_no_jti(self, db_session: Session):
        """Test blacklisting a token without jti claim (should be ignored)"""
        # Create a token without jti
        exp = datetime.now(timezone.utc) + timedelta(days=1)
        
        token = jwt.encode(
            {
                "exp": exp,
                "sub": str(uuid.uuid4()),
                "type": "refresh"
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        # This should not raise an exception and should not add to DB
        blacklist_token(db_session, token)
        
        # Verify no tokens were added
        count = db_session.query(BlacklistedToken).count()
        assert count == 0
    
    def test_blacklist_token_no_exp(self, db_session: Session):
        """Test blacklisting a token without exp claim (should be ignored)"""
        # Create a token without exp
        jti = str(uuid.uuid4())
        
        token = jwt.encode(
            {
                "jti": jti,
                "sub": str(uuid.uuid4()),
                "type": "refresh"
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        blacklist_token(db_session, token)
        
        # Verify no tokens were added
        count = db_session.query(BlacklistedToken).count()
        assert count == 0
    
    def test_blacklist_token_invalid_token(self, db_session: Session):
        """Test blacklisting an invalid token (should not raise exception)"""
        # This should not raise an exception
        blacklist_token(db_session, "invalid.token.here")
        
        # Verify no tokens were added
        count = db_session.query(BlacklistedToken).count()
        assert count == 0
    
    def test_blacklist_token_expired_token(self, db_session: Session):
        """Test blacklisting an expired token"""
        jti = str(uuid.uuid4())
        exp = datetime.now(timezone.utc) - timedelta(days=1)  # Expired
        
        token = jwt.encode(
            {
                "jti": jti,
                "exp": exp,
                "sub": str(uuid.uuid4()),
                "type": "refresh"
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        blacklist_token(db_session, token)
        
        # Verify it was added even though expired
        blacklisted = db_session.query(BlacklistedToken).filter(
            BlacklistedToken.jti == jti
        ).first()
        
        assert blacklisted is not None
        assert blacklisted.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc)
    
    def test_blacklist_token_duplicate(self, db_session: Session):
        """Test blacklisting the same token twice"""
        jti = str(uuid.uuid4())
        exp = datetime.now(timezone.utc) + timedelta(days=1)
        user_id = str(uuid.uuid4())
        
        token = jwt.encode(
            {
                "jti": jti,
                "exp": exp,
                "sub": str(uuid.uuid4()),
                "type": "refresh"
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        # First blacklist - should succeed
        blacklist_token(db_session, token)
        
        # Verify first insert worked
        first = db_session.query(BlacklistedToken).filter(
            BlacklistedToken.jti == jti
        ).first()
        assert first is not None
        
        # Second blacklist - should fail silently since the function catches the exception
        blacklist_token(db_session, token)
        
        # Should only have one entry
        count = db_session.query(BlacklistedToken).filter(
            BlacklistedToken.jti == jti
        ).count()
        assert count == 1