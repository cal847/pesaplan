"""
SMSParserService Unit Tests
Pure logic — no DB required.
Run with: pytest tests/test_sms_parser.py -v
"""
import pytest
from decimal import Decimal

from app.services.sms_parser import SMSParserService
from app.schemas.sms import ParsedTransactionType


# ─── Fixtures ─────────────────────────────────────────────────────────────────

RECEIVED_SMS = (
    "SML12ABC34 Confirmed.You have received Ksh1,500.00 from John Doe "
    "0712345678 on 1/1/24 at 10:00 AM"
)
PAYBILL_SMS = (
    "SML12ABC35 Confirmed. Ksh2,000.00 sent to KPLC PREPAID for account "
    "12345678 on 1/1/24 at 11:00 AM Transaction cost, Ksh30.00"
)
SENT_PERSON_SMS = (
    "SML12ABC36 Confirmed. Ksh500.00 sent to Jane Doe 0798765432 "
    "on 1/1/24 at 12:00 PM Transaction cost, Ksh12.00"
)
TILL_PAYMENT_SMS = (
    "SML12ABC37 Confirmed. Ksh750.00 paid to NAIVAS SUPERMARKET. "
    "on 1/1/24 at 1:00 PM Transaction cost, Ksh15.00"
)
AIRTIME_SMS = (
    "Confirmed.You bought Ksh50.00 of airtime on 1/1/24 at 2:00 PM "
    "Transaction cost, Ksh0.00"
)
MSHWARI_SMS = (
    "SML12ABC39 Confirmed. Ksh1,000.00 transferred to M-Shwari "
    "on 1/1/24 at 3:00 PM"
)
UNRECOGNISED_SMS = "Happy birthday! Wishing you all the best."


