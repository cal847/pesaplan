import pytest
from fastapi import status
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from unittest.mock import patch

from app.models.transaction import Transaction, TransactionType
from app.models.budget import Budget, BillStatus, BudgetPeriod, BillRecurrence

BASE_URL = "/api/v1/home"

class TestHomeEndpoints:

    def test_get_home_summary_success(self, client, auth_headers, test_user, db_session, test_category):
        """Tests the full dashboard payload with seeded data"""
        # Seed an expense
        db_session.add(Transaction(
            user_id=test_user.user_id, amount=Decimal('500.00'), 
            type=TransactionType.EXPENSE, transaction_date=datetime.now(timezone.utc)
        ))
        # Seed an upcoming bill
        db_session.add(Budget(
            user_id=test_user.user_id, category_id=test_category.category_id, amount=Decimal('100.00'),
            period=BudgetPeriod.MONTHLY, start_date=datetime.now(timezone.utc), end_date=datetime.now(timezone.utc)+timedelta(days=30),
            is_bill=True, bill_name="Test Bill", due_date=datetime.now(timezone.utc)+timedelta(days=2),
            bill_status=BillStatus.PENDING
        ))
        db_session.commit()

        response = client.get(f"{BASE_URL}?period=monthly", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        
        # Verify structure
        assert "balance" in data
        assert "upcoming_bills" in data
        assert "recent_transactions" in data
        
        # Verify data
        assert data["balance"]["total_expenses"] == "500.00"
        assert len(data["upcoming_bills"]) == 1
        assert data["upcoming_bills"][0]["bill_name"] == "Test Bill"
        assert len(data["recent_transactions"]) == 1

    def test_get_home_summary_default_period(self, client, auth_headers):
        """Tests that omitting the period query param defaults to 'monthly'"""
        response = client.get(BASE_URL, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["balance"]["period"] == "monthly"

    def test_get_home_summary_unauthenticated(self, client):
        """Tests that accessing the dashboard without a JWT fails"""
        response = client.get(BASE_URL)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_get_home_summary_handles_service_error(self, client, auth_headers):
        """Tests that a database failure in the service returns a 500 error gracefully"""
        # Mock the service method to raise an exception
        with patch('app.services.home_service.HomeService.get_home_summary', side_effect=Exception("DB Connection Lost")):
            response = client.get(BASE_URL, headers=auth_headers)
            
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert response.json()["detail"] == "Failed to fetch dashboard data"