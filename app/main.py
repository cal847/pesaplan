from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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