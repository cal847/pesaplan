from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.config import settings
from app.database import engine, Base

from app.api.routes import auth_route
from app.api.routes import user_profile
from app.api.routes import budget_route
from app.api.routes import sms_route
from app.api.routes import merchant_route

# Creates all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)

# CORS  middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session middleware for OAuth state
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    session_cookie="oauth_session",
    max_age=3600,
    same_site="lax",
    https_only=not settings.DEBUG,
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return{
        "detail": "Internal Server Error",
        "error": str(exc) if settings.DEBUG else "Contact support"
    }

@app.get("/")
def home():
    return {"message": "Welcome, ADMIN!!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

app.include_router(auth_route.router, prefix=f"/api/{settings.APP_VERSION}/auth", tags=["Authentication"])
app.include_router(user_profile.router, prefix=f"/api/{settings.APP_VERSION}", tags=["Users"])
app.include_router(budget_route.router, prefix=f"/api/{settings.APP_VERSION}", tags=["Budget"])
app.include_router(sms_route.router, prefix=f"/api/{settings.APP_VERSION}", tags=["SMS Import"])
app.include_router(merchant_route.router, prefix=f"/api/{settings.APP_VERSION}", tags=["Merchants"])