class TestSMSParserService:
    """
    Unit tests for SMSParserService.
    No DB — pure regex logic.
    """

    @pytest.fixture(autouse=True)
    def setup(self):
        self.parser = SMSParserService()

    # ── Money Received ────────────────────────────────────────────────────────

    def test_received_transaction_type(self):
        result = self.parser.parse_sms(RECEIVED_SMS)
        assert result is not None
        assert result.transaction_type == ParsedTransactionType.INCOME

    def test_received_amount(self):
        result = self.parser.parse_sms(RECEIVED_SMS)
        assert result.amount == Decimal("1500.00")

    def test_received_merchant_name(self):
        result = self.parser.parse_sms(RECEIVED_SMS)
        assert result.merchant_name == "John Doe"

    def test_received_transaction_code(self):
        result = self.parser.parse_sms(RECEIVED_SMS)
        assert result.transaction_code == "SML12ABC34"

    def test_received_transaction_date_not_none(self):
        result = self.parser.parse_sms(RECEIVED_SMS)
        assert result.transaction_date is not None

    def test_received_date_day(self):
        result = self.parser.parse_sms(RECEIVED_SMS)
        assert result.transaction_date.day == 1

    def test_received_date_month(self):
        result = self.parser.parse_sms(RECEIVED_SMS)
        assert result.transaction_date.month == 1

    # ── Paybill ───────────────────────────────────────────────────────────────

    def test_paybill_transaction_type(self):
        result = self.parser.parse_sms(PAYBILL_SMS)
        assert result.transaction_type == ParsedTransactionType.EXPENSE

    def test_paybill_amount_includes_transaction_cost(self):
        """Amount should include transaction cost: 2000 + 30 = 2030."""
        result = self.parser.parse_sms(PAYBILL_SMS)
        assert result.amount == Decimal("2030.00")

    def test_paybill_merchant_name(self):
        result = self.parser.parse_sms(PAYBILL_SMS)
        assert result.merchant_name == "KPLC PREPAID"

    def test_paybill_account_number(self):
        result = self.parser.parse_sms(PAYBILL_SMS)
        assert result.account_number == "12345678"

    def test_paybill_transaction_code(self):
        result = self.parser.parse_sms(PAYBILL_SMS)
        assert result.transaction_code == "SML12ABC35"

    def test_paybill_not_classified_as_sent_person(self):
        """Paybill has account number — must not match sent_person pattern."""
        result = self.parser.parse_sms(PAYBILL_SMS)
        assert result.account_number is not None

    # ── Sent to Person ────────────────────────────────────────────────────────

    def test_sent_person_transaction_type(self):
        result = self.parser.parse_sms(SENT_PERSON_SMS)
        assert result.transaction_type == ParsedTransactionType.EXPENSE

    def test_sent_person_amount_includes_cost(self):
        """Amount should include transaction cost: 500 + 12 = 512."""
        result = self.parser.parse_sms(SENT_PERSON_SMS)
        assert result.amount == Decimal("512.00")

    def test_sent_person_merchant_name(self):
        result = self.parser.parse_sms(SENT_PERSON_SMS)
        assert result.merchant_name == "Jane Doe"

    def test_sent_person_transaction_code(self):
        result = self.parser.parse_sms(SENT_PERSON_SMS)
        assert result.transaction_code == "SML12ABC36"

    # ── Till Payment ──────────────────────────────────────────────────────────

    def test_till_transaction_type(self):
        result = self.parser.parse_sms(TILL_PAYMENT_SMS)
        assert result.transaction_type == ParsedTransactionType.EXPENSE

    def test_till_amount_includes_cost(self):
        """Amount should include transaction cost: 750 + 15 = 765."""
        result = self.parser.parse_sms(TILL_PAYMENT_SMS)
        assert result.amount == Decimal("765.00")

    def test_till_merchant_name(self):
        result = self.parser.parse_sms(TILL_PAYMENT_SMS)
        assert result.merchant_name == "NAIVAS SUPERMARKET"

    def test_till_transaction_code(self):
        result = self.parser.parse_sms(TILL_PAYMENT_SMS)
        assert result.transaction_code == "SML12ABC37"

    # ── Airtime ───────────────────────────────────────────────────────────────

    def test_airtime_transaction_type(self):
        result = self.parser.parse_sms(AIRTIME_SMS)
        assert result.transaction_type == ParsedTransactionType.EXPENSE

    def test_airtime_merchant_is_safaricom(self):
        result = self.parser.parse_sms(AIRTIME_SMS)
        assert result.merchant_name == "Safaricom"

    def test_airtime_amount(self):
        result = self.parser.parse_sms(AIRTIME_SMS)
        assert result.amount == Decimal("50.00")

    def test_airtime_no_transaction_code(self):
        result = self.parser.parse_sms(AIRTIME_SMS)
        assert result.transaction_code is None

    # ── M-Shwari ──────────────────────────────────────────────────────────────

    def test_mshwari_transaction_type(self):
        result = self.parser.parse_sms(MSHWARI_SMS)
        assert result.transaction_type == ParsedTransactionType.SAVINGS

    def test_mshwari_no_merchant(self):
        result = self.parser.parse_sms(MSHWARI_SMS)
        assert result.merchant_name is None

    def test_mshwari_amount(self):
        result = self.parser.parse_sms(MSHWARI_SMS)
        assert result.amount == Decimal("1000.00")

    # ── Unrecognised ──────────────────────────────────────────────────────────

    def test_unrecognised_returns_none(self):
        result = self.parser.parse_sms(UNRECOGNISED_SMS)
        assert result is None

    def test_empty_string_returns_none(self):
        result = self.parser.parse_sms("")
        assert result is None

    # ── Edge Cases ────────────────────────────────────────────────────────────

    def test_amount_without_decimal(self):
        sms = (
            "SML12ABC40 Confirmed. Ksh500 paid to QUICKMART. "
            "on 1/1/24 at 4:00 PM"
        )
        result = self.parser.parse_sms(sms)
        assert result is not None
        assert result.amount >= Decimal("500")

    def test_amount_with_comma_separator(self):
        result = self.parser.parse_sms(RECEIVED_SMS)
        assert result.amount == Decimal("1500.00")

    def test_missing_date_returns_none_for_date(self):
        sms = "SML12ABC41 Confirmed. Ksh500 paid to QUICKMART."
        result = self.parser.parse_sms(sms)
        if result:
            assert result.transaction_date is None

    def test_missing_transaction_code_still_parses(self):
        sms = (
            "Confirmed.You bought Ksh100.00 of airtime "
            "on 1/1/24 at 2:00 PM"
        )
        result = self.parser.parse_sms(sms)
        assert result is not None
        assert result.transaction_code is None

    def test_no_transaction_cost_defaults_to_zero(self):
        """SMS with no transaction cost line should parse amount as-is."""
        sms = (
            "SML12ABC42 Confirmed. Ksh300.00 paid to JAVA HOUSE. "
            "on 1/1/24 at 5:00 PM"
        )
        result = self.parser.parse_sms(sms)
        assert result is not None
        assert result.amount == Decimal("300.00")