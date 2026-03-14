"""
Budget Service Unit Tests
All tests use MagicMock — no DB or routes required.
Run with: pytest tests/test_budget_service.py -v
"""
import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch
from dateutil.relativedelta import relativedelta

from app.models.budget import Budget, BudgetPeriod, BillRecurrence, BillStatus
from app.models.user import User
from app.utils.budget_helpers import advance_bill_cycle
from app.services.budget_service import BudgetService
from app.schemas.budget import BudgetProgressResponse


# ─── Helpers ────────────────────────────────────────────────────────────────

def make_user(spending_limit=None, threshold=80):
    user = MagicMock(spec=User)
    user.user_id = uuid.uuid4()
    user.spending_limit = spending_limit
    user.threshold = threshold
    return user


def make_bill(recurrence, due_date=None, status=BillStatus.PENDING, name="Netflix"):
    budget = MagicMock(spec=Budget)
    budget.budget_id = uuid.uuid4()
    budget.category_id = uuid.uuid4()
    budget.is_bill = True
    budget.bill_name = name
    budget.recurrence = recurrence
    budget.due_date = due_date or datetime(2026, 3, 15, tzinfo=timezone.utc)
    budget.status = status
    budget.last_paid_at = None
    budget.days_remaining = None
    return budget


# ══════════════════════════════════════════════════════════════════════════════
# TestCalculateBudgetProgress
# ══════════════════════════════════════════════════════════════════════════════

class TestCalculateBudgetProgress:
    """
    Tests for BudgetService.calculate_budget_progress.
    Verifies global spending progress against user's spending limit.
    """

    def _run(self, spent, spending_limit, threshold=80):
        db = MagicMock()
        user = make_user(spending_limit=spending_limit, threshold=threshold)

        with patch("app.services.budget_service.get_user_by_id", return_value=user), \
             patch("app.services.budget_service.get_period_dates", return_value=(
                 datetime(2026, 3, 1, tzinfo=timezone.utc),
                 datetime(2026, 3, 31, tzinfo=timezone.utc),
             )), \
             patch.object(
                 BudgetService,
                 "_calculate_total_period_spending",
                 return_value=Decimal(str(spent))
             ):
            return BudgetService.calculate_budget_progress(db, user.user_id, BudgetPeriod.MONTHLY)

    def test_on_track(self):
        result = self._run(spent=2000, spending_limit=Decimal("10000.00"))
        assert result.status == "on_track"
        assert result.spent == Decimal("2000")
        assert result.remaining == Decimal("8000.00")
        assert result.percentage == 20.0

    def test_warning(self):
        result = self._run(spent=8500, spending_limit=Decimal("10000.00"), threshold=80)
        assert result.status == "warning"
        assert result.percentage == 85.0

    def test_exceeded(self):
        result = self._run(spent=12000, spending_limit=Decimal("10000.00"))
        assert result.status == "exceeded"
        assert result.remaining == Decimal("0.00")

    def test_no_spending_limit(self):
        """If user has no spending limit, percentage is 0.0 and status is on_track."""
        result = self._run(spent=5000, spending_limit=None)
        assert result.status == "on_track"
        assert result.percentage == 0.0
        assert result.spending_limit == Decimal("0.00")

    def test_zero_spent(self):
        result = self._run(spent=0, spending_limit=Decimal("10000.00"))
        assert result.status == "on_track"
        assert result.percentage == 0.0
        assert result.remaining == Decimal("10000.00")

    def test_exactly_at_threshold(self):
        """Spending at exactly the threshold percentage should trigger warning."""
        result = self._run(spent=8000, spending_limit=Decimal("10000.00"), threshold=80)
        assert result.status == "warning"

    def test_percentage_rounded_to_two_decimals(self):
        result = self._run(spent=3333, spending_limit=Decimal("10000.00"))
        assert result.percentage == round(3333 / 10000 * 100, 2)


# ══════════════════════════════════════════════════════════════════════════════
# TestAdvanceBillCycle
# ══════════════════════════════════════════════════════════════════════════════

class TestAdvanceBillCycle:
    """
    Tests for advance_bill_cycle helper.
    Verifies due_date advances correctly per recurrence type
    and status resets to PENDING.
    """

    def test_weekly(self):
        bill = make_bill(BillRecurrence.WEEKLY)
        original = bill.due_date
        advance_bill_cycle(bill)
        assert bill.due_date == original + timedelta(weeks=1)
        assert bill.status == BillStatus.PENDING

    def test_monthly(self):
        bill = make_bill(BillRecurrence.MONTHLY)
        original = bill.due_date
        advance_bill_cycle(bill)
        assert bill.due_date == original + relativedelta(months=1)
        assert bill.status == BillStatus.PENDING

    def test_quarterly(self):
        bill = make_bill(BillRecurrence.QUARTERLY)
        original = bill.due_date
        advance_bill_cycle(bill)
        assert bill.due_date == original + relativedelta(months=3)
        assert bill.status == BillStatus.PENDING

    def test_annual(self):
        bill = make_bill(BillRecurrence.ANNUAL)
        original = bill.due_date
        advance_bill_cycle(bill)
        assert bill.due_date == original + relativedelta(years=1)
        assert bill.status == BillStatus.PENDING

    def test_one_off_does_not_advance(self):
        """ONE_OFF bills should not have their due_date or status changed."""
        bill = make_bill(BillRecurrence.ONE_OFF)
        original_due = bill.due_date
        original_status = bill.status
        advance_bill_cycle(bill)
        assert bill.due_date == original_due
        assert bill.status == original_status

    def test_sets_last_paid_at(self):
        bill = make_bill(BillRecurrence.MONTHLY)
        assert bill.last_paid_at is None
        advance_bill_cycle(bill)
        assert bill.last_paid_at is not None

    def test_no_due_date_is_noop(self):
        """Bills without a due_date should not be mutated."""
        bill = make_bill(BillRecurrence.MONTHLY)
        bill.due_date = None
        advance_bill_cycle(bill)
        assert bill.due_date is None
        assert bill.last_paid_at is None


