from sqlalchemy import Column, String, DateTime, UUID, Boolean, ForeignKey
from app.database import Base
from datetime import datetime
import uuid

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    jti = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True))
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now)