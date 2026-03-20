"""Configurations for testing"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, Engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker, Session
from httpx import AsyncClient
from datetime import datetime, timedelta, timezone
import uuid
from unittest.mock import MagicMock   
import os
from typing import Generator, AsyncGenerator 

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
# os.environ["TESTING"] = "True" 
os.environ["FRONTEND_URL"] = "http://localhost:3000" 

from app.main import app
from app.database import Base, get_db
from app.models import *
from app.core.security import get_password_hash, create_access_token

# Create Database Engine
test_engine = create_engine(
    "sqlite:///./test.db",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine
)

# @pytest.fixture(scope="session", autouse=True)
# def setup_test_env():
#     """
#     Verifies that we are in test mode
#     Runs once before all tests
#     """
#     assert settings.TESTING == True, "TESTING environment variable not set!"
#     assert "test.db" in settings.DATABASE_URL, "Test Database is not being used!"
#     print(f"\n✅ Running tests in TEST mode with DB: {settings.DATABASE_URL}")
    
@pytest.fixture(scope="session")
def test_db() -> Generator[Engine, None, None]:
    """
    Create a new database for each test
    Tables are created before test and dropped after
    """
    
    # Create all tables before test
    Base.metadata.create_all(bind=test_engine)
    
    yield test_engine
    
    Base.metadata.drop_all(bind=test_engine)
    
@pytest.fixture(scope="function")
def db_session(test_db) -> Generator[Session, None, None]:
    """
    Create a new db session for each test
    """
    conn = test_db.connect()
    transaction = conn.begin()
    session = TestingSessionLocal(bind=conn)
    
    yield session
    
    session.close()
    transaction.rollback()
    conn.close()
        
@pytest.fixture(scope="function")
def client(db_session) -> Generator[TestClient, None, None]:
    """
    Test API endpoints
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    # Override the dependency
    app.dependency_overrides[get_db] = override_get_db
    
    # Create test client
    with TestClient(app) as test_client:
        # print("Available routes: ")
        # for route in app.routes:
        #     print(f"{route.path}")
        yield test_client
        
    app.dependency_overrides.clear()        

@pytest.fixture(scope="function")
async def async_client(db_session) -> AsyncGenerator[AsyncClient, None]:
    """
    Create an async client for testing async endpoints
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
        
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def background_tasks():
    """Mock BackgroundTasks for testing"""
    from fastapi import BackgroundTasks
    bt = BackgroundTasks()
    bt.add_task = MagicMock()  
    return bt

@pytest.fixture(scope="function")
def test_user(db_session) -> User:
    """
    Create verified test user
    """
    user = User(
        user_id=uuid.uuid4(),
        email="test@example.com",
        first_name="Test",
        last_name="User",
        phone_number="+1234567890",
        password_hash=get_password_hash("TestPassword12345!"),
        is_verified=True,
        notification_preferences={
            "email_notifications": True,
            "sms_notifications": True,
            "budget_alerts": True,
            "weekly_report": True
        },
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def test_unverified_user(db_session) -> User:
    """
    Create unverified test user
    """
    user = User(
        user_id=uuid.uuid4(),
        email="unverified@example.com",
        first_name="Unverified",
        last_name="User",
        phone_number="+1987654321",
        password_hash=get_password_hash("TestPassword123!"),
        is_verified=False,
        verification_token="test-verification-token",
        verification_expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def auth_headers(test_user, client) -> dict:
    """
    Get authentication headers for test user
    """
    access_token = create_access_token({"sub": str(test_user.user_id)})
    return {"Authorization": f"Bearer {access_token}"}

@pytest.fixture(scope="function")
def test_category(db_session, test_user) -> Category:
    """Seeded parent category for testing"""
    category = Category(
        category_id=uuid.uuid4(),
        user_id=test_user.user_id,
        name="The Essentials",
        type="expense",
        parent_id=None,
        display_order=0,
        is_active=True,
    )
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category


@pytest.fixture(scope="function")
def test_child_category(db_session, test_user, test_category) -> Category:
    """Seeded child category under test_category"""
    category = Category(
        category_id=uuid.uuid4(),
        user_id=test_user.user_id,
        name="Food",
        type="expense",
        parent_id=test_category.category_id,
        display_order=0,
        is_active=True,
    )
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category