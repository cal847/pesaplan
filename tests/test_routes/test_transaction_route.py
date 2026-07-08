"""
Transaction Endpoints Integration Tests
"""
import pytest
from fastapi import status
from datetime import datetime, timezone
from decimal import Decimal

from app.models.transaction import Transaction, TransactionType

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
        data = response.json()
        assert response.status_code == status.HTTP_200_OK
        
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        
        assert isinstance(data["items"], list)
        assert len(data["items"]) == 1
        assert data["items"][0]["amount"] == str(tx.amount) 
        assert data["total"] == 1
    
    def test_get_transactions_pagination(self, client, auth_headers, test_user, db_session):
        """Tests fetching all transactions with pagination"""
        for i in range(25):
            tx = Transaction(
                user_id=test_user.user_id, amount=Decimal(f'{i+1}.00'), 
                type=TransactionType.EXPENSE, transaction_date=datetime.now(timezone.utc)
            )
            db_session.add(tx)
        db_session.commit()

        # Fetch page 1, limit 10
        response = client.get(f"{BASE_URL}?page=1&limit=10", headers=auth_headers)
        data = response.json()
        assert len(data["items"]) == 10
        assert data["total"] == 25
        assert data["page"] == 1

        # Fetch page 3, limit 10 (Should only have 5 items left)
        response = client.get(f"{BASE_URL}?page=3&limit=10", headers=auth_headers)
        data = response.json()
        assert len(data["items"]) == 5
        assert data["page"] == 3

    def test_get_transactions_filter_by_type(self, client, auth_headers, test_user, db_session):
        """Tests fetching all transactions with filters"""
        tx_expense = Transaction(
            user_id=test_user.user_id, amount=Decimal('100.00'), 
            type=TransactionType.EXPENSE, transaction_date=datetime.now(timezone.utc)
        )
        tx_income = Transaction(
            user_id=test_user.user_id, amount=Decimal('500.00'), 
            type=TransactionType.INCOME, transaction_date=datetime.now(timezone.utc)
        )
        db_session.add_all([tx_expense, tx_income])
        db_session.commit()

        # Filter by expense
        response = client.get(f"{BASE_URL}?type=expense", headers=auth_headers)
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["type"] == "expense"

        # Filter by income
        response = client.get(f"{BASE_URL}?type=income", headers=auth_headers)
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["type"] == "income"

    def test_get_transactions_unauthenticated(self, client):
        """Tests that accessing the endpoint without a JWT fails"""
        response = client.get(BASE_URL)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        
    def test_get_transactions_empty(self, client, auth_headers):
        """Tests fetching transactions when the user has none"""
        response = client.get(BASE_URL, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

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