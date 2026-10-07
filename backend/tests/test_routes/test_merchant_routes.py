"""
Merchant Router E2E Tests
Uses client + auth_headers fixtures.
Run with: pytest tests/test_merchant_routes.py -v
"""
import pytest
import uuid
from sqlalchemy.orm import Session

from app.models.merchant import Merchant


class TestGetMerchantsEndpoint:
    """Tests for GET /api/v1/merchants"""

    def test_returns_200(self, client, auth_headers):
        response = client.get("/api/v1/merchants", headers=auth_headers)
        assert response.status_code == 200

    def test_returns_list(self, client, auth_headers):
        response = client.get("/api/v1/merchants", headers=auth_headers)
        assert isinstance(response.json(), list)

    def test_returns_user_merchants(self, client, auth_headers, test_merchant):
        response = client.get("/api/v1/merchants", headers=auth_headers)
        ids = [m["merchant_id"] for m in response.json()]
        assert str(test_merchant.merchant_id) in ids

    def test_search_by_name(self, client, auth_headers, test_merchant):
        response = client.get("/api/v1/merchants?search=naivas", headers=auth_headers)
        assert response.status_code == 200
        ids = [m["merchant_id"] for m in response.json()]
        assert str(test_merchant.merchant_id) in ids

    def test_search_no_match_returns_empty(self, client, auth_headers):
        response = client.get("/api/v1/merchants?search=ZZZNOMATCH", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_filter_by_nonexistent_category_returns_empty(self, client, auth_headers):
        response = client.get("/api/v1/merchants?category_name=DoesNotExist", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_requires_auth(self, client):
        response = client.get("/api/v1/merchants")
        assert response.status_code == 401

    def test_unverified_user_rejected(self, client, test_unverified_user):
        from app.core.security import create_access_token
        token = create_access_token({"sub": str(test_unverified_user.user_id)})
        response = client.get(
            "/api/v1/merchants",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400


class TestGetTopMerchantsEndpoint:
    """Tests for GET /api/v1/merchants/top_merchants"""

    def test_returns_200(self, client, auth_headers):
        response = client.get("/api/v1/merchants/top_merchants", headers=auth_headers)
        assert response.status_code == 200

    def test_returns_list(self, client, auth_headers):
        response = client.get("/api/v1/merchants/top_merchants", headers=auth_headers)
        assert isinstance(response.json(), list)

    def test_respects_limit_param(self, client, auth_headers):
        response = client.get("/api/v1/merchants/top_merchants?limit=5", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) <= 5

    def test_limit_below_1_returns_422(self, client, auth_headers):
        response = client.get("/api/v1/merchants/top_merchants?limit=0", headers=auth_headers)
        assert response.status_code == 422

    def test_limit_above_50_returns_422(self, client, auth_headers):
        response = client.get("/api/v1/merchants/top_merchants?limit=51", headers=auth_headers)
        assert response.status_code == 422

    def test_requires_auth(self, client):
        response = client.get("/api/v1/merchants/top_merchants")
        assert response.status_code == 401


class TestGetMerchantEndpoint:
    """Tests for GET /api/v1/merchants/{merchant_id}"""

    def test_returns_200(self, client, auth_headers, test_merchant):
        response = client.get(
            f"/api/v1/merchants/{test_merchant.merchant_id}",
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_returns_correct_merchant(self, client, auth_headers, test_merchant):
        response = client.get(
            f"/api/v1/merchants/{test_merchant.merchant_id}",
            headers=auth_headers,
        )
        assert response.json()["merchant_id"] == str(test_merchant.merchant_id)
        assert response.json()["merchant_name"] == test_merchant.merchant_name

    def test_returns_404_for_missing_merchant(self, client, auth_headers):
        response = client.get(
            f"/api/v1/merchants/{uuid.uuid4()}",
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_cannot_access_other_users_merchant(self, client, db_session, test_unverified_user, test_merchant):
        """Verified user cannot access another user's merchant."""
        from app.core.security import create_access_token
        from app.models.user import User
        from app.core.security import get_password_hash
        from datetime import datetime, timezone

        other_user = User(
            user_id=uuid.uuid4(),
            email="other@example.com",
            first_name="Other",
            last_name="User",
            phone_number="+1111111111",
            password_hash=get_password_hash("Password123!"),
            is_verified=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(other_user)
        db_session.commit()

        token = create_access_token({"sub": str(other_user.user_id)})
        response = client.get(
            f"/api/v1/merchants/{test_merchant.merchant_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404

    def test_requires_auth(self, client, test_merchant):
        response = client.get(f"/api/v1/merchants/{test_merchant.merchant_id}")
        assert response.status_code == 401


class TestGetMerchantSpendingEndpoint:
    """Tests for GET /api/v1/merchants/{merchant_id}/spending"""

    def test_returns_200(self, client, auth_headers, test_merchant):
        response = client.get(
            f"/api/v1/merchants/{test_merchant.merchant_id}/spending",
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_returns_spending_fields(self, client, auth_headers, test_merchant):
        response = client.get(
            f"/api/v1/merchants/{test_merchant.merchant_id}/spending",
            headers=auth_headers,
        )
        data = response.json()
        assert "merchant_id" in data
        assert "total_amount" in data
        assert "transaction_count" in data

    def test_returns_zero_for_no_transactions(self, client, auth_headers, test_merchant):
        response = client.get(
            f"/api/v1/merchants/{test_merchant.merchant_id}/spending",
            headers=auth_headers,
        )
        assert response.json()["total_amount"] == "0.00"
        assert response.json()["transaction_count"] == 0

    def test_returns_404_for_missing_merchant(self, client, auth_headers):
        response = client.get(
            f"/api/v1/merchants/{uuid.uuid4()}/spending",
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_accepts_date_range_params(self, client, auth_headers, test_merchant):
        response = client.get(
            f"/api/v1/merchants/{test_merchant.merchant_id}/spending"
            "?start_date=2024-01-01T00:00:00&end_date=2024-12-31T23:59:59",
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_requires_auth(self, client, test_merchant):
        response = client.get(f"/api/v1/merchants/{test_merchant.merchant_id}/spending")
        assert response.status_code == 401


class TestCategorizeMerchantEndpoint:
    """Tests for PATCH /api/v1/merchants/{merchant_id}"""

    def test_assigns_category_returns_200(self, client, auth_headers, test_merchant, test_category):
        response = client.patch(
            f"/api/v1/merchants/{test_merchant.merchant_id}",
            json={"category_id": str(test_category.category_id)},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_category_id_updated_in_response(self, client, auth_headers, test_merchant, test_category):
        response = client.patch(
            f"/api/v1/merchants/{test_merchant.merchant_id}",
            json={"category_id": str(test_category.category_id)},
            headers=auth_headers,
        )
        assert response.json()["category_id"] == str(test_category.category_id)

    def test_removes_category_when_null_passed(self, client, auth_headers, test_merchant, test_category):
        client.patch(
            f"/api/v1/merchants/{test_merchant.merchant_id}",
            json={"category_id": str(test_category.category_id)},
            headers=auth_headers,
        )
        response = client.patch(
            f"/api/v1/merchants/{test_merchant.merchant_id}",
            json={"category_id": None},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["category_id"] is None

    def test_backfills_transactions_in_db(
        self, client, auth_headers, test_merchant, test_category, db_session, test_user
    ):
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

        client.patch(
            f"/api/v1/merchants/{test_merchant.merchant_id}",
            json={"category_id": str(test_category.category_id)},
            headers=auth_headers,
        )

        db_session.refresh(tx)
        assert tx.category_id == test_category.category_id

    def test_returns_404_for_missing_merchant(self, client, auth_headers, test_category):
        response = client.patch(
            f"/api/v1/merchants/{uuid.uuid4()}",
            json={"category_id": str(test_category.category_id)},
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_requires_auth(self, client, test_merchant, test_category):
        response = client.patch(
            f"/api/v1/merchants/{test_merchant.merchant_id}",
            json={"category_id": str(test_category.category_id)},
        )
        assert response.status_code == 401