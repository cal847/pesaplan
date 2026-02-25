"""User Database Model"""
from sqlalchemy import Column, String, Boolean, DateTime, UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True) 
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    
    verification_token = Column(String(255))
    reset_password_token = Column(String(255))
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    verification_sent_at = Column(DateTime(timezone=True), nullable=True)
    
    is_verified = Column(Boolean, default=False)
    created_at = Column(Datetime(timezone=True), server_default=func.now())
    updated_at = Column(Datetime(timezone=True), server_default=func.now(), on_update=func.now())
    deleted_at = Column(Datetime(timezone=True), nullable=True)
    
    #OAuth
    oauth_provider = Column(String, nullable=True)
    oauth_id = Column(String, nullable=True)
    
    # Index for faster lookups
    __table_args__ = (
        Index('ix_users_oauth', 'oauth_provider', 'oauth_id')
    )
    @property
    def full_name(self) -> str:
        """Gets users full name"""
        return f"{self.first_name} {self.last_name}"
    
    def __repr__(self):
        return f"Name: {self.full_name} email:{self.email}"