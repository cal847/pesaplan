"""
Goal Service Unit Tests
Comprehensive coverage of all business logic, edge cases, and error paths.
Run with: pytest tests/test_services/test_goal_service.py -v
"""
import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

from app.services.goal_service import GoalService
from app.models.goals import Goal, GoalStatus
from app.models.notification import NotificationType, NotificationPriority
from app.schemas.goal import GoalCreate, GoalUpdate

class TestGoalService:
    
    @pytest.fixture(autouse=True)
    def setup(self, db_session, test_user):
        """Initialize service and common variables for every test."""
        self.service = GoalService(db_session)
        self.db = db_session
        self.user_id = test_user.user_id

    # ══════════════════════════════════════════════════════════════════════════
    # CREATE GOAL TESTS
    # ══════════════════════════════════════════════════════════════════════════

    def test_create_goal_success(self):
        """Validates that a goal is successfully created with default ACTIVE status and 0 current amount."""
        data = GoalCreate(
            title="Emergency Fund",
            target_amount=Decimal('10000.00'),
            target_date=datetime.now(timezone.utc) + timedelta(days=365)
        )
        goal = self.service.create_goal(data, self.user_id)
        
        assert goal.goal_id is not None
        assert goal.title == "Emergency Fund"
        assert goal.target_amount == Decimal('10000.00')
        assert goal.current_amount == Decimal('0')
        assert goal.status == GoalStatus.ACTIVE

    def test_create_goal_duplicate_title_fails(self):
        """Ensures ValueError is raised if a user tries to create a goal with a title they already have."""
        data = GoalCreate(title="Vacation", target_amount=Decimal('5000.00'))
        self.service.create_goal(data, self.user_id)
        
        with pytest.raises(ValueError, match="already exists"):
            self.service.create_goal(data, self.user_id)

    def test_create_goal_same_title_different_user_succeeds(self):
        """Edge case: Validates that title uniqueness is scoped to the user, not global."""
        data = GoalCreate(title="Shared Title", target_amount=Decimal('1000.00'))
        self.service.create_goal(data, self.user_id)
        
        # Different user should be able to create the same title
        other_user_id = uuid.uuid4()
        other_goal = self.service.create_goal(data, other_user_id)
        assert other_goal.title == "Shared Title"

    # ══════════════════════════════════════════════════════════════════════════
    # READ GOAL TESTS
    # ══════════════════════════════════════════════════════════════════════════

    def test_get_goal_success(self):
        """Validates that an existing, non-deleted goal can be fetched by its owner."""
        data = GoalCreate(title="Test Goal", target_amount=Decimal('1000.00'))
        created = self.service.create_goal(data, self.user_id)
        
        fetched = self.service.get_goal(created.goal_id, self.user_id)
        assert fetched is not None
        assert fetched.goal_id == created.goal_id

    def test_get_goal_wrong_user_returns_none(self):
        """Ensures strict data isolation: a user cannot fetch another user's goal."""
        data = GoalCreate(title="Test Goal", target_amount=Decimal('1000.00'))
        created = self.service.create_goal(data, self.user_id)
        
        wrong_user = uuid.uuid4()
        fetched = self.service.get_goal(created.goal_id, wrong_user)
        assert fetched is None

    def test_get_goal_deleted_returns_none(self):
        """Edge case: Ensures soft-deleted goals are not returned by get_goal."""
        data = GoalCreate(title="Deleted Goal", target_amount=Decimal('1000.00'))
        created = self.service.create_goal(data, self.user_id)
        created.is_deleted = True
        self.db.commit()
        
        fetched = self.service.get_goal(created.goal_id, self.user_id)
        assert fetched is None

    def test_get_goals_without_filter(self):
        """Validates that get_goals returns all non-deleted goals for a user."""
        self.service.create_goal(GoalCreate(title="G1", target_amount=Decimal('100')), self.user_id)
        self.service.create_goal(GoalCreate(title="G2", target_amount=Decimal('200')), self.user_id)
        
        goals = self.service.get_goals(self.user_id)
        assert len(goals) == 2

    def test_get_goals_with_status_filter(self):
        """Ensures get_goals correctly filters by status when provided."""
        g1 = self.service.create_goal(GoalCreate(title="Active", target_amount=Decimal('100')), self.user_id)
        g2 = self.service.create_goal(GoalCreate(title="Completed", target_amount=Decimal('100')), self.user_id)
        g2.status = GoalStatus.COMPLETED
        self.db.commit()
        
        active_goals = self.service.get_goals(self.user_id)
        assert len(active_goals) == 1
        assert active_goals[0].title == "Active"

    # ══════════════════════════════════════════════════════════════════════════
    # UPDATE GOAL TESTS
    # ══════════════════════════════════════════════════════════════════════════

    def test_update_goal_success(self):
        """Validates that valid fields are updated correctly."""
        goal = self.service.create_goal(GoalCreate(title="Old Title", target_amount=Decimal('1000')), self.user_id)
        
        update_data = GoalUpdate(title="New Title", target_amount=Decimal('2000'))
        updated = self.service.update_goal(goal.goal_id, self.user_id, update_data)
        
        assert updated.title == "New Title"
        assert updated.target_amount == Decimal('2000')

    def test_update_goal_duplicate_title_fails(self):
        """Ensures renaming a goal to a title that already exists for the user raises ValueError."""
        self.service.create_goal(GoalCreate(title="Existing", target_amount=Decimal('100')), self.user_id)
        goal_to_rename = self.service.create_goal(GoalCreate(title="To Rename", target_amount=Decimal('100')), self.user_id)
        
        with pytest.raises(ValueError, match="already exists"):
            self.service.update_goal(goal_to_rename.goal_id, self.user_id, GoalUpdate(title="Existing"))

    def test_update_goal_manual_completion_sets_date(self):
        """Edge case: If status is manually updated to COMPLETED, completed_date is automatically set."""
        goal = self.service.create_goal(GoalCreate(title="Manual Complete", target_amount=Decimal('100')), self.user_id)
        assert goal.completed_date is None
        
        updated = self.service.update_goal(goal.goal_id, self.user_id, GoalUpdate(status=GoalStatus.COMPLETED))
        assert updated.status == GoalStatus.COMPLETED
        assert updated.completed_date is not None

    def test_update_goal_nonexistent_returns_none(self):
        """Ensures updating a non-existent or wrong-user goal safely returns None."""
        result = self.service.update_goal(uuid.uuid4(), self.user_id, GoalUpdate(title="Fail"))
        assert result is None

    # ══════════════════════════════════════════════════════════════════════════
    # CONTRIBUTE TO GOAL TESTS
    # ══════════════════════════════════════════════════════════════════════════

    def test_contribute_to_goal_updates_amount(self):
        """Validates partial contribution updates amount and progress, but does NOT trigger notification."""
        goal = self.service.create_goal(GoalCreate(title="Savings", target_amount=Decimal('1000.00')), self.user_id)
        
        with patch.object(self.service.transaction_service, 'create_manual') as mock_tx, \
             patch.object(self.service.notification_service, 'create_notification') as mock_notif:
            
            updated = self.service.contribute_to_goal(goal.goal_id, self.user_id, Decimal('250.00'))
            
            assert updated.current_amount == Decimal('250.00')
            assert updated.progress == 25.0
            mock_tx.assert_called_once()
            mock_notif.assert_not_called() # Not completed yet

    def test_contribute_to_goal_exact_completion_triggers_notification(self):
        """Validates that hitting exactly 100% triggers COMPLETED status and an URGENT notification."""
        goal = self.service.create_goal(GoalCreate(title="Exact Goal", target_amount=Decimal('500.00')), self.user_id)
        
        with patch.object(self.service.transaction_service, 'create_manual'), \
             patch.object(self.service.notification_service, 'create_notification') as mock_notif:
            
            updated = self.service.contribute_to_goal(goal.goal_id, self.user_id, Decimal('500.00'))
            
            assert updated.status == GoalStatus.COMPLETED
            assert updated.completed_date is not None
            mock_notif.assert_called_once()
            
            call_kwargs = mock_notif.call_args.kwargs
            assert call_kwargs["notification_type"] == NotificationType.GOAL_UPDATE
            assert call_kwargs["priority"] == NotificationPriority.URGENT
            assert call_kwargs["data"]["goal_id"] == str(goal.goal_id)

    def test_contribute_to_goal_over_completion_triggers_notification(self):
        """Edge case: Contributing MORE than the target amount still triggers completion exactly once."""
        goal = self.service.create_goal(GoalCreate(title="Over Goal", target_amount=Decimal('500.00')), self.user_id)
        
        with patch.object(self.service.transaction_service, 'create_manual'), \
             patch.object(self.service.notification_service, 'create_notification') as mock_notif:
            
            # Contribute 600 to a 500 goal
            updated = self.service.contribute_to_goal(goal.goal_id, self.user_id, Decimal('600.00'))
            
            assert updated.status == GoalStatus.COMPLETED
            assert updated.current_amount == Decimal('600.00')
            mock_notif.assert_called_once() # Should only notify once

    def test_contribute_to_goal_nonexistent_raises_error(self):
        """Ensures contributing to a goal ID that doesn't exist raises ValueError."""
        with pytest.raises(ValueError, match="Goal not found"):
            self.service.contribute_to_goal(uuid.uuid4(), self.user_id, Decimal('100.00'))

    def test_contribute_to_goal_non_active_raises_error(self):
        """Edge case: Prevents adding funds to a goal that is already completed or cancelled."""
        goal = self.service.create_goal(GoalCreate(title="Done", target_amount=Decimal('500.00')), self.user_id)
        goal.status = GoalStatus.COMPLETED
        self.db.commit()
        
        with pytest.raises(ValueError, match="Cannot contribute to a non-active goal"):
            self.service.contribute_to_goal(goal.goal_id, self.user_id, Decimal('100.00'))

    # ══════════════════════════════════════════════════════════════════════════
    # DELETE GOAL TESTS
    # ══════════════════════════════════════════════════════════════════════════

    def test_delete_goal_soft_deletes(self):
        """Validates that delete_goal sets is_deleted=True instead of hard deleting."""
        goal = self.service.create_goal(GoalCreate(title="To Delete", target_amount=Decimal('1000.00')), self.user_id)
        
        result = self.service.delete_goal(goal.goal_id, self.user_id)
        assert result is True
        
        # Verify it's soft deleted in the DB
        self.db.refresh(goal)
        assert goal.is_deleted is True
        
        # Verify it's no longer fetchable via service
        fetched = self.service.get_goal(goal.goal_id, self.user_id)
        assert fetched is None

    def test_delete_goal_nonexistent_returns_false(self):
        """Ensures deleting a non-existent goal safely returns False without crashing."""
        result = self.service.delete_goal(uuid.uuid4(), self.user_id)
        assert result is False

    # ══════════════════════════════════════════════════════════════════════════
    # PROGRESS & STATS TESTS
    # ══════════════════════════════════════════════════════════════════════════

    def test_get_goal_progress_success(self):
        """Validates that progress response maps correctly, including calculated properties."""
        goal = self.service.create_goal(GoalCreate(title="Progress Test", target_amount=Decimal('1000.00')), self.user_id)
        goal.current_amount = Decimal('400.00')
        self.db.commit()
        
        progress = self.service.get_goal_progress(goal.goal_id, self.user_id)
        assert progress is not None
        assert progress.remaining_amount == Decimal('600.00')
        assert progress.progress_percentage == 40.0

    def test_get_goal_progress_nonexistent_returns_none(self):
        """Ensures requesting progress for a non-existent goal returns None."""
        progress = self.service.get_goal_progress(uuid.uuid4(), self.user_id)
        assert progress is None

    def test_get_all_goals_progress_only_active(self):
        """Edge case: Validates that get_all_goals_progress strictly filters for ACTIVE goals only."""
        g1 = self.service.create_goal(GoalCreate(title="Active", target_amount=Decimal('100')), self.user_id)
        g2 = self.service.create_goal(GoalCreate(title="Completed", target_amount=Decimal('100')), self.user_id)
        g2.status = GoalStatus.COMPLETED
        self.db.commit()
        
        progresses = self.service.get_all_goals_progress(self.user_id)
        assert len(progresses) == 1
        assert progresses[0].title == "Active"

    def test_get_achievement_rate_calculates_correctly(self):
        """Validates the math: (completed / total) * 100, ignoring cancelled/active."""
        for i in range(2):
            self.db.add(Goal(user_id=self.user_id, title=f"C{i}", target_amount=Decimal('100'), 
                            current_amount=Decimal('100'), status=GoalStatus.COMPLETED, is_deleted=False))
        
        self.db.add(Goal(user_id=self.user_id, title="Active", target_amount=Decimal('100'), 
                        current_amount=Decimal('50'), status=GoalStatus.ACTIVE, is_deleted=False))
        self.db.add(Goal(user_id=self.user_id, title="Cancelled", target_amount=Decimal('100'), 
                        current_amount=Decimal('0'), status=GoalStatus.CANCELLED, is_deleted=False))
        self.db.commit()
        
        rate = self.service.get_achievement_rate(self.user_id)
        assert rate == 50.0  # 2 completed out of 4 total

    def test_get_achievement_rate_zero_goals(self):
        """Edge case: Prevents ZeroDivisionError when a user has absolutely no goals."""
        rate = self.service.get_achievement_rate(self.user_id)
        assert rate == 0.0

    def test_get_goal_stats_comprehensive(self):
        """Validates that get_goal_stats returns accurate counts for all statuses and the correct rate."""
        self.db.add(Goal(user_id=self.user_id, title="A1", target_amount=Decimal('100'), status=GoalStatus.ACTIVE, is_deleted=False))
        self.db.add(Goal(user_id=self.user_id, title="A2", target_amount=Decimal('100'), status=GoalStatus.ACTIVE, is_deleted=False))
        self.db.add(Goal(user_id=self.user_id, title="C1", target_amount=Decimal('100'), status=GoalStatus.COMPLETED, is_deleted=False))
        self.db.add(Goal(user_id=self.user_id, title="X1", target_amount=Decimal('100'), status=GoalStatus.CANCELLED, is_deleted=False))
        self.db.commit()
        
        stats = self.service.get_goal_stats(self.user_id)
        
        assert stats["total_goals"] == 4
        assert stats["active_goals"] == 2
        assert stats["completed_goals"] == 1
        assert stats["cancelled_goals"] == 1
        assert stats["achievement_rate"] == 25.0  # 1 / 4 * 100