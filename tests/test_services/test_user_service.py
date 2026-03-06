"""
User service tests.
Tests user profile management business logic: update profile,
update notification preferences, soft delete user.
"""
import pytest
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
import uuid
import time

from app.services.user_service import UserService
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.user import UserProfileUpdate
from app.core.exceptions import UserNotFoundException, InvalidPasswordException
from app.core.security import get_password_hash


class TestUserService:
    """Test suite for UserService"""

    # ===== UPDATE PROFILE TESTS =====

    def test_update_profile_success(self, db_session: Session, test_user: User):
        """Test successfully updating user profile"""
        # Arrange
        update_data = UserProfileUpdate(
            first_name="Updated",
            last_name="Name",
            phone_number="+254712345678"
        )
        
        original_updated_at = test_user.updated_at
        time.sleep(0.01)  # Ensure timestamp changes
        
        # Act
        updated_user = UserService.update_profile(
            db_session, 
            test_user.user_id, 
            update_data
        )
        
        # Assert
        assert updated_user.first_name == "Updated"
        assert updated_user.last_name == "Name"
        assert updated_user.phone_number == "+254712345678"
        assert updated_user.updated_at > original_updated_at
        assert updated_user.user_id == test_user.user_id

    def test_update_profile_partial_update(self, db_session: Session, test_user: User):
        """Test updating only some fields"""
        # Arrange
        update_data = UserProfileUpdate(first_name="NewName")
        original_last_name = test_user.last_name
        original_phone = test_user.phone_number
        original_email = test_user.email
        original_updated_at = test_user.updated_at
        
        time.sleep(0.01)
        
        # Act
        updated_user = UserService.update_profile(
            db_session, 
            test_user.user_id, 
            update_data
        )
        
        # Assert
        assert updated_user.first_name == "NewName"
        assert updated_user.last_name == original_last_name  # Unchanged
        assert updated_user.phone_number == original_phone    # Unchanged
        assert updated_user.email == original_email           # Unchanged
        assert updated_user.updated_at > original_updated_at  # Timestamp updated

    def test_update_profile_no_changes(self, db_session: Session, test_user: User):
        """Test update with no changes - updated_at should still change"""
        # Arrange
        update_data = UserProfileUpdate()
        original_updated_at = test_user.updated_at
        
        time.sleep(0.01)
        
        # Act
        updated_user = UserService.update_profile(
            db_session, 
            test_user.user_id, 
            update_data
        )
        
        # Assert
        assert updated_user.user_id == test_user.user_id
        assert updated_user.first_name == test_user.first_name
        assert updated_user.last_name == test_user.last_name
        assert updated_user.updated_at > original_updated_at

    def test_update_profile_user_not_found(self, db_session: Session):
        """Test updating non-existent user"""
        # Arrange
        non_existent_id = uuid.uuid4()
        update_data = UserProfileUpdate(first_name="Test")
        
        # Act & Assert
        with pytest.raises(UserNotFoundException):
            UserService.update_profile(db_session, non_existent_id, update_data)

    def test_update_profile_with_none_values(self, db_session: Session, test_user: User):
        """Test that None values are ignored"""
        # Arrange
        update_data = UserProfileUpdate(
            first_name=None,  # Should be ignored
            last_name="NewLast",
            phone_number=None  # Should be ignored
        )
        original_first_name = test_user.first_name
        original_phone = test_user.phone_number
        
        # Act
        updated_user = UserService.update_profile(
            db_session, 
            test_user.user_id, 
            update_data
        )
        
        # Assert
        assert updated_user.first_name == original_first_name  # Unchanged
        assert updated_user.last_name == "NewLast"              # Updated
        assert updated_user.phone_number == original_phone      # Unchanged

    # ===== NOTIFICATION PREFERENCES TESTS =====

    # def test_direct_update(self, db_session: Session, test_user: User):
    #     """DIRECT TEST: Update preferences without using service"""
    #     print(f"\n[DIRECT TEST] BEFORE direct update: {test_user.notification_preferences}")
        
    #     # FIX: Create a new dict and assign it
    #     new_prefs = test_user.notification_preferences.copy()
    #     new_prefs["email_notifications"] = False
    #     test_user.notification_preferences = new_prefs
        
    #     db_session.commit()
    #     db_session.refresh(test_user)
        
    #     print(f"[DIRECT TEST] AFTER direct update: {test_user.notification_preferences}")
        
    #     assert test_user.notification_preferences["email_notifications"] is False
    #     assert test_user.notification_preferences["sms_notifications"] is True
    #     assert test_user.notification_preferences["weekly_report"] is True
    #     assert test_user.notification_preferences["budget_alerts"] is True

    def test_update_notification_preferences_success(self, db_session: Session, test_user: User):
        """Test updating notification preferences via service"""
        # Force fresh load
        db_session.refresh(test_user)
        
        print(f"\n[SERVICE TEST] BEFORE update: {test_user.notification_preferences}")
        print(f"[SERVICE TEST] BEFORE updated_at: {test_user.updated_at}")
        
        new_prefs = {
            "email_notifications": False,
            "sms_notifications": False,
            "weekly_report": False
        }
        
        original_updated_at = test_user.updated_at
        time.sleep(0.01)
        
        # Act
        updated_user = UserService.update_notification_preferences(
            db_session,
            test_user.user_id,
            new_prefs
        )
        
        # Force fresh load
        db_session.refresh(updated_user)
        
        print(f"[SERVICE TEST] AFTER update preferences: {updated_user.notification_preferences}")
        print(f"[SERVICE TEST] AFTER updated_at: {updated_user.updated_at}")
        
        # Assert
        assert updated_user.notification_preferences["email_notifications"] is False
        assert updated_user.notification_preferences["sms_notifications"] is False
        assert updated_user.notification_preferences["weekly_report"] is False
        assert updated_user.notification_preferences["budget_alerts"] is True
        assert updated_user.updated_at > original_updated_at

    def test_update_notification_preferences_merge(self, db_session: Session, test_user: User):
        """Test that preferences merge correctly"""
        db_session.refresh(test_user)
        
        print(f"\n[MERGE TEST] BEFORE: {test_user.notification_preferences}")
        
        # Update only one field
        updated_user = UserService.update_notification_preferences(
            db_session,
            test_user.user_id,
            {"sms_notifications": False}
        )
        
        db_session.refresh(updated_user)
        
        print(f"[MERGE TEST] AFTER: {updated_user.notification_preferences}")
        
        # Assert - only updated field should change
        assert updated_user.notification_preferences["email_notifications"] is True
        assert updated_user.notification_preferences["sms_notifications"] is False
        assert updated_user.notification_preferences["budget_alerts"] is True
        assert updated_user.notification_preferences["weekly_report"] is True

    def test_update_notification_preferences_initial_none(self, db_session: Session, test_user: User):
        """Test updating preferences when user has None preferences"""
        # Override fixture to set preferences to None
        test_user.notification_preferences = None
        db_session.commit()
        
        new_prefs = {"email_notifications": False}
        
        # Act
        updated_user = UserService.update_notification_preferences(
            db_session,
            test_user.user_id,
            new_prefs
        )
        
        # Assert - only the new preference should exist
        assert updated_user.notification_preferences["email_notifications"] is False
        # Other keys won't exist because service doesn't add defaults

    def test_update_notification_preferences_user_not_found(self, db_session: Session):
        """Test updating preferences for non-existent user"""
        # Arrange
        non_existent_id = uuid.uuid4()
        
        # Act & Assert
        with pytest.raises(UserNotFoundException):
            UserService.update_notification_preferences(
                db_session,
                non_existent_id,
                {"email_notifications": False}
            )

    def test_update_notification_preferences_empty_dict(self, db_session: Session, test_user: User):
        """Test updating with empty preferences (should not change anything)"""
        # Store original preferences
        original_prefs = test_user.notification_preferences.copy()
        original_updated_at = test_user.updated_at
        
        time.sleep(0.01)
        
        # Act
        updated_user = UserService.update_notification_preferences(
            db_session,
            test_user.user_id,
            {}
        )
        
        # Assert - preferences should be unchanged
        assert updated_user.notification_preferences == original_prefs
        assert updated_user.updated_at > original_updated_at

    # ===== SOFT DELETE TESTS =====

    def test_soft_delete_email_user_success(self, db_session: Session, test_user: User):
        """Test successfully soft deleting an email/password user"""
        # Arrange
        correct_password = "TestPassword12345!"  # From test_user fixture
        
        # Act
        result = UserService.soft_delete_user(
            db_session,
            test_user.user_id,
            password=correct_password
        )
        
        # Assert
        assert result is True
        
        # Query the user directly instead of refreshing the fixture
        deleted_user = db_session.query(User).filter(
            User.user_id == test_user.user_id
        ).first()
        
        assert deleted_user.deleted_at is not None
        # Fix timezone comparison
        assert deleted_user.deleted_at.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc)
        
        # Verify refresh tokens are revoked
        refresh_tokens = db_session.query(RefreshToken).filter(
            RefreshToken.user_id == test_user.user_id
        ).all()
        for token in refresh_tokens:
            assert token.revoked is True

    def test_soft_delete_oauth_user_success(self, db_session: Session, test_user: User):
        """Test successfully soft deleting an OAuth user (no password needed)"""
        # Setup OAuth user
        test_user.password_hash = None
        db_session.commit()
        
        # Act - no password needed (password is optional)
        result = UserService.soft_delete_user(
            db_session,
            test_user.user_id
            # No password parameter
        )
        
        # Assert
        assert result is True
        
        # Query the user directly
        deleted_user = db_session.query(User).filter(
            User.user_id == test_user.user_id
        ).first()
        
        assert deleted_user.deleted_at is not None

    def test_soft_delete_email_user_wrong_password(self, db_session: Session, test_user: User):
        """Test soft delete with incorrect password"""
        # Arrange
        wrong_password = "WrongPassword123!"
        
        # Act & Assert
        with pytest.raises(InvalidPasswordException):
            UserService.soft_delete_user(
                db_session,
                test_user.user_id,
                password=wrong_password
            )
        
        # Verify user not deleted
        db_session.refresh(test_user)
        assert test_user.deleted_at is None

    def test_soft_delete_user_not_found(self, db_session: Session):
        """Test soft deleting non-existent user"""
        # Arrange
        non_existent_id = uuid.uuid4()
        
        # Act & Assert
        with pytest.raises(UserNotFoundException):
            UserService.soft_delete_user(
                db_session,
                non_existent_id,
                password="any_password"
            )

    def test_soft_delete_email_user_no_password(self, db_session: Session, test_user: User):
        """Test email user deletion without password"""
        # Act & Assert
        with pytest.raises(ValueError, match="Password required for account deletion"):
            UserService.soft_delete_user(
                db_session,
                test_user.user_id
                # No password provided
            )
        
        # Verify user not deleted
        db_session.refresh(test_user)
        assert test_user.deleted_at is None

    @patch('app.services.user_service.verify_password')
    def test_soft_delete_user_password_verification_called(
        self, 
        mock_verify, 
        db_session: Session, 
        test_user: User
    ):
        """Test that password verification is called correctly for email users"""
        # Arrange
        mock_verify.return_value = True
        password = "test_password"
        
        # Act
        UserService.soft_delete_user(db_session, test_user.user_id, password=password)
        
        # Assert
        mock_verify.assert_called_once_with(password, test_user.password_hash)

    def test_soft_delete_user_multiple_tokens_revoked(self, db_session: Session, test_user: User):
        """Test that all refresh tokens are revoked, not just one"""
        # Arrange - create multiple refresh tokens
        from app.models.refresh_token import RefreshToken
        from datetime import timedelta
        import uuid
        
        token1 = RefreshToken(
            user_id=test_user.user_id,
            jti=str(uuid.uuid4()),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            revoked=False
        )
        token2 = RefreshToken(
            user_id=test_user.user_id,
            jti=str(uuid.uuid4()),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            revoked=False
        )
        db_session.add_all([token1, token2])
        db_session.commit()
        
        # Act
        UserService.soft_delete_user(
            db_session,
            test_user.user_id,
            password="TestPassword12345!"
        )
        
        # Assert
        db_session.expire_all()
        tokens = db_session.query(RefreshToken).filter(
            RefreshToken.user_id == test_user.user_id
        ).all()
        for token in tokens:
            assert token.revoked is True

    # ===== EDGE CASE TESTS =====

    def test_update_profile_with_special_characters(self, db_session: Session, test_user: User):
        """Test updating profile with special characters"""
        update_data = UserProfileUpdate(
            first_name="José",
            last_name="O'Connor-Smith",
            phone_number="+254-712-345-678"
        )
        
        updated_user = UserService.update_profile(
            db_session, test_user.user_id, update_data
        )
        
        assert updated_user.first_name == "José"
        assert updated_user.last_name == "O'Connor-Smith"
        assert updated_user.phone_number == "+254-712-345-678"

    def test_update_profile_with_very_long_values(self, db_session: Session, test_user: User):
        """Test updating with very long values (should work up to DB limits)"""
        long_name = "A" * 100
        update_data = UserProfileUpdate(first_name=long_name)
        
        updated_user = UserService.update_profile(
            db_session, test_user.user_id, update_data
        )
        
        assert updated_user.first_name == long_name

    def test_concurrent_updates(self, db_session: Session, test_user: User):
        """Test multiple sequential updates"""
        # First update
        update1 = UserProfileUpdate(first_name="Name1")
        user1 = UserService.update_profile(db_session, test_user.user_id, update1)
        db_session.refresh(user1)
        time1 = user1.updated_at
        
        # Longer delay
        time.sleep(0.5)
        
        # Second update
        update2 = UserProfileUpdate(first_name="Name2")
        user2 = UserService.update_profile(db_session, test_user.user_id, update2)
        db_session.refresh(user2)
        time2 = user2.updated_at
        
        assert user2.first_name == "Name2"
        assert time2 > time1

    def test_update_profile_preserves_other_fields(self, db_session: Session, test_user: User):
        """Test that updating one field doesn't affect others"""
        original_email = test_user.email
        original_phone = test_user.phone_number
        original_created_at = test_user.created_at
        
        update_data = UserProfileUpdate(first_name="NewFirst")
        updated_user = UserService.update_profile(
            db_session, test_user.user_id, update_data
        )
        
        assert updated_user.email == original_email
        assert updated_user.phone_number == original_phone
        assert updated_user.created_at == original_created_at