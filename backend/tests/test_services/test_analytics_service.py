import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta

from app.services.analytics_service import AnalyticsService
from app.models.transaction import Transaction, TransactionType
from app.models.goals import Goal, GoalStatus


class TestAnalyticsService:
    @pytest.fixture(autouse=True)
    def setup(self, db_session, test_user, test_category, test_merchant):
        """Set up service and common fixtures for every test."""
        self.service = AnalyticsService(db_session)
        self.db = db_session
        self.user_id = test_user.user_id
        self.category_id = test_category.category_id
        self.merchant_id = test_merchant.merchant_id

    # ─── get_spending_by_category ─────────────────────────────────────────────

    def test_get_spending_by_category_normal(self):
        """Test normal calculation of totals and percentages."""
        self.db.add(Transaction(
            user_id=self.user_id, category_id=self.category_id,
            amount=Decimal('300.00'), type=TransactionType.EXPENSE,
            transaction_date=datetime.now(timezone.utc)
        ))
        self.db.add(Transaction(
            user_id=self.user_id, category_id=self.category_id,
            amount=Decimal('700.00'), type=TransactionType.EXPENSE,
            transaction_date=datetime.now(timezone.utc)
        ))
        self.db.commit()

        result = self.service.get_spending_by_category(self.user_id, "monthly")
        
        assert result.total_spent == Decimal('1000.00')
        assert len(result.categories) == 1
        assert result.categories[0].total_spent == Decimal('1000.00')
        assert result.categories[0].percentage == 100.0

    def test_get_spending_by_category_empty(self):
        """Test edge case: no expenses in period (prevents division by zero)."""
        result = self.service.get_spending_by_category(self.user_id, "monthly")
        
        assert result.total_spent == Decimal('0')
        assert len(result.categories) == 0

    def test_get_spending_by_category_caching(self):
        """Test that repeated calls use the cache and don't query the DB again."""
        self.db.add(Transaction(
            user_id=self.user_id, category_id=self.category_id,
            amount=Decimal('100.00'), type=TransactionType.EXPENSE,
            transaction_date=datetime.now(timezone.utc)
        ))
        self.db.commit()

        # First call populates cache
        result1 = self.service.get_spending_by_category(self.user_id, "monthly")
        cache_key = f"spending_cat:{self.user_id}:monthly"
        
        # Verify cache is populated
        assert cache_key in self.service._cache
        assert self.service._cache[cache_key].total_spent == Decimal('100.00')
        
        # Second call should return the exact same cached object
        result2 = self.service.get_spending_by_category(self.user_id, "monthly")
        assert result1 is result2

    def test_cache_expiration(self):
        """Test that expired cache entries are cleaned up and re-queried."""
        cache_key = f"spending_cat:{self.user_id}:monthly"
        
        # Manually inject an expired cache entry
        self.service._cache[cache_key] = "dummy_data"
        self.service._cache_ttl[cache_key] = datetime.now(timezone.utc) - timedelta(minutes=11)
        
        # _get_cached should return None and clean up the expired key
        result = self.service._get_cached(cache_key)
        assert result is None
        assert cache_key not in self.service._cache

    # ─── get_spending_by_merchant ─────────────────────────────────────────────

    def test_get_spending_by_merchant_normal(self):
        """Test merchant grouping with transaction counts."""
        self.db.add(Transaction(
            user_id=self.user_id, merchant_id=self.merchant_id,
            amount=Decimal('50.00'), type=TransactionType.EXPENSE,
            transaction_date=datetime.now(timezone.utc)
        ))
        self.db.add(Transaction(
            user_id=self.user_id, merchant_id=self.merchant_id,
            amount=Decimal('50.00'), type=TransactionType.EXPENSE,
            transaction_date=datetime.now(timezone.utc)
        ))
        self.db.commit()

        result = self.service.get_spending_by_merchant(self.user_id, "monthly")
        
        assert result.total_spent == Decimal('100.00')
        assert len(result.merchants) == 1
        assert result.merchants[0].transaction_count == 2
        assert result.merchants[0].percentage == 100.0

    # ─── get_savings_rate ─────────────────────────────────────────────────────

    def test_get_savings_rate_normal(self):
        """Test normal savings rate calculation."""
        self.db.add(Transaction(
            user_id=self.user_id, amount=Decimal('1000.00'),
            type=TransactionType.INCOME, transaction_date=datetime.now(timezone.utc)
        ))
        self.db.add(Transaction(
            user_id=self.user_id, amount=Decimal('250.00'),
            type=TransactionType.SAVINGS, transaction_date=datetime.now(timezone.utc)
        ))
        self.db.commit()

        result = self.service.get_savings_rate(self.user_id, "monthly")
        
        assert result.total_income == Decimal('1000.00')
        assert result.total_savings == Decimal('250.00')
        assert result.savings_rate == 25.0

    def test_get_savings_rate_zero_income_no_division_by_zero(self):
        """CRITICAL EDGE CASE: User has savings but no income."""
        self.db.add(Transaction(
            user_id=self.user_id, amount=Decimal('100.00'),
            type=TransactionType.SAVINGS, transaction_date=datetime.now(timezone.utc)
        ))
        self.db.commit()

        result = self.service.get_savings_rate(self.user_id, "monthly")
        
        assert result.total_income == Decimal('0')
        assert result.total_savings == Decimal('100.00')
        assert result.savings_rate == 0.0  # Must not raise ZeroDivisionError

    def test_get_savings_rate_no_savings(self):
        """Edge case: User has income but no savings."""
        self.db.add(Transaction(
            user_id=self.user_id, amount=Decimal('500.00'),
            type=TransactionType.INCOME, transaction_date=datetime.now(timezone.utc)
        ))
        self.db.commit()

        result = self.service.get_savings_rate(self.user_id, "monthly")
        
        assert result.total_income == Decimal('500.00')
        assert result.total_savings == Decimal('0')
        assert result.savings_rate == 0.0

    # ─── get_goals_achieved ───────────────────────────────────────────────────

    def test_get_goals_achieved_normal(self):
        """Test goal aggregation with mixed statuses."""
        now = datetime.now(timezone.utc)
        
        # 1 Active goal
        self.db.add(Goal(
            user_id=self.user_id, title="Active Goal", target_amount=Decimal('100'),
            status=GoalStatus.ACTIVE, is_deleted=False
        ))
        # 1 Completed in current period
        self.db.add(Goal(
            user_id=self.user_id, title="Completed Now", target_amount=Decimal('500'),
            status=GoalStatus.COMPLETED, completed_date=now, is_deleted=False
        ))
        # 1 Completed outside current period (e.g., 2 months ago)
        self.db.add(Goal(
            user_id=self.user_id, title="Completed Old", target_amount=Decimal('200'),
            status=GoalStatus.COMPLETED, completed_date=now - timedelta(days=60), is_deleted=False
        ))
        self.db.commit()

        result = self.service.get_goals_achieved(self.user_id, "monthly")
        
        assert result.total_goals == 3
        assert result.completed_goals == 1  # Only the one completed 'now'
        assert result.total_amount_achieved == Decimal('500.00')
        assert result.completion_rate == pytest.approx(33.333333, rel=1e-2)

    def test_get_goals_achieved_zero_total_goals_no_division_by_zero(self):
        """CRITICAL EDGE CASE: User has no goals at all."""
        result = self.service.get_goals_achieved(self.user_id, "monthly")
        
        assert result.total_goals == 0
        assert result.completed_goals == 0
        assert result.completion_rate == 0.0  # Must not raise ZeroDivisionError

    def test_get_goals_achieved_excludes_deleted(self):
        """Ensure soft-deleted goals are not counted."""
        self.db.add(Goal(
            user_id=self.user_id, title="Deleted Goal", target_amount=Decimal('100'),
            status=GoalStatus.COMPLETED, completed_date=datetime.now(timezone.utc), is_deleted=True
        ))
        self.db.commit()

        result = self.service.get_goals_achieved(self.user_id, "monthly")
        
        assert result.total_goals == 0
        assert result.completed_goals == 0

    # ─── get_income_expense_trend ─────────────────────────────────────────────

    def test_get_income_expense_trend_daily(self):
        """Test daily trend aggregation (uses func.date, which is SQLite compatible)."""
        today = datetime.now(timezone.utc).replace(hour=12, minute=0, second=0, microsecond=0)
        
        self.db.add(Transaction(
            user_id=self.user_id, amount=Decimal('1000.00'),
            type=TransactionType.INCOME, transaction_date=today
        ))
        self.db.add(Transaction(
            user_id=self.user_id, amount=Decimal('300.00'),
            type=TransactionType.EXPENSE, transaction_date=today
        ))
        self.db.commit()

        result = self.service.get_income_expense_trend(self.user_id, "daily")
        
        assert result.total_income == Decimal('1000.00')
        assert result.total_expenses == Decimal('300.00')
        assert result.net_change == Decimal('700.00')
        assert len(result.data_points) == 1
        assert result.data_points[0].income == Decimal('1000.00')
        assert result.data_points[0].expenses == Decimal('300.00')

    def test_get_income_expense_trend_empty(self):
        """Edge case: No transactions in period."""
        result = self.service.get_income_expense_trend(self.user_id, "daily")
        
        assert result.total_income == Decimal('0')
        assert result.total_expenses == Decimal('0')
        assert result.net_change == Decimal('0')
        assert len(result.data_points) == 0