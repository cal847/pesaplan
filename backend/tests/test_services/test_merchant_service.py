"""
MerchantService Integration Tests
Uses db_session fixture — real SQLite DB.
Run with: pytest tests/test_merchant_service.py -v
"""
import pytest
import uuid
from sqlalchemy.orm import Session

from app.services.merchant_service import MerchantService
from app.models.merchant import Merchant
from app.core.exceptions import MerchantNotFoundException


class TestGetMerchant:
    """Tests for MerchantService.get_merchant"""

    @pytest.fixture(autouse=True)
    def setup(self, db_session: Session, test_user):
        self.service = MerchantService(db_session)
        self.db = db_session
        self.user_id = test_user.user_id

    def test_returns_existing_merchant(self, test_merchant):
        merchant = self.service.get_merchant(self.user_id, test_merchant.merchant_id)
        assert merchant is not None
        assert merchant.merchant_id == test_merchant.merchant_id

    def test_raises_not_found_for_missing_merchant(self):
        with pytest.raises(MerchantNotFoundException):
            self.service.get_merchant(self.user_id, uuid.uuid4())

    def test_raises_not_found_for_other_users_merchant(self, test_merchant):
        other_user_id = uuid.uuid4()
        with pytest.raises(MerchantNotFoundException):
            self.service.get_merchant(other_user_id, test_merchant.merchant_id)


class TestGetMerchants:
    """Tests for MerchantService.get_merchants"""

    @pytest.fixture(autouse=True)
    def setup(self, db_session: Session, test_user):
        self.service = MerchantService(db_session)
        self.db = db_session
        self.user_id = test_user.user_id

    def test_returns_all_user_merchants(self, test_merchant):
        merchants = self.service.get_merchants(self.user_id)
        assert len(merchants) >= 1

    def test_returns_empty_for_user_with_no_merchants(self):
        merchants = self.service.get_merchants(uuid.uuid4())
        assert merchants == []

    def test_search_by_name(self, test_merchant):
        results = self.service.get_merchants(self.user_id, search="naivas")
        assert any(m.merchant_id == test_merchant.merchant_id for m in results)

    def test_search_case_insensitive(self, test_merchant):
        results = self.service.get_merchants(self.user_id, search="NAIVAS")
        assert any(m.merchant_id == test_merchant.merchant_id for m in results)

    def test_search_partial_name(self, test_merchant):
        results = self.service.get_merchants(self.user_id, search="naiv")
        assert any(m.merchant_id == test_merchant.merchant_id for m in results)

    def test_search_no_match_returns_empty(self):
        results = self.service.get_merchants(self.user_id, search="ZZZNOMATCH")
        assert results == []

    def test_filter_by_category_name(self, test_merchant, test_category):
        self.service.set_category(self.user_id, test_merchant.merchant_id, test_category.category_id)
        results = self.service.get_merchants(self.user_id, category_name=test_category.name)
        assert any(m.merchant_id == test_merchant.merchant_id for m in results)

    def test_filter_by_nonexistent_category_returns_empty(self):
        results = self.service.get_merchants(self.user_id, category_name="NonExistentCategory")
        assert results == []

    def test_returns_merchants_ordered_by_name(self, db_session, test_user):
        for name in ["ZARA", "APPLE", "MANGO"]:
            db_session.add(Merchant(
                merchant_id=uuid.uuid4(),
                user_id=test_user.user_id,
                merchant_name=name,
            ))
        db_session.commit()
        results = self.service.get_merchants(self.user_id)
        names = [m.merchant_name for m in results]
        assert names == sorted(names)


