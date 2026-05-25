from celery import Celery
from app.config import settings

celery_app = Celery(
    "pesaplan",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.worker.tasks"],
)

celery_app.config.update(
    task_serializer="json",
    result_expires=3600,
    taks_acks_late=True,
    worker_prefetch_multiplier=1,
)