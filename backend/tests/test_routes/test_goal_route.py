import pytest
from fastapi import status
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from app.models.goals import Goal, GoalStatus

BASE_URL = "/api/v1/goals"

class TestGoalEndpoints:
    
    def test_create_goal_success(self, client, auth_headers):
        payload = {
            "title": "New Car",
            "target_amount": 15000.00,
            "target_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
        }
        response = client.post(BASE_URL, json=payload, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["title"] == "New Car"
        assert data["target_amount"] == "15000.00"
        assert data["status"] == "active"

    def test_create_goal_duplicate_title_fails(self, client, auth_headers):
        payload = {"title": "Duplicate", "target_amount": 1000.00}
        client.post(BASE_URL, json=payload, headers=auth_headers)
        
        response = client.post(BASE_URL, json=payload, headers=auth_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_get_goals_(self, client, auth_headers, test_user, db_session):
        # Seed goals with different statuses
        db_session.add(Goal(user_id=test_user.user_id, title="Active", target_amount=Decimal('100')))
        db_session.add(Goal(user_id=test_user.user_id, title="Completed", target_amount=Decimal('100')))
        db_session.commit()
        
        response = client.get(f"{BASE_URL}?status=active", headers=auth_headers)
        data = response.json()
        assert len(data) == 2
    def test_topup_goal_success(self, client, auth_headers, test_user, db_session):
        goal = Goal(user_id=test_user.user_id, title="Top Up Test", target_amount=Decimal('1000'))
        db_session.add(goal)
        db_session.commit()
        
        payload = {"amount": 250.00}
        response = client.post(f"{BASE_URL}/{goal.goal_id}/topup", json=payload, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["current_amount"] == "250.00"

    def test_delete_goal_success(self, client, auth_headers, test_user, db_session):
        goal = Goal(user_id=test_user.user_id, title="To Delete", target_amount=Decimal('100'))
        db_session.add(goal)
        db_session.commit()
        
        response = client.delete(f"{BASE_URL}/{goal.goal_id}", headers=auth_headers)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_get_goal_stats(self, client, auth_headers, test_user, db_session):
        db_session.add(Goal(user_id=test_user.user_id, title="G1", target_amount=Decimal('100'), status=GoalStatus.ACTIVE))
        db_session.add(Goal(user_id=test_user.user_id, title="G2", target_amount=Decimal('100'), status=GoalStatus.COMPLETED))
        db_session.commit()
        
        response = client.get(f"{BASE_URL}/stats/achievement-rate", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["total_goals"] == 2
        assert data["completed_goals"] == 1
        assert data["achievement_rate"] == 50.0