class TestGetOrCreate:
    """Tests for MerchantService.get_or_create"""

    @pytest.fixture(autouse=True)
    def setup(self, db_session: Session, test_user):
        self.service = MerchantService(db_session)
        self.db = db_session
        self.user_id = test_user.user_id

    def test_creates_new_merchant(self):
        merchant = self.service.get_or_create(self.user_id, "Quickmart")
        assert merchant is not None
        assert merchant.merchant_name == "QUICKMART"

    def test_returns_existing_merchant(self):
        first = self.service.get_or_create(self.user_id, "Quickmart")
        second = self.service.get_or_create(self.user_id, "Quickmart")
        assert first.merchant_id == second.merchant_id

    def test_normalises_to_uppercase(self):
        merchant = self.service.get_or_create(self.user_id, "java house")
        assert merchant.merchant_name == "JAVA HOUSE"

    def test_strips_whitespace(self):
        merchant = self.service.get_or_create(self.user_id, "  KFC  ")
        assert merchant.merchant_name == "KFC"

    def test_case_insensitive_dedup(self):
        lower = self.service.get_or_create(self.user_id, "carrefour")
        upper = self.service.get_or_create(self.user_id, "CARREFOUR")
        assert lower.merchant_id == upper.merchant_id

    def test_different_users_get_separate_merchants(self):
        other_user = uuid.uuid4()
        m1 = self.service.get_or_create(self.user_id, "NAIVAS")
        m2 = self.service.get_or_create(other_user, "NAIVAS")
        assert m1.merchant_id != m2.merchant_id


class TestSetCategory:
    """Tests for MerchantService.set_category"""

    @pytest.fixture(autouse=True)
    def setup(self, db_session: Session, test_user):
        self.service = MerchantService(db_session)
        self.db = db_session
        self.user_id = test_user.user_id

    def test_assigns_category_to_merchant(self, test_merchant, test_category):
        merchant = self.service.set_category(
            self.user_id, test_merchant.merchant_id, test_category.category_id
        )
        assert merchant.category_id == test_category.category_id

    def test_removes_category_when_none_passed(self, test_merchant, test_category):
        self.service.set_category(self.user_id, test_merchant.merchant_id, test_category.category_id)
        merchant = self.service.set_category(self.user_id, test_merchant.merchant_id, None)
        assert merchant.category_id is None

    def test_raises_not_found_for_missing_merchant(self, test_category):
        with pytest.raises(MerchantNotFoundException):
            self.service.set_category(self.user_id, uuid.uuid4(), test_category.category_id)

    def test_backfills_existing_transactions(self, db_session, test_merchant, test_category, test_user):
        from app.models.transaction import Transaction, TransactionType
        from decimal import Decimal
        from datetime import datetime, timezone

        tx = Transaction(
            transaction_id=uuid.uuid4(),
            user_id=test_user.user_id,
            merchant_id=test_merchant.merchant_id,
            amount=Decimal("500.00"),
            type=TransactionType.EXPENSE,
            transaction_date=datetime.now(timezone.utc),
            category_id=None,
        )
        db_session.add(tx)
        db_session.commit()

        self.service.set_category(self.user_id, test_merchant.merchant_id, test_category.category_id)
        db_session.refresh(tx)
        assert tx.category_id == test_category.category_id

    def test_backfills_all_transactions(self, db_session, test_merchant, test_category, test_user):
        from app.models.transaction import Transaction, TransactionType
        from decimal import Decimal
        from datetime import datetime, timezone

        for _ in range(3):
            db_session.add(Transaction(
                transaction_id=uuid.uuid4(),
                user_id=test_user.user_id,
                merchant_id=test_merchant.merchant_id,
                amount=Decimal("100.00"),
                type=TransactionType.EXPENSE,
                transaction_date=datetime.now(timezone.utc),
                category_id=None,
            ))
        db_session.commit()

        self.service.set_category(self.user_id, test_merchant.merchant_id, test_category.category_id)

        from app.models.transaction import Transaction
        count = db_session.query(Transaction).filter(
            Transaction.merchant_id == test_merchant.merchant_id,
            Transaction.category_id == test_category.category_id,
        ).count()
        assert count == 3