# ══════════════════════════════════════════════════════════════════════════════
# TestGetBudgetAlerts
# ══════════════════════════════════════════════════════════════════════════════

class TestGetBudgetAlerts:
    """
    Tests for BudgetService.get_budget_alerts.
    Verifies threshold alerts are generated from global progress,
    and bill alerts are generated from individual bill state.
    """

    def _mock_progress(self, status, percentage=50.0):
        p = MagicMock(spec=BudgetProgressResponse)
        p.status = status
        p.percentage = percentage
        return p

    def _setup_db(self, bills=None):
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = bills or []
        return db

    def test_warning_alert(self):
        db = self._setup_db()
        with patch.object(BudgetService, "calculate_budget_progress", return_value=self._mock_progress("warning", 85.0)):
            alerts = BudgetService.get_budget_alerts(db, uuid.uuid4(), BudgetPeriod.MONTHLY)

        assert len(alerts) == 1
        assert alerts[0].alert_type == "threshold_exceeded"
        assert "85.0%" in alerts[0].message

    def test_exceeded_alert(self):
        db = self._setup_db()
        with patch.object(BudgetService, "calculate_budget_progress", return_value=self._mock_progress("exceeded")):
            alerts = BudgetService.get_budget_alerts(db, uuid.uuid4(), BudgetPeriod.MONTHLY)

        assert len(alerts) == 1
        assert alerts[0].alert_type == "threshold_exceeded"
        assert "exceeded" in alerts[0].message.lower()

    def test_on_track_no_threshold_alert(self):
        db = self._setup_db()
        with patch.object(BudgetService, "calculate_budget_progress", return_value=self._mock_progress("on_track")):
            alerts = BudgetService.get_budget_alerts(db, uuid.uuid4(), BudgetPeriod.MONTHLY)

        assert not any(a.alert_type == "threshold_exceeded" for a in alerts)

    def test_bill_overdue_alert(self):
        bill = make_bill(BillRecurrence.MONTHLY)
        bill.days_remaining = -3
        db = self._setup_db(bills=[bill])

        with patch.object(BudgetService, "calculate_budget_progress", return_value=self._mock_progress("on_track")):
            alerts = BudgetService.get_budget_alerts(db, uuid.uuid4(), BudgetPeriod.MONTHLY)

        assert any(a.alert_type == "bill_overdue" for a in alerts)
        assert any("3 day(s)" in a.message for a in alerts)

    def test_bill_due_soon_alert(self):
        bill = make_bill(BillRecurrence.MONTHLY)
        bill.days_remaining = 3
        db = self._setup_db(bills=[bill])

        with patch.object(BudgetService, "calculate_budget_progress", return_value=self._mock_progress("on_track")):
            alerts = BudgetService.get_budget_alerts(db, uuid.uuid4(), BudgetPeriod.MONTHLY)

        assert any(a.alert_type == "bill_due" for a in alerts)
        assert any("3 day(s)" in a.message for a in alerts)

    def test_bill_due_exactly_today(self):
        bill = make_bill(BillRecurrence.MONTHLY)
        bill.days_remaining = 0
        db = self._setup_db(bills=[bill])

        with patch.object(BudgetService, "calculate_budget_progress", return_value=self._mock_progress("on_track")):
            alerts = BudgetService.get_budget_alerts(db, uuid.uuid4(), BudgetPeriod.MONTHLY)

        assert any(a.alert_type == "bill_due" for a in alerts)

    def test_paid_bill_no_alert(self):
        """Test that paid bills don't generate alerts even if overdue."""
        # Create a paid bill that would otherwise trigger an alert
        bill = Budget(
            budget_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            category_id=uuid.uuid4(),
            amount=Decimal("100.00"),
            period=BudgetPeriod.MONTHLY,
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=30),
            is_bill=True,
            bill_name="Test Bill",
            due_date=datetime.now(timezone.utc) - timedelta(days=1),  # Overdue
            recurrence=BillRecurrence.MONTHLY,
            bill_status=BillStatus.PAID,  # But paid
        )
        
        db = self._setup_db(bills=[bill])

        with patch.object(BudgetService, "calculate_budget_progress", return_value=self._mock_progress("on_track")):
            alerts = BudgetService.get_budget_alerts(db, uuid.uuid4(), BudgetPeriod.MONTHLY)

        # Assert that no bill alerts are generated
        assert not any(a.alert_type in ("bill_overdue", "bill_due") for a in alerts)
    def test_no_alerts_when_all_clear(self):
        db = self._setup_db()
        with patch.object(BudgetService, "calculate_budget_progress", return_value=self._mock_progress("on_track")):
            alerts = BudgetService.get_budget_alerts(db, uuid.uuid4(), BudgetPeriod.MONTHLY)

        assert alerts == []

    def test_both_threshold_and_bill_alerts(self):
        """Should return both a threshold alert and a bill alert when both apply."""
        bill = make_bill(BillRecurrence.MONTHLY)
        bill.days_remaining = -2
        db = self._setup_db(bills=[bill])

        with patch.object(BudgetService, "calculate_budget_progress", return_value=self._mock_progress("exceeded")):
            alerts = BudgetService.get_budget_alerts(db, uuid.uuid4(), BudgetPeriod.MONTHLY)

        alert_types = [a.alert_type for a in alerts]
        assert "threshold_exceeded" in alert_types
        assert "bill_overdue" in alert_types