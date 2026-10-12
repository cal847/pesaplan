from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from uuid import UUID
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional, List
import logging

from app.models.goals import Goal, GoalStatus
from app.models.transaction import TransactionType
from app.models.notification import Notification, NotificationPriority, NotificationType
from app.schemas.transaction import TransactionCreate
from app.schemas.goal import GoalCreate, GoalUpdate, GoalProgressResponse
from app.services.transaction_service import TransactionService
from app.services.notification_service import NotificationService
logger = logging.getLogger(__name__)

class GoalService:
    def __init__(self, db: Session):
        self.db = db
        self.transaction_service = TransactionService(db)
        self.notification_service = NotificationService(db)

    def _validate_unique_title(self, user_id: UUID, title: str, exclude_goal_id: Optional[UUID] = None) -> bool:
        """Check if a goal with this title already exists for the user."""
        query = self.db.query(Goal).filter(
            and_(
                Goal.user_id == user_id,
                Goal.title == title,
                Goal.is_deleted == False
            )
        )
        if exclude_goal_id:
            query = query.filter(Goal.goal_id != exclude_goal_id)
        
        return query.first() is None
    
    def _check_goal_status(self, goal: Goal) -> Goal:
        """Automatically update goal status if target is reached."""
        if goal.current_amount >= goal.target_amount and goal.status == GoalStatus.ACTIVE:
            goal.status = GoalStatus.COMPLETED
            goal.completed_date = datetime.now(timezone.utc)

            self.db.commit()

            self.notification_service.create_notification(
                user_id=goal.user_id,
                title="Goal Achieved!!",
                message=f"Congratulations! You have successfully reached your savings goal: '{goal.title}'.",
                notification_type=NotificationType.GOAL_UPDATE,
                priority=NotificationPriority.URGENT,
                data={"goal_id": str(goal.goal_id)}
            )
            self.db.refresh(goal)

        return goal        
    
    # In GoalService or a daily checker
    def check_goal_deadlines(self, user_id: UUID):
        now = datetime.now(timezone.utc)
        warning_date = now + timedelta(days=7)
        
        at_risk_goals = self.db.query(Goal).filter(
            and_(
                Goal.user_id == user_id,
                Goal.status == GoalStatus.ACTIVE,
                Goal.target_date <= warning_date,
                Goal.target_date >= now,
                Goal.current_amount < Goal.target_amount # Behind schedule
            )
        ).all()
        
        for goal in at_risk_goals:
            days_left = (goal.target_date - now).days
            self.notification_service.create_notification(
                user_id=user_id,
                title="Goal Deadline Approaching",
                message=f"Your goal '{goal.title}' is due in {days_left} days and is only {goal.progress:.0f}% funded.",
                notification_type=NotificationType.GOAL_UPDATE,
                priority=NotificationPriority.NORMAL,
                data={"goal_id": str(goal.goal_id)}
            )
        
    def create_goal(self, data: GoalCreate, user_id: UUID) -> Goal:
        """Create a new savings goal."""
        if not self._validate_unique_title(user_id, data.title):
            raise ValueError(f"A goal with title '{data.title}' already exists")
        
        goal = Goal(
            user_id=user_id,
            title=data.title,
            description=data.description,
            target_amount=data.target_amount,
            current_amount=Decimal('0'),
            target_date=data.target_date,
            status=GoalStatus.ACTIVE
        )
        
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        
        logger.info(f"Goal created: {goal.goal_id} for user {user_id}")
        return goal
    
    def get_goal(self, goal_id: UUID, user_id: UUID) -> Optional[Goal]:
        """Get a single goal by ID."""
        return self.db.query(Goal).filter(
            and_(
                Goal.goal_id == goal_id,
                Goal.user_id == user_id,
                Goal.is_deleted == False
            )
        ).first()
    
    def get_goals(self, user_id: UUID) -> Optional[Goal]:
        """Get all goals for a user."""
        return self.db.query(Goal).filter(
            and_(
                Goal.user_id == user_id,
                Goal.is_deleted == False,
                Goal.status == GoalStatus.ACTIVE,
            )
        ).all()
    
    def update_goal(self, goal_id: UUID, user_id: UUID, data: GoalUpdate) -> Optional[Goal]:
        """Update an existing goal."""
        goal = self.get_goal(goal_id, user_id)
        if not goal:
            return None
        
        if data.title and data.title != goal.title:
            if not self._validate_unique_title(user_id, data.title, exclude_goal_id=goal_id):
                raise ValueError(f"A goal with title '{data.title}' already exists")
            goal.title = data.title
        
        if data.description is not None:
            goal.description = data.description
        if data.target_amount is not None:
            goal.target_amount = data.target_amount
        if data.target_date is not None:
            goal.target_date = data.target_date
        if data.status is not None:
            goal.status = data.status
            if data.status == GoalStatus.COMPLETED and not goal.completed_date:
                goal.completed_date = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(goal)
        return goal
    
    
    def delete_goal(self, goal_id: UUID, user_id: UUID) -> bool:
        """Soft delete a goal."""
        goal = self.get_goal(goal_id, user_id)
        if not goal:
            return False
        
        goal.is_deleted = True
        self.db.commit()
        logger.info(f"Goal deleted: {goal_id}")
        return True
    
    def contribute_to_goal(self, goal_id: UUID, user_id: UUID, amount: Decimal) -> Goal:
        """Add funds to a goal and create a linked savings transaction."""
        goal = self.get_goal(goal_id, user_id)
        if not goal:
            raise ValueError("Goal not found")
        
        if goal.status != GoalStatus.ACTIVE:
            raise ValueError("Cannot contribute to a non-active goal")
        
        # Update goal amount
        goal.current_amount += amount
        
        # Create a linked savings transaction
        transaction_data = TransactionCreate(
            amount=amount,
            type=TransactionType.SAVINGS,
            transaction_date=datetime.now(timezone.utc),
            merchant_name=f"Goal: {goal.title}"
        )
        self.transaction_service.create_manual(transaction_data, user_id)
        
        # Check if goal is now complete
        goal = self._check_goal_status(goal)
        
        logger.info(f"Contributed {amount} to goal {goal_id}")
        return goal
    
    def get_goal_progress(self, goal_id: UUID, user_id: UUID) -> Optional[GoalProgressResponse]:
        """Get progress details for a specific goal."""
        goal = self.get_goal(goal_id, user_id)
        if not goal:
            return None
        
        return GoalProgressResponse(
            goal_id=goal.goal_id,
            title=goal.title,
            target_amount=goal.target_amount,
            current_amount=goal.current_amount,
            remaining_amount=goal.remaining_amount,
            progress_percentage=goal.progress,
            target_date=goal.target_date,
            status=goal.status
        )
    
    def get_all_goals_progress(self, user_id: UUID) -> List[GoalProgressResponse]:
        """Get progress for all active goals."""
        goals = self.get_goals(user_id)
        return [
            GoalProgressResponse(
                goal_id=g.goal_id,
                title=g.title,
                target_amount=g.target_amount,
                current_amount=g.current_amount,
                remaining_amount=g.remaining_amount,
                progress_percentage=g.progress,
                target_date=g.target_date,
                status=g.status
            )
            for g in goals
        ]

    def get_achievement_rate(self, user_id: UUID) -> float:
        """Calculate the percentage of goals completed vs total goals."""
        total_goals = self.db.query(Goal).filter(
            and_(Goal.user_id == user_id, Goal.is_deleted == False)
        ).count()
        
        if total_goals == 0:
            return 0.0
        
        completed_goals = self.db.query(Goal).filter(
            and_(
                Goal.user_id == user_id,
                Goal.status == GoalStatus.COMPLETED,
                Goal.is_deleted == False
            )
        ).count()
        
        return (completed_goals / total_goals) * 100

    def get_goal_stats(self, user_id: UUID) -> dict:
        """Get comprehensive goal statistics."""
        query = self.db.query(Goal).filter(
            and_(Goal.user_id == user_id, Goal.is_deleted == False)
        )
        
        total = query.count()
        active = query.filter(Goal.status == GoalStatus.ACTIVE).count()
        completed = query.filter(Goal.status == GoalStatus.COMPLETED).count()
        cancelled = query.filter(Goal.status == GoalStatus.CANCELLED).count()
        
        return {
            "total_goals": total,
            "active_goals": active,
            "completed_goals": completed,
            "cancelled_goals": cancelled,
            "achievement_rate": self.get_achievement_rate(user_id)
        }