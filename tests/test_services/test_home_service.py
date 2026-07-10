import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta

from app.services.home_service import HomeService
from app.models.transaction import Transaction, TransactionType
from app.models.budget import Budget, BillStatus, BudgetPeriod, BillRecurrence

class TestHomeService:
    
    @pytest.fixture(autouse=True)
    def setup(self, db_session, test_user, test_category):
        """Sets up the service and common variables for every test"""
        self.service = HomeService(db_session)
        self.db = db_session
        self.user_id = test_user.user_id
        self.category_id = test_category.category_id

    # ── Balance Summary ───────────────────────────────────────────────────────

    def test_get_balance_summary_calculates_income_and_expenses(self):
        """Tests that income and expenses are summed correctly for the period"""
        self.db.add(Transaction(user_id=self.user_id, amount=Decimal('1000.00'), type=TransactionType.INCOME, transaction_date=datetime.now(timezone.utc)))
        self.db.add(Transaction(user_id=self.user_id, amount=Decimal('250.00'), type=TransactionType.EXPENSE, transaction_date=datetime.now(timezone.utc)))
        self.db.commit()

        summary = self.service.get_balance_summary(self.user_id, "monthly")
        
        assert summary.total_income == Decimal('1000.00')
        assert summary.total_expenses == Decimal('250.00')
        assert summary.net_balance == Decimal('750.00')
        assert summary.period == "monthly"

    def test_get_balance_summary_empty_db(self):
        """Tests that an empty database returns 0s instead of crashing"""
        summary = self.service.get_balance_summary(self.user_id, "monthly")
        
        assert summary.total_income == Decimal('0')
        assert summary.total_expenses == Decimal('0')
        assert summary.net_balance == Decimal('0')

    # ── Upcoming Bills ────────────────────────────────────────────────────────

    def test_get_upcoming_bills_returns_unpaid_within_7_days(self):
        """Tests that a bill due in 3 days is returned"""
        self.db.add(Budget(
            user_id=self.user_id, category_id=self.category_id, amount=Decimal('100.00'),
            period=BudgetPeriod.MONTHLY, start_date=datetime.now(timezone.utc), end_date=datetime.now(timezone.utc)+timedelta(days=30),
            is_bill=True, bill_name="Internet", due_date=datetime.now(timezone.utc)+timedelta(days=3),
            bill_status=BillStatus.PENDING
        ))
        self.db.commit()

        bills = self.service.get_upcoming_bills(self.user_id)
        assert len(bills) == 1
        assert bills[0].bill_name == "Internet"

    def test_get_upcoming_bills_excludes_paid_bills(self):
        """Tests that already paid bills are filtered out"""
        self.db.add(Budget(
            user_id=self.user_id, category_id=self.category_id, amount=Decimal('100.00'),
            period=BudgetPeriod.MONTHLY, start_date=datetime.now(timezone.utc), end_date=datetime.now(timezone.utc)+timedelta(days=30),
            is_bill=True, bill_name="Paid Bill", due_date=datetime.now(timezone.utc)+timedelta(days=2),
            recurrence=BillRecurrence.MONTHLY, bill_status=BillStatus.PAID
        ))
        self.db.commit()

        bills = self.service.get_upcoming_bills(self.user_id)
        assert len(bills) == 0

    def test_get_upcoming_bills_excludes_bills_beyond_7_days(self):
        """Tests the 7-day lookahead limit (a bill due in 15 days should NOT show)"""
        self.db.add(Budget(
            user_id=self.user_id, category_id=self.category_id, amount=Decimal('100.00'),
            period=BudgetPeriod.MONTHLY, start_date=datetime.now(timezone.utc), end_date=datetime.now(timezone.utc)+timedelta(days=30),
            is_bill=True, bill_name="Far Bill", due_date=datetime.now(timezone.utc)+timedelta(days=15),
            recurrence=BillRecurrence.MONTHLY, bill_status=BillStatus.PENDING
        ))
        self.db.commit()

        bills = self.service.get_upcoming_bills(self.user_id)
        assert len(bills) == 0

    # ── Recent Transactions ───────────────────────────────────────────────────

    def test_get_recent_transactions_limits_to_5_and_orders_desc(self):
        """Tests that only 5 transactions are returned, ordered newest first"""
        for i in range(7):
            self.db.add(Transaction(
                user_id=self.user_id, amount=Decimal(f'{i}.00'), type=TransactionType.EXPENSE,
                transaction_date=datetime.now(timezone.utc) - timedelta(days=i)
            ))
        self.db.commit()

        txs = self.service.get_recent_transactions(self.user_id)
        
        assert len(txs) == 5
        # Verify descending order (newest first)
        assert txs[0].transaction_date >= txs[1].transaction_date

    def test_get_recent_transactions_excludes_savings(self):
        """Tests that savings transactions are filtered out of the recent list"""
        self.db.add(Transaction(user_id=self.user_id, amount=Decimal('100.00'), type=TransactionType.SAVINGS, transaction_date=datetime.now(timezone.utc)))
        self.db.commit()

        txs = self.service.get_recent_transactions(self.user_id)
        assert len(txs) == 0