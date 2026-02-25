from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
import os

class Settings(BaseSettings):
    """Application Configurations"""
    
    # App Settings
    APP_NAME: str = "PesaPlan"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    TESTING: bool = False
    
    # JWT Token Configuration
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    
    # Database Configuration
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: Optional[str] = None
    
    #CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:19006",
        "http://localhost:8000"
    ]
    
    # Email Configuration
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: Optional[str] = None
    
    # OAuth Configuration
    GOOGLE_CLIENT_ID = Optional[str] = None
    GOOGLE_CLIENT_SECRET = Optional[str] = None
    GITHUB_CLIENT_ID = Optional[str] = None
    GITHUB_CLIENT_ID = Optional[str] = None
    
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