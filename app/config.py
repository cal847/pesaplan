from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
import os

class Settings(BaseSettings):
    """Application Configurations"""
    
    # App Settings
    APP_NAME: str = "Budgeting App"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    TESTING: bool = False
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    #CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:19006",
        "http://localhost:8000"
    ]
    
    class Config:
        # Auto detect test mode an load the correct .env file
        if os.getenv("TESTING", "False").lower() == "true":
            env_file = ".env.test"
        else:
            env_file = ".env"

@lru_cache
def get_settings():
    return Settings()

settings = get_settings()