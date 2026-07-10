"""
Transaction Endpoints Integration Tests
Uses the FastAPI TestClient and real SQLite DB via conftest.py fixtures.
Run with: pytest tests/test_transaction_endpoints.py -v
"""
import pytest
from fastapi import status
from datetime import datetime, timezone
from decimal import Decimal

from app.models.transaction import Transaction, TransactionType

# Adjust this prefix if your settings.APP_VERSION is different (e.g., "v1")
BASE_URL = "/api/v1/transactions"

class TestTransactionEndpoints:
    
    # ─── GET /transactions ────────────────────────────────────────────────────
    
    def test_get_transactions_success(self, client, auth_headers, test_user, db_session):
        """Tests fetching all transactions for the authenticated user"""
        # Seed a transaction directly into the DB
        tx = Transaction(
            user_id=test_user.user_id,
            amount=Decimal('150.00'),
            type=TransactionType.EXPENSE,
            transaction_date=datetime.now(timezone.utc)
        )
        db_session.add(tx)
        db_session.commit()
        
        response = client.get(BASE_URL, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        # Pydantic serializes Decimal to string in JSON
        assert data[0]["amount"] == "150.00" 
        
    def test_get_transactions_unauthenticated(self, client):
        """Tests that accessing the endpoint without a JWT fails"""
        response = client.get(BASE_URL)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        
    def test_get_transactions_empty(self, client, auth_headers):
        """Tests fetching transactions when the user has none"""
        response = client.get(BASE_URL, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    # ─── POST /transactions ───────────────────────────────────────────────────
    
    def test_create_transaction_success(self, client, auth_headers, test_user, test_category):
        """Tests successful manual creation of a transaction"""
        payload = {
            "amount": 1000.00,
            "type": "expense",
            "transaction_date": datetime.now(timezone.utc).isoformat(),
            "category_id": str(test_category.category_id)
        }
        response = client.post(BASE_URL, json=payload, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["amount"] == "1000.00"
        assert data["type"] == "expense"
        assert "transaction_id" in data
        
    def test_create_transaction_with_new_merchant(self, client, auth_headers, test_user, test_category):
        """Tests that providing a new merchant_name auto-creates it and links it"""
        payload = {
            "amount": 500.00,
            "type": "expense",
            "transaction_date": datetime.now(timezone.utc).isoformat(),
            "merchant_name": "CARREFOUR",
            "category_id": str(test_category.category_id)
        }
        response = client.post(BASE_URL, json=payload, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        # The @property merchant_name on the Transaction model should catch this
        assert data["merchant_name"] == "CARREFOUR"
        
    def test_create_transaction_invalid_payload(self, client, auth_headers):
        """Tests that missing required fields triggers a 422 Validation Error"""
        payload = {
            "type": "expense", 
            # Missing required fields: amount and transaction_date
        }
        response = client.post(BASE_URL, json=payload, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
    def test_create_transaction_unauthenticated(self, client, test_category):
        """Tests that creating a transaction without a JWT fails"""
        payload = {
            "amount": 100.00,
            "type": "expense",
            "transaction_date": datetime.now(timezone.utc).isoformat(),
            "category_id": str(test_category.category_id)
        }
        response = client.post(BASE_URL, json=payload)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]