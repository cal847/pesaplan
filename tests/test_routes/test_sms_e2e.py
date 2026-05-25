"""
SMS E2E Flow Tests
Covers the full pipeline:
  router → SMSImportService → SMSParserService → TransactionService → DB

Also covers router-level concerns: auth, schema validation, Celery mocking.
Run with: pytest tests/test_sms_e2e.py -v
"""
import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.models.merchant import Merchant


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
AIRTIME_SMS = (
    "Confirmed.You bought Ksh50.00 of airtime on 1/1/24 at 2:00 PM "
    "Transaction cost, Ksh0.00"
)
UNRECOGNISED_SMS = "Happy birthday! Wishing you all the best."


# ══════════════════════════════════════════════════════════════════════════════
# /sms/parse — E2E endpoint tests
# ══════════════════════════════════════════════════════════════════════════════

class TestParseSMSEndpoint:
    """
    E2E tests for POST /api/v1/sms/parse.
    Covers happy path, skipped, auth, schema validation.
    """

    # ── Happy Path ────────────────────────────────────────────────────────────

    def test_parse_received_sms_returns_201(self, client, auth_headers):
        response = client.post(
            "/api/v1/sms/parse",
            json={"message": RECEIVED_SMS},
            headers=auth_headers,
        )
        assert response.status_code == 201

    def test_parse_returns_created_status(self, client, auth_headers):
        response = client.post(
            "/api/v1/sms/parse",
            json={"message": RECEIVED_SMS},
            headers=auth_headers,
        )
        assert response.json()["status"] == "created"

    def test_parse_returns_transaction_id(self, client, auth_headers):
        response = client.post(
            "/api/v1/sms/parse",
            json={"message": TILL_PAYMENT_SMS},
            headers=auth_headers,
        )
        data = response.json()
        assert "transaction_id" in data
        assert data["transaction_id"] is not None

    def test_parse_returns_amount(self, client, auth_headers):
        response = client.post(
            "/api/v1/sms/parse",
            json={"message": PAYBILL_SMS},
            headers=auth_headers,
        )
        assert "amount" in response.json()

    def test_parse_returns_type(self, client, auth_headers):
        response = client.post(
            "/api/v1/sms/parse",
            json={"message": RECEIVED_SMS},
            headers=auth_headers,
        )
        assert "type" in response.json()

    def test_parse_persists_transaction_to_db(self, client, auth_headers, db_session):
        client.post(
            "/api/v1/sms/parse",
            json={"message": RECEIVED_SMS},
            headers=auth_headers,
        )
        transaction = db_session.query(Transaction).filter(
            Transaction.transaction_code == "SML12ABC34"
        ).first()
        assert transaction is not None

    def test_parse_persists_merchant_to_db(self, client, auth_headers, db_session):
        client.post(
            "/api/v1/sms/parse",
            json={"message": TILL_PAYMENT_SMS},
            headers=auth_headers,
        )
        merchant = db_session.query(Merchant).filter(
            Merchant.merchant_name == "NAIVAS SUPERMARKET"
        ).first()
        assert merchant is not None

    # ── Skipped ───────────────────────────────────────────────────────────────

    def test_unrecognised_sms_returns_skipped(self, client, auth_headers):
        response = client.post(
            "/api/v1/sms/parse",
            json={"message": UNRECOGNISED_SMS},
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["status"] == "skipped"

    def test_duplicate_sms_returns_skipped(self, client, auth_headers):
        client.post(
            "/api/v1/sms/parse",
            json={"message": RECEIVED_SMS},
            headers=auth_headers,
        )
        response = client.post(
            "/api/v1/sms/parse",
            json={"message": RECEIVED_SMS},
            headers=auth_headers,
        )
        assert response.json()["status"] == "skipped"

    def test_duplicate_does_not_create_second_db_record(
        self, client, auth_headers, db_session
    ):
        client.post(
            "/api/v1/sms/parse",
            json={"message": RECEIVED_SMS},
            headers=auth_headers,
        )
        client.post(
            "/api/v1/sms/parse",
            json={"message": RECEIVED_SMS},
            headers=auth_headers,
        )
        count = db_session.query(Transaction).filter(
            Transaction.transaction_code == "SML12ABC34"
        ).count()
        assert count == 1

    # ── Auth ──────────────────────────────────────────────────────────────────

    def test_requires_auth(self, client):
        response = client.post(
            "/api/v1/sms/parse",
            json={"message": RECEIVED_SMS},
        )
        assert response.status_code == 401

    def test_unverified_user_rejected(self, client, test_unverified_user):
        from app.core.security import create_access_token
        token = create_access_token({"sub": str(test_unverified_user.user_id)})
        response = client.post(
            "/api/v1/sms/parse",
            json={"message": RECEIVED_SMS},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400

    def test_invalid_token_rejected(self, client):
        response = client.post(
            "/api/v1/sms/parse",
            json={"message": RECEIVED_SMS},
            headers={"Authorization": "Bearer invalidtoken"},
        )
        assert response.status_code == 401

    # ── Schema Validation ─────────────────────────────────────────────────────

    def test_empty_message_returns_422(self, client, auth_headers):
        response = client.post(
            "/api/v1/sms/parse",
            json={"message": ""},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_missing_message_field_returns_422(self, client, auth_headers):
        response = client.post(
            "/api/v1/sms/parse",
            json={},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_whitespace_only_message_returns_422(self, client, auth_headers):
        response = client.post(
            "/api/v1/sms/parse",
            json={"message": "   "},
            headers=auth_headers,
        )
        assert response.status_code == 422


# ══════════════════════════════════════════════════════════════════════════════
# /sms/import — E2E endpoint tests
# ══════════════════════════════════════════════════════════════════════════════

class TestImportSMSEndpoint:
    """
    E2E tests for POST /api/v1/sms/import.
    Celery task is mocked — we verify enqueueing, not execution.
    """

    def _post_import(self, client, auth_headers, messages):
        with patch("app.api.routes.sms_route.process_sms_batch") as mock_task:
            mock_task.delay.return_value = MagicMock()
            response = client.post(
                "/api/v1/sms/import",
                json={"messages": messages},
                headers=auth_headers,
            )
            return response, mock_task

    # ── Happy Path ────────────────────────────────────────────────────────────

    def test_import_returns_202(self, client, auth_headers):
        response, _ = self._post_import(
            client, auth_headers,
            [{"message": RECEIVED_SMS}, {"message": PAYBILL_SMS}],
        )
        assert response.status_code == 202

    def test_import_returns_correct_total(self, client, auth_headers):
        response, _ = self._post_import(
            client, auth_headers,
            [{"message": RECEIVED_SMS}, {"message": PAYBILL_SMS}],
        )
        assert response.json()["total"] == 2

    def test_import_enqueues_celery_task(self, client, auth_headers):
        _, mock_task = self._post_import(
            client, auth_headers,
            [{"message": RECEIVED_SMS}],
        )
        mock_task.delay.assert_called_once()

    def test_import_passes_correct_messages_to_celery(self, client, auth_headers):
        _, mock_task = self._post_import(
            client, auth_headers,
            [{"message": RECEIVED_SMS}],
        )
        call_kwargs = mock_task.delay.call_args
        assert RECEIVED_SMS in call_kwargs.kwargs.get(
            "messages", call_kwargs.args[0] if call_kwargs.args else []
        )

    def test_import_single_message_batch(self, client, auth_headers):
        response, _ = self._post_import(
            client, auth_headers,
            [{"message": RECEIVED_SMS}],
        )
        assert response.status_code == 202
        assert response.json()["total"] == 1

    # ── Auth ──────────────────────────────────────────────────────────────────

    def test_import_requires_auth(self, client):
        response = client.post(
            "/api/v1/sms/import",
            json={"messages": [{"message": RECEIVED_SMS}]},
        )
        assert response.status_code == 401

    def test_import_unverified_user_rejected(self, client, test_unverified_user):
        from app.core.security import create_access_token
        token = create_access_token({"sub": str(test_unverified_user.user_id)})
        with patch("app.api.routes.sms_route.process_sms_batch") as mock_task:
            mock_task.delay.return_value = MagicMock()
            response = client.post(
                "/api/v1/sms/import",
                json={"messages": [{"message": RECEIVED_SMS}]},
                headers={"Authorization": f"Bearer {token}"},
            )
        assert response.status_code == 400

    # ── Schema Validation ─────────────────────────────────────────────────────

    def test_import_empty_batch_returns_422(self, client, auth_headers):
        response = client.post(
            "/api/v1/sms/import",
            json={"messages": []},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_import_exceeds_100_messages_returns_422(self, client, auth_headers):
        messages = [{"message": RECEIVED_SMS}] * 101
        response = client.post(
            "/api/v1/sms/import",
            json={"messages": messages},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_import_empty_message_in_batch_returns_422(self, client, auth_headers):
        response = client.post(
            "/api/v1/sms/import",
            json={"messages": [{"message": ""}]},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_import_missing_messages_field_returns_422(self, client, auth_headers):
        response = client.post(
            "/api/v1/sms/import",
            json={},
            headers=auth_headers,
        )
        assert response.status_code == 422


# ══════════════════════════════════════════════════════════════════════════════
# Full Pipeline Flow Tests
# ══════════════════════════════════════════════════════════════════════════════

class TestSMSFullPipeline:
    """
    Tests that verify the complete flow:
    raw SMS → parser → transaction service → DB record.
    Uses /sms/parse endpoint as the entry point.
    """

    def test_received_sms_creates_income_transaction(
        self, client, auth_headers, db_session
    ):
        client.post(
            "/api/v1/sms/parse",
            json={"message": RECEIVED_SMS},
            headers=auth_headers,
        )
        transaction = db_session.query(Transaction).filter(
            Transaction.transaction_code == "SML12ABC34"
        ).first()
        assert transaction is not None

    def test_paybill_sms_creates_transaction_with_account_number(
        self, client, auth_headers, db_session
    ):
        client.post(
            "/api/v1/sms/parse",
            json={"message": PAYBILL_SMS},
            headers=auth_headers,
        )
        transaction = db_session.query(Transaction).filter(
            Transaction.transaction_code == "SML12ABC35"
        ).first()
        assert transaction is not None
        assert transaction.paybill_account_number == "12345678"

    def test_till_sms_creates_merchant_and_transaction(
        self, client, auth_headers, db_session
    ):
        client.post(
            "/api/v1/sms/parse",
            json={"message": TILL_PAYMENT_SMS},
            headers=auth_headers,
        )
        merchant = db_session.query(Merchant).filter(
            Merchant.merchant_name == "NAIVAS SUPERMARKET"
        ).first()
        transaction = db_session.query(Transaction).filter(
            Transaction.transaction_code == "SML12ABC37"
        ).first()
        assert merchant is not None
        assert transaction is not None
        assert transaction.merchant_id == merchant.merchant_id

    def test_two_different_sms_create_two_transactions(
        self, client, auth_headers, db_session
    ):
        client.post(
            "/api/v1/sms/parse",
            json={"message": RECEIVED_SMS},
            headers=auth_headers,
        )
        client.post(
            "/api/v1/sms/parse",
            json={"message": PAYBILL_SMS},
            headers=auth_headers,
        )
        count = db_session.query(Transaction).count()
        assert count == 2

    def test_same_sms_twice_creates_one_transaction(
        self, client, auth_headers, db_session
    ):
        client.post(
            "/api/v1/sms/parse",
            json={"message": RECEIVED_SMS},
            headers=auth_headers,
        )
        client.post(
            "/api/v1/sms/parse",
            json={"message": RECEIVED_SMS},
            headers=auth_headers,
        )
        count = db_session.query(Transaction).filter(
            Transaction.transaction_code == "SML12ABC34"
        ).count()
        assert count == 1

    def test_airtime_sms_creates_safaricom_merchant(
        self, client, auth_headers, db_session
    ):
        client.post(
            "/api/v1/sms/parse",
            json={"message": AIRTIME_SMS},
            headers=auth_headers,
        )
        merchant = db_session.query(Merchant).filter(
            Merchant.merchant_name == "SAFARICOM"
        ).first()
        assert merchant is not None