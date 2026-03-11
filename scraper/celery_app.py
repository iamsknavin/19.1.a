"""
Celery app configuration — Phase 2E.
Background job scheduling for automated scraping and signal computation.

Setup:
  1. pip install celery redis
  2. Start Redis: docker run -d -p 6379:6379 redis:alpine
  3. Run worker:  celery -A celery_app worker --loglevel=info
  4. Run beat:    celery -A celery_app beat --loglevel=info

Environment variables (in .env):
  REDIS_URL=redis://localhost:6379/0
"""
import os

from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

app = Celery(
    "netawatch",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks"],
)

app.conf.update(
    timezone="Asia/Kolkata",
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

app.conf.beat_schedule = {
    # Weekly full scrape of MyNeta for new data
    "scrape-myneta-weekly": {
        "task": "tasks.run_myneta_scraper",
        "schedule": crontab(hour=2, minute=0, day_of_week="sunday"),
        "kwargs": {"house": "both"},
    },
    # Weekly PRS attendance update
    "scrape-prs-weekly": {
        "task": "tasks.run_prs_scraper",
        "schedule": crontab(hour=3, minute=0, day_of_week="sunday"),
    },
    # Daily signal computation (fast — no scraping)
    "compute-signals-daily": {
        "task": "tasks.compute_corruption_signals",
        "schedule": crontab(hour=4, minute=0),
    },
    # Daily Meilisearch sync
    "sync-search-daily": {
        "task": "tasks.sync_search_index",
        "schedule": crontab(hour=5, minute=0),
    },
    # Phase 3: Daily news controversy scan
    "scrape-news-daily": {
        "task": "tasks.scrape_controversies",
        "schedule": crontab(hour=6, minute=0),
    },
    # Phase 3: Weekly eCourts case status update
    "scrape-ecourts-weekly": {
        "task": "tasks.update_ecourts_status",
        "schedule": crontab(hour=7, minute=0, day_of_week="sunday"),
    },
    # Phase 3: Monthly MPLAD fund utilization
    "scrape-mplad-monthly": {
        "task": "tasks.scrape_mplad_funds",
        "schedule": crontab(hour=8, minute=0, day_of_month="1"),
    },
}
