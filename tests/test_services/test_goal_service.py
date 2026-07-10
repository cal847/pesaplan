import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta

from app.services.goal_service import GoalService
from app.models.goals import Goal, GoalStatus
from app.schemas.goal import GoalCreate, GoalUpdate

class TestGoalService:
    
    @pytest.fixture(autouse=True)
    def setup(self, db_session, test_user):
        self.service = GoalService(db_session)
        self.db = db_session
        self.user_id = test_user.user_id

    def test_create_goal_success(self):
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
        data = GoalCreate(title="Vacation", target_amount=Decimal('5000.00'))
        self.service.create_goal(data, self.user_id)
        
        with pytest.raises(ValueError, match="already exists"):
            self.service.create_goal(data, self.user_id)

    def test_get_goal_success(self):
        data = GoalCreate(title="Test Goal", target_amount=Decimal('1000.00'))
        created = self.service.create_goal(data, self.user_id)
        
        fetched = self.service.get_goal(created.goal_id, self.user_id)
        assert fetched is not None
        assert fetched.goal_id == created.goal_id

    def test_get_goal_wrong_user_returns_none(self):
        data = GoalCreate(title="Test Goal", target_amount=Decimal('1000.00'))
        created = self.service.create_goal(data, self.user_id)
        
        import uuid
        wrong_user = uuid.uuid4()
        fetched = self.service.get_goal(created.goal_id, wrong_user)
        assert fetched is None

    def test_contribute_to_goal_updates_amount(self):
        data = GoalCreate(title="Savings", target_amount=Decimal('1000.00'))
        goal = self.service.create_goal(data, self.user_id)
        
        updated_goal = self.service.contribute_to_goal(goal.goal_id, self.user_id, Decimal('250.00'))
        assert updated_goal.current_amount == Decimal('250.00')
        assert updated_goal.progress == 25.0

    def test_contribute_to_goal_completes_when_target_reached(self):
        data = GoalCreate(title="Small Goal", target_amount=Decimal('500.00'))
        goal = self.service.create_goal(data, self.user_id)
        
        updated_goal = self.service.contribute_to_goal(goal.goal_id, self.user_id, Decimal('500.00'))
        assert updated_goal.status == GoalStatus.COMPLETED
        assert updated_goal.completed_date is not None

    def test_delete_goal_soft_deletes(self):
        data = GoalCreate(title="To Delete", target_amount=Decimal('1000.00'))
        goal = self.service.create_goal(data, self.user_id)
        
        result = self.service.delete_goal(goal.goal_id, self.user_id)
        assert result is True
        
        # Should not be fetchable anymore
        fetched = self.service.get_goal(goal.goal_id, self.user_id)
        assert fetched is None

    def test_get_achievement_rate_calculates_correctly(self):
        # Create 4 goals: 2 completed, 1 active, 1 cancelled
        for i in range(2):
            g = Goal(user_id=self.user_id, title=f"Completed {i}", target_amount=Decimal('100'), 
                    current_amount=Decimal('100'), status=GoalStatus.COMPLETED)
            self.db.add(g)
        
        g_active = Goal(user_id=self.user_id, title="Active", target_amount=Decimal('100'), 
                       current_amount=Decimal('50'), status=GoalStatus.ACTIVE)
        self.db.add(g_active)
        
        g_cancelled = Goal(user_id=self.user_id, title="Cancelled", target_amount=Decimal('100'), 
                          current_amount=Decimal('0'), status=GoalStatus.CANCELLED)
        self.db.add(g_cancelled)
        self.db.commit()
        
        rate = self.service.get_achievement_rate(self.user_id)
        assert rate == 50.0  # 2 out of 4 = 50%