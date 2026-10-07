from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional, List
import logging

from app.models.notification import Notification, NotificationType, NotificationPriority
from app.schemas.notification import NotificationResponse, UnreadCountResponse

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create_notification(
        self,
        user_id: UUID,
        title: str,
        message: str,
        notification_type: NotificationType,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        data: Optional[dict] = None
    ) -> Notification:
        """Creates a new notification for a user."""
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            priority=priority,
            title=title,
            message=message,
            data=data
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        
        logger.info(f"Notification created: {notification_type.value} for user {user_id}")
        return notification

    def get_notifications(
        self, 
        user_id: UUID, 
        skip: int = 0, 
        limit: int = 20,
        filter_type: Optional[NotificationType] = None,
        unread_only: bool = False
    ) -> List[Notification]:
        """Fetches notifications, filtering out expired ones."""
        now = datetime.now(timezone.utc)
        
        query = self.db.query(Notification).filter(
            (
                Notification.user_id == user_id
            )
        )
        
        if filter_type:
            query = query.filter(Notification.type == filter_type)
        if unread_only:
            query = query.filter(Notification.is_read == False)
            
        return query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

    def mark_as_read(self, user_id: UUID, notification_id: UUID) -> bool:
        """Marks a specific notification as read."""
        notification = self.db.query(Notification).filter(
            and_(Notification.user_id == user_id, Notification.notification_id == notification_id)
        ).first()
        
        if notification:
            notification.mark_as_read()
            self.db.commit()
            return True
        return False

    def mark_all_as_read(self, user_id: UUID) -> int:
        """Marks all unread notifications for a user as read."""
        count = (
            self.db.query(Notification)
            .filter(and_(Notification.user_id == user_id, Notification.is_read == False))
            .update({"is_read": True, "read_at": datetime.now(timezone.utc)})
        )
        self.db.commit()
        return count

    def get_unread_count(self, user_id: UUID) -> int:
        """Gets the total count of unread, non-expired notifications."""
        now = datetime.now(timezone.utc)
        return (
            self.db.query(func.count(Notification.notification_id))
            .filter(
                and_(
                    Notification.user_id == user_id,
                    Notification.is_read == False,
                    and_(
                        Notification.expires_at.is_(None),
                        Notification.expires_at > now
                    )
                )
            )
            .scalar() or 0
        )

    def delete_notification(self, user_id: UUID, notification_id: UUID) -> bool:
        """Soft or hard deletes a notification."""
        notification = self.db.query(Notification).filter(
            and_(Notification.user_id == user_id, Notification.notification_id == notification_id)
        ).first()
        if notification:
            self.db.delete(notification)
            self.db.commit()
            return True
        return False