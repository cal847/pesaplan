from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime

from app.models.notification import NotificationType

class NotificationResponse(BaseModel):
    notification_id: UUID
    title: str
    message: str
    notification_type: NotificationType
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UnreadCountResponse(BaseModel):
    unread_count: int
