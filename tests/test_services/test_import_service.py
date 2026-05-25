"""
SMSImportService Integration Tests
Uses db_session fixture — real SQLite DB.
Run with: pytest tests/test_import_service.py -v
"""
import pytest
from unittest.mock import patch
from sqlalchemy.orm import Session

from app.services.import_service import SMSImportService


# ─── SMS Fixtures ─────────────────────────────────────────────────────────────

RECEIVED_SMS = (
    "SML12ABC34 Confirmed.You have received Ksh1,500.00 from John Doe "
    "0712345678 on 1/1/24 at 10:00 AM"
)
PAYBILL_SMS = (
    "SML12ABC35 Confirmed. Ksh2,000.00 sent to KPLC PREPAID for account "
    "12345678 on 1/1/24 at 11:00 AM Transaction cost, Ksh30.00"
)
TILL_PAYMENT_SMS = (
    "SML12ABC37 Confirmed. Ksh750.00 paid to NAIVAS SUPERMARKET. "
    "on 1/1/24 at 1:00 PM Transaction cost, Ksh15.00"
)
UNRECOGNISED_SMS = "Happy birthday! Wishing you all the best."


class TestSMSImportServiceProcessOne:
    """Tests for SMSImportService.process_one — single SMS flow."""

    @pytest.fixture(autouse=True)
    def setup(self, db_session: Session, test_user):
        self.service = SMSImportService(db_session)
        self.user_id = test_user.user_id

    def test_returns_transaction_for_valid_sms(self):
        transaction = self.service.process_one(RECEIVED_SMS, self.user_id)
        assert transaction is not None

    def test_returns_none_for_unrecognised_sms(self):
        result = self.service.process_one(UNRECOGNISED_SMS, self.user_id)
        assert result is None

    def test_returns_none_for_duplicate(self):
        self.service.process_one(RECEIVED_SMS, self.user_id)
        second = self.service.process_one(RECEIVED_SMS, self.user_id)
        assert second is None

    def test_transaction_has_correct_user(self):
        transaction = self.service.process_one(PAYBILL_SMS, self.user_id)
        assert transaction.user_id == self.user_id

    def test_empty_string_returns_none(self):
        result = self.service.process_one("", self.user_id)
        assert result is None


class TestSMSImportServiceProcessBatch:
    """Tests for SMSImportService.process_batch — batch flow."""

    @pytest.fixture(autouse=True)
    def setup(self, db_session: Session, test_user):
        self.service = SMSImportService(db_session)
        self.db = db_session
        self.user_id = test_user.user_id

    # ── Counts ────────────────────────────────────────────────────────────────

    def test_all_valid_messages_created(self):
        results = self.service.process_batch(
            [RECEIVED_SMS, PAYBILL_SMS, TILL_PAYMENT_SMS], self.user_id
        )
        assert results["created"] == 3
        assert results["skipped"] == 0
        assert results["failed"] == 0

    def test_unrecognised_message_skipped(self):
        results = self.service.process_batch(
            [RECEIVED_SMS, UNRECOGNISED_SMS], self.user_id
        )
        assert results["created"] == 1
        assert results["skipped"] == 1

    def test_duplicate_message_skipped(self):
        results = self.service.process_batch(
            [RECEIVED_SMS, RECEIVED_SMS], self.user_id
        )
        assert results["created"] == 1
        assert results["skipped"] == 1

    def test_failed_count_on_exception(self):
        with patch.object(
            self.service.transaction_service,
            "create_from_sms",
            side_effect=Exception("DB error"),
        ):
            results = self.service.process_batch([RECEIVED_SMS], self.user_id)

        assert results["failed"] == 1
        assert results["created"] == 0

    # ── Isolation ─────────────────────────────────────────────────────────────

    def test_one_failure_does_not_abort_batch(self):
        """A single failure must not stop remaining messages."""
        original = self.service.transaction_service.create_from_sms
        call_count = 0

        def side_effect(parsed, user_id):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("First fails")
            return original(parsed, user_id)

        with patch.object(
            self.service.transaction_service,
            "create_from_sms",
            side_effect=side_effect,
        ):
            results = self.service.process_batch(
                [RECEIVED_SMS, PAYBILL_SMS], self.user_id
            )

        assert results["failed"] == 1
        assert results["created"] == 1

    # ── Edge Cases ────────────────────────────────────────────────────────────

    def test_empty_batch_returns_zero_counts(self):
        results = self.service.process_batch([], self.user_id)
        assert results == {"created": 0, "skipped": 0, "failed": 0}

    def test_total_always_matches_input(self):
        messages = [RECEIVED_SMS, PAYBILL_SMS, UNRECOGNISED_SMS]
        results = self.service.process_batch(messages, self.user_id)
        total = results["created"] + results["skipped"] + results["failed"]
        assert total == len(messages)

    def test_single_message_batch(self):
        results = self.service.process_batch([RECEIVED_SMS], self.user_id)
        assert results["created"] == 1

    def test_all_unrecognised_batch(self):
        results = self.service.process_batch(
            [UNRECOGNISED_SMS, UNRECOGNISED_SMS], self.user_id
        )
        assert results["created"] == 0
        assert results["skipped"] == 2