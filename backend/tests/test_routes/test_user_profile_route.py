"""
User profile management endpoint tests.
Covers: get profile, update profile, update notifications, delete account.
Tests both regular users (with password) and OAuth users (no password).
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch
import uuid
import json
from datetime import datetime, timezone

from app.models.user import User
from app.core.exceptions import UserNotFoundException
from app.core.security import create_access_token


class TestUserRoutes:
    """Test suite for user profile management endpoints"""

    # ===== GET PROFILE TESTS =====

    def test_get_my_profile_success(self, client: TestClient, test_user: User, auth_headers: dict):
        """Test successfully getting own profile"""
        response = client.get("/api/v1/users/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == str(test_user.user_id)
        assert data["email"] == test_user.email
        assert data["is_verified"] == test_user.is_verified
        assert "created_at" in data

    def test_get_my_profile_unauthenticated(self, client: TestClient):
        """Test getting profile without auth token"""
        response = client.get("/api/v1/users/me")
        
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]

    # ===== UPDATE PROFILE TESTS =====

    def test_update_profile_success(self, client: TestClient, auth_headers: dict):
        """Test successfully updating profile"""
        update_data = {
            "first_name": "NewFirstName",
            "last_name": "NewLastName",
            "phone_number": "+254799999999"
        }
        
        response = client.patch(
            "/api/v1/users/me", 
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "NewFirstName"
        assert data["last_name"] == "NewLastName"
        assert data["phone_number"] == "+254799999999"

    def test_update_profile_partial(self, client: TestClient, auth_headers: dict):
        """Test updating only one field"""
        update_data = {"first_name": "OnlyFirstName"}
        
        response = client.patch(
            "/api/v1/users/me", 
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "OnlyFirstName"

    def test_update_profile_invalid_data(self, client: TestClient, auth_headers: dict):
        """Test update with invalid data (name too long)"""
        update_data = {"first_name": "a" * 200}
        
        response = client.patch(
            "/api/v1/users/me", 
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == 422

    def test_update_profile_unauthenticated(self, client: TestClient):
        """Test update without auth"""
        response = client.patch(
            "/api/v1/users/me",
            json={"first_name": "Test"}
        )
        
        assert response.status_code == 401

    # ===== NOTIFICATION PREFERENCES TESTS =====

    def test_update_notifications_success(self, client: TestClient, auth_headers: dict):
        """Test successfully updating notification preferences"""
        prefs = {
            "email_notifications": False,
            "sms_notifications": True,
            "budget_alerts": False
        }
        
        response = client.patch(
            "/api/v1/users/notifications",
            headers=auth_headers,
            json=prefs
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "notification_preferences" in data

    def test_update_notifications_partial(self, client: TestClient, auth_headers: dict):
        """Test updating only some notification preferences"""
        prefs = {"email_notifications": False}
        
        response = client.patch(
            "/api/v1/users/notifications",
            headers=auth_headers,
            json=prefs
        )
        
        assert response.status_code == 200

    # ===== REGULAR USER DELETE TESTS (with password) =====

    def test_delete_account_success(self, client: TestClient, test_user: User, auth_headers: dict):
        """Test regular user successfully deleting account with correct password"""
        delete_data = {"password": "TestPassword12345!"}
        
        response = client.request(
            method="DELETE",
            url="/api/v1/users/me",
            headers={**auth_headers, "Content-Type": "application/json"},
            content=json.dumps(delete_data)
        )
        
        assert response.status_code == 200
        assert "Account deleted successfully" in response.json()["message"]
        
        # Verify user can no longer access protected endpoints
        me_response = client.get("/api/v1/users/me", headers=auth_headers)
        assert me_response.status_code == 404

    def test_delete_account_wrong_password(self, client: TestClient, auth_headers: dict):
        """Test regular user cannot delete with incorrect password"""
        delete_data = {"password": "WrongPassword123!"}
        
        response = client.request(
            method="DELETE",
            url="/api/v1/users/me",
            headers={**auth_headers, "Content-Type": "application/json"},
            content=json.dumps(delete_data)
        )
        
        assert response.status_code == 401
        assert "password you entered is incorrect" in response.json()["detail"].lower()

    def test_delete_account_no_password_regular_user(self, client: TestClient, auth_headers: dict):
        """Test regular user cannot delete without providing password"""
        delete_data = {}
        
        response = client.request(
            method="DELETE",
            url="/api/v1/users/me",
            headers={**auth_headers, "Content-Type": "application/json"},
            content=json.dumps(delete_data)
        )
        
        assert response.status_code == 400

    def test_delete_account_unauthenticated(self, client: TestClient):
        """Test delete without auth"""
        delete_data = {"password": "test"}
        
        response = client.request(
            method="DELETE",
            url="/api/v1/users/me",
            headers={"Content-Type": "application/json"},
            content=json.dumps(delete_data)
        )
        
        assert response.status_code == 401

    @patch('app.services.user_service.UserService.soft_delete_user')
    def test_delete_account_service_exception(
        self, 
        mock_delete, 
        client: TestClient, 
        auth_headers: dict
    ):
        """Test delete when service raises exception"""
        mock_delete.side_effect = UserNotFoundException()
        delete_data = {"password": "TestPassword12345!"}
        
        response = client.request(
            method="DELETE",
            url="/api/v1/users/me",
            headers={**auth_headers, "Content-Type": "application/json"},
            content=json.dumps(delete_data)
        )
        
        assert response.status_code == 401

    # ===== OAUTH USER DELETE TESTS (no password) =====

    def test_oauth_user_delete_success(self, client: TestClient, db_session: Session):
        """Test OAuth user (no password) can delete account without password"""
        # Create OAuth user (no password)
        oauth_user = User(
            user_id=uuid.uuid4(),
            email="oauth@example.com",
            first_name="OAuth",
            last_name="User",
            phone_number="+254700000000",
            password_hash=None,
            oauth_provider="google",
            oauth_id="google_123456",
            is_verified=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(oauth_user)
        db_session.commit()
        
        # Create auth headers
        oauth_token = create_access_token({"sub": str(oauth_user.user_id)})
        oauth_headers = {"Authorization": f"Bearer {oauth_token}"}
        
        # Delete WITHOUT password - should work for OAuth users
        response = client.request(
            method="DELETE",
            url="/api/v1/users/me",
            headers={**oauth_headers, "Content-Type": "application/json"},
            content=json.dumps({})
        )
        
        assert response.status_code == 200
        assert "Account deleted successfully" in response.json()["message"]
        
        # Verify user is deleted
        me_response = client.get("/api/v1/users/me", headers=oauth_headers)
        assert me_response.status_code == 404

    # ===== CONCURRENT UPDATES TEST =====

    def test_concurrent_profile_updates(self, client: TestClient, auth_headers: dict):
        """Test multiple updates in sequence"""
        # First update
        response1 = client.patch(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"first_name": "Name1"}
        )
        assert response1.status_code == 200
        
        # Second update
        response2 = client.patch(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"first_name": "Name2"}
        )
        assert response2.status_code == 200
        assert response2.json()["first_name"] == "Name2"