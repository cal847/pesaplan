import os
import sys
from pathlib import Path

os.environ["TESTING"] = "True"
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.config import settings

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

@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    """
    Verifies that we are in test mode
    Runs once before all tests
    """
    assert settings.TESTING == True, "TESTING environment variable not set!"
    assert "test.db" in settings.DATABASE_URL, "Test Database is not being used!"
    print(f"\n✅ Running tests in TEST mode with DB: {settings.DATABASE_URL}")
    
@pytest.fixture(scope="function")
def test_db():
    """
    Create a new database for each test
    Tables are created before test and dropped after
    """
    
    # Create all tables before test
    Base.metadata.create_all(bind=test_engine)
    
    # Create Session
    db = TestingSessionLocal()
    
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)
        
@pytest.fixture(scope="function")
def client(test_db):
    """
    Test API endpoints
    """
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    # Override the dependency
    app.dependency_overrides[get_db] = override_get_db
    
    # Create test client
    with TestClient(app) as test_client:
        yield test_client
        
    app.dependency_overrides.clear()        