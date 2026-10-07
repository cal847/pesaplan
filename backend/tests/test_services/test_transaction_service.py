"""
TransactionService Integration Tests
Uses db_session fixture — real SQLite DB.
Run with: pytest tests/test_transaction_service.py -v
"""
import pytest
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.services.transaction_service import TransactionService
from app.schemas.sms import SMSParseResult, ParsedTransactionType
from app.models.merchant import Merchant


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_parsed(
    transaction_type=ParsedTransactionType.EXPENSE,
    amount="500.00",
    merchant_name="NAIVAS",
    transaction_code="SML12ABC34",
    account_number=None,
):
    return SMSParseResult(
        transaction_code=transaction_code,
        amount=Decimal(amount),
        merchant_name=merchant_name,
        account_number=account_number,
        transaction_type=transaction_type,
        transaction_date=datetime.now(timezone.utc),
    )


class TestTransactionService:
    """
    Integration tests for TransactionService.
    Covers creation, merchant linking, dedup, and edge cases.
    """

    @pytest.fixture(autouse=True)
    def setup(self, db_session: Session, test_user):
        self.service = TransactionService(db_session)
        self.db = db_session
        self.user_id = test_user.user_id

    # ── create_from_sms ───────────────────────────────────────────────────────

    def test_creates_transaction_with_sms(self):
        parsed = make_parsed()
        transaction = self.service.create_from_sms(parsed, self.user_id)
        assert transaction is not None
        assert transaction.transaction_id is not None

    def test_create_manual_with_merchant_name(self):
        """Tests that providing a merchant_name in manual creation auto-creates the merchant"""
        from app.schemas.transaction import TransactionCreate
        from app.models.transaction import TransactionType
        
        data = TransactionCreate(
            amount=Decimal("300.00"),
            type=TransactionType.EXPENSE,
            transaction_date=datetime.now(timezone.utc),
            merchant_name="MANUAL_MERCHANT",
            category_id=None
        )
        
        tx = self.service.create_manual(data, self.user_id)
        assert tx.merchant_id is not None
        
        # Verify the merchant was actually created in the DB
        merchant = self.db.query(Merchant).filter(Merchant.merchant_name == "MANUAL_MERCHANT").first()
        assert merchant is not None

    def test_correct_amount_saved(self):
        parsed = make_parsed(amount="1500.00", transaction_code="CODE0000001")
        transaction = self.service.create_from_sms(parsed, self.user_id)
        assert transaction.amount == Decimal("1500.00")

    def test_correct_user_id_saved(self):
        parsed = make_parsed(transaction_code="CODE0000002")
        transaction = self.service.create_from_sms(parsed, self.user_id)
        assert transaction.user_id == self.user_id

    def test_correct_transaction_code_saved(self):
        parsed = make_parsed(transaction_code="MYCODE12345")
        transaction = self.service.create_from_sms(parsed, self.user_id)
        assert transaction.transaction_code == "MYCODE12345"

    # def test_saves_account_number_for_paybill(self):
    #     parsed = make_parsed(
    #         account_number="12345678",
    #         transaction_code="PAYBILL1234",
    #     )
    #     transaction = self.service.create_from_sms(parsed, self.user_id)
    #     assert transaction.paybill_account_number == "12345678"

    # ── Merchant Linking ──────────────────────────────────────────────────────

    def test_auto_creates_merchant(self):
        parsed = make_parsed(merchant_name="QUICKMART", transaction_code="CODE0000003")
        self.service.create_from_sms(parsed, self.user_id)

        merchant = self.db.query(Merchant).filter(
            Merchant.merchant_name == "QUICKMART"
        ).first()
        assert merchant is not None

    def test_transaction_linked_to_merchant(self):
        parsed = make_parsed(merchant_name="KPLC PREPAID", transaction_code="CODE0000004")
        transaction = self.service.create_from_sms(parsed, self.user_id)
        assert transaction.merchant_id is not None

    def test_same_merchant_reused_across_transactions(self):
        first = self.service.create_from_sms(
            make_parsed(merchant_name="NAIVAS", transaction_code="CODE0000005"),
            self.user_id,
        )
        second = self.service.create_from_sms(
            make_parsed(merchant_name="NAIVAS", transaction_code="CODE0000006"),
            self.user_id,
        )
        assert first.merchant_id == second.merchant_id

    def test_transaction_with_no_merchant(self):
        """M-Shwari savings have no merchant — should still save."""
        parsed = make_parsed(
            merchant_name=None,
            transaction_type=ParsedTransactionType.SAVINGS,
            transaction_code="MSHWARI1234",
        )
        transaction = self.service.create_from_sms(parsed, self.user_id)
        assert transaction is not None
        assert transaction.merchant_id is None

    # ── Dedup ─────────────────────────────────────────────────────────────────

    def test_duplicate_code_returns_none(self):
        parsed = make_parsed(transaction_code="DUPCODE1234")
        first = self.service.create_from_sms(parsed, self.user_id)
        second = self.service.create_from_sms(parsed, self.user_id)

        assert first is not None
        assert second is None

    def test_duplicate_does_not_create_second_record(self):
        parsed = make_parsed(transaction_code="DUPCODE5678")
        self.service.create_from_sms(parsed, self.user_id)
        self.service.create_from_sms(parsed, self.user_id)

        from app.models.transaction import Transaction
        count = self.db.query(Transaction).filter(
            Transaction.transaction_code == "DUPCODE5678"
        ).count()
        assert count == 1

    def test_different_codes_both_saved(self):
        first = self.service.create_from_sms(
            make_parsed(transaction_code="UNIQUE00001"), self.user_id
        )
        second = self.service.create_from_sms(
            make_parsed(transaction_code="UNIQUE00002"), self.user_id
        )
        assert first is not None
        assert second is not None
        assert first.transaction_id != second.transaction_id

    def test_no_code_transactions_not_deduped(self):
        """Two transactions without codes should both be saved."""
        first = self.service.create_from_sms(
            make_parsed(transaction_code=None, merchant_name="SAFARICOM"),
            self.user_id,
        )
        second = self.service.create_from_sms(
            make_parsed(transaction_code=None, merchant_name="SAFARICOM"),
            self.user_id,
        )
        assert first is not None
        assert second is not None

    # ── find_by_code ──────────────────────────────────────────────────────────

    def test_find_by_code_returns_existing(self):
        self.service.create_from_sms(
            make_parsed(transaction_code="FINDME12345"), self.user_id
        )
        found = self.service.find_by_code("FINDME12345")
        assert found is not None

    def test_find_by_code_returns_none_for_missing(self):
        result = self.service.find_by_code("DOESNOTEXIST")
        assert result is None

    # ── get_all_transactions ──────────────────────────────────────────────────
    def test_get_all_transactions_ordered_desc(self):
        """Tests that transactions are returned ordered by date (newest first)"""
        from app.models.transaction import Transaction
        from datetime import timedelta
        
        tx1 = Transaction(
            user_id=self.user_id, amount=Decimal("10.00"), type="expense",
            transaction_date=datetime.now(timezone.utc) - timedelta(days=1)
        )
        tx2 = Transaction(
            user_id=self.user_id, amount=Decimal("20.00"), type="expense",
            transaction_date=datetime.now(timezone.utc)
        )
        self.db.add_all([tx1, tx2])
        self.db.commit()
        
        results = self.service.get_all_transactions(self.user_id)
        assert len(results) == 2
        assert results[0].amount == Decimal("20.00") # Newest first

    # ── get_by_id ─────────────────────────────────────────────────────────────
    def test_get_by_id_returns_existing(self):
        """Tests fetching a valid transaction by ID"""
        tx = self.service.create_from_sms(make_parsed(transaction_code="GETID123"), self.user_id)
        found = self.service.get_by_id(self.user_id, tx.transaction_id)
        assert found is not None
        assert found.transaction_id == tx.transaction_id

    def test_get_by_id_data_isolation(self):
        """Tests that a user cannot fetch a transaction belonging to another user"""
        import uuid
        tx = self.service.create_from_sms(make_parsed(transaction_code="GETID456"), self.user_id)
        
        # Try to fetch with a fake/different user_id
        fake_user_id = uuid.uuid4()
        found = self.service.get_by_id(fake_user_id, tx.transaction_id)
        assert found is None

    # ── create_manual ─────────────────────────────────────────────────────────
    def test_create_manual_success(self):
        """Tests successful creation of a manual transaction"""
        from app.schemas.transaction import TransactionCreate
        from app.models.transaction import TransactionType
        
        # NOTE: This assumes you added `type: TransactionType` to TransactionBase!
        data = TransactionCreate(
            amount=Decimal("500.00"),
            type=TransactionType.INCOME, 
            transaction_date=datetime.now(timezone.utc),
            category_id=None
        )
        
        tx = self.service.create_manual(data, self.user_id)
        assert tx is not None
        assert tx.amount == Decimal("500.00")
        assert tx.type == TransactionType.INCOME