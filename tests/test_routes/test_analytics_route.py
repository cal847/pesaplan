import pytest
from fastapi import status
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from app.models.transaction import Transaction, TransactionType
from app.models.goals import Goal, GoalStatus

BASE_URL = "/api/v1/analytics"

class TestAnalyticsEndpoints:
    
    def test_spending_by_category(self, client, auth_headers, test_user, test_category, db_session):
        # Seed expense transactions
        db_session.add(Transaction(
            user_id=test_user.user_id, category_id=test_category.category_id,
            amount=Decimal('500.00'), type=TransactionType.EXPENSE,
            transaction_date=datetime.now(timezone.utc)
        ))
        db_session.commit()
        
        response = client.get(f"{BASE_URL}/spending-by-category?period=monthly", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["period"] == "monthly"
        assert len(data["categories"]) > 0
        assert data["total_spent"] == "500.00"

    def test_spending_by_merchant(self, client, auth_headers, test_user, test_merchant, db_session):
        # Seed expense transaction with merchant
        db_session.add(Transaction(
            user_id=test_user.user_id, merchant_id=test_merchant.merchant_id,
            amount=Decimal('300.00'), type=TransactionType.EXPENSE,
            transaction_date=datetime.now(timezone.utc)
        ))
        db_session.commit()
        
        response = client.get(f"{BASE_URL}/spending-by-merchant?period=monthly", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert len(data["merchants"]) > 0
        assert data["merchants"][0]["merchant_name"] == test_merchant.merchant_name

    def test_income_expense_trend(self, client, auth_headers, test_user, db_session):
        # Seed income and expense
        db_session.add(Transaction(
            user_id=test_user.user_id, amount=Decimal('1000.00'),
            type=TransactionType.INCOME, transaction_date=datetime.now(timezone.utc)
        ))
        db_session.add(Transaction(
            user_id=test_user.user_id, amount=Decimal('400.00'),
            type=TransactionType.EXPENSE, transaction_date=datetime.now(timezone.utc)
        ))
        db_session.commit()
        
        response = client.get(f"{BASE_URL}/income-expense-trend?period=monthly", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["total_income"] == "1000.00"
        assert data["total_expenses"] == "400.00"
        assert data["net_change"] == "600.00"

    def test_savings_rate(self, client, auth_headers, test_user, db_session):
        # Seed income and savings
        db_session.add(Transaction(
            user_id=test_user.user_id, amount=Decimal('1000.00'),
            type=TransactionType.INCOME, transaction_date=datetime.now(timezone.utc)
        ))
        db_session.add(Transaction(
            user_id=test_user.user_id, amount=Decimal('200.00'),
            type=TransactionType.SAVINGS, transaction_date=datetime.now(timezone.utc)
        ))
        db_session.commit()
        
        response = client.get(f"{BASE_URL}/savings?period=monthly", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["total_income"] == "1000.00"
        assert data["total_savings"] == "200.00"
        assert data["savings_rate"] == 20.0

    def test_goals_achieved(self, client, auth_headers, test_user, db_session):
        # Seed completed goal
        db_session.add(Goal(
            user_id=test_user.user_id, title="Test Goal",
            target_amount=Decimal('1000.00'), current_amount=Decimal('1000.00'),
            status=GoalStatus.COMPLETED, completed_date=datetime.now(timezone.utc)
        ))
        db_session.commit()
        
        response = client.get(f"{BASE_URL}/goals?period=monthly", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["completed_goals"] == 1
        assert data["total_amount_achieved"] == "1000.00"

    def test_unauthenticated_access(self, client):
        endpoints = [
            f"{BASE_URL}/spending-by-category",
            f"{BASE_URL}/spending-by-merchant",
            f"{BASE_URL}/income-expense-trend",
            f"{BASE_URL}/savings",
            f"{BASE_URL}/goals"
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]