"""Tests for database connection"""
from app.database import engine, SessionLocal
from sqlalchemy import text

def test_database_engine_connects():
    """Tests that db engine can connect"""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).scalar()
        assert result == 1

def test_session_creation():
    """Test that database sessions can be created and used"""
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT 1")).scalar()
        assert result == 1
    finally:
        db.close()