class TestGetMerchantSpending:
    """Tests for MerchantService.get_merchant_spending"""

    @pytest.fixture(autouse=True)
    def setup(self, db_session: Session, test_user, test_merchant):
        self.service = MerchantService(db_session)
        self.db = db_session
        self.user_id = test_user.user_id
        self.merchant = test_merchant

    def _add_transaction(self, amount, db_session, test_user, test_merchant):
        from app.models.transaction import Transaction, TransactionType
        from decimal import Decimal
        from datetime import datetime, timezone

        tx = Transaction(
            transaction_id=uuid.uuid4(),
            user_id=test_user.user_id,
            merchant_id=test_merchant.merchant_id,
            amount=Decimal(amount),
            type=TransactionType.EXPENSE,
            transaction_date=datetime.now(timezone.utc),
        )
        db_session.add(tx)
        db_session.commit()
        return tx

    def test_returns_spending_response(self, db_session, test_user, test_merchant):
        self._add_transaction("500.00", db_session, test_user, test_merchant)
        result = self.service.get_merchant_spending(self.merchant.merchant_id, self.user_id)
        assert result.merchant_id == self.merchant.merchant_id

    def test_correct_total_amount(self, db_session, test_user, test_merchant):
        self._add_transaction("300.00", db_session, test_user, test_merchant)
        self._add_transaction("200.00", db_session, test_user, test_merchant)
        result = self.service.get_merchant_spending(self.merchant.merchant_id, self.user_id)
        from decimal import Decimal
        assert result.total_amount == Decimal("500.00")

    def test_correct_transaction_count(self, db_session, test_user, test_merchant):
        self._add_transaction("100.00", db_session, test_user, test_merchant)
        self._add_transaction("200.00", db_session, test_user, test_merchant)
        result = self.service.get_merchant_spending(self.merchant.merchant_id, self.user_id)
        assert result.transaction_count == 2

    def test_zero_spending_for_no_transactions(self):
        result = self.service.get_merchant_spending(self.merchant.merchant_id, self.user_id)
        from decimal import Decimal
        assert result.total_amount == Decimal("0")
        assert result.transaction_count == 0

    def test_raises_not_found_for_missing_merchant(self):
        with pytest.raises(MerchantNotFoundException):
            self.service.get_merchant_spending(uuid.uuid4(), self.user_id)

    def test_includes_category_name_when_set(self, test_merchant, test_category):
        self.service.set_category(self.user_id, test_merchant.merchant_id, test_category.category_id)
        result = self.service.get_merchant_spending(test_merchant.merchant_id, self.user_id)
        assert result.category_name == test_category.name


class TestGetTopMerchants:
    """Tests for MerchantService.get_top_merchants"""

    @pytest.fixture(autouse=True)
    def setup(self, db_session: Session, test_user):
        self.service = MerchantService(db_session)
        self.db = db_session
        self.user_id = test_user.user_id

    def _add_merchant_with_spending(self, name, amount, db_session, test_user):
        from app.models.transaction import Transaction, TransactionType
        from decimal import Decimal
        from datetime import datetime, timezone

        merchant = Merchant(
            merchant_id=uuid.uuid4(),
            user_id=test_user.user_id,
            merchant_name=name,
        )
        db_session.add(merchant)
        db_session.flush()

        db_session.add(Transaction(
            transaction_id=uuid.uuid4(),
            user_id=test_user.user_id,
            merchant_id=merchant.merchant_id,
            amount=Decimal(amount),
            type=TransactionType.EXPENSE,
            transaction_date=datetime.now(timezone.utc),
        ))
        db_session.commit()
        return merchant

    def test_returns_top_merchants(self, db_session, test_user):
        self._add_merchant_with_spending("ZARA", "1000.00", db_session, test_user)
        self._add_merchant_with_spending("APPLE", "500.00", db_session, test_user)
        results = self.service.get_top_merchants(self.user_id)
        assert len(results) >= 2

    def test_ordered_by_spending_descending(self, db_session, test_user):
        self._add_merchant_with_spending("HIGH SPENDER", "2000.00", db_session, test_user)
        self._add_merchant_with_spending("LOW SPENDER", "100.00", db_session, test_user)
        results = self.service.get_top_merchants(self.user_id)
        amounts = [r.total_amount for r in results]
        assert amounts == sorted(amounts, reverse=True)

    def test_respects_limit(self, db_session, test_user):
        for i in range(5):
            self._add_merchant_with_spending(f"MERCHANT{i}", "100.00", db_session, test_user)
        results = self.service.get_top_merchants(self.user_id, limit=3)
        assert len(results) <= 3

    def test_percentage_sums_to_100(self, db_session, test_user):
        self._add_merchant_with_spending("M1", "600.00", db_session, test_user)
        self._add_merchant_with_spending("M2", "400.00", db_session, test_user)
        results = self.service.get_top_merchants(self.user_id)
        total_pct = sum(r.percentage_of_total for r in results)
        assert abs(total_pct - 100.0) < 0.1

    def test_returns_empty_for_no_transactions(self):
        results = self.service.get_top_merchants(self.user_id)
        assert results == []