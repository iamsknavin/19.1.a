"""
Celery task definitions — Phase 2E + Phase 3.
Each task wraps a Scrapy spider or utility function for scheduled execution.
"""
import logging
import os
import subprocess

from celery_app import app

logger = logging.getLogger(__name__)


def _run_spider(spider_name: str, **kwargs) -> dict:
    """Run a Scrapy spider as a subprocess (avoids Twisted reactor issues)."""
    cmd = ["python", "-m", "scrapy", "crawl", spider_name]
    for k, v in kwargs.items():
        cmd.extend(["-a", f"{k}={v}"])

    logger.info(f"Running spider: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)

    return {
        "spider": spider_name,
        "returncode": result.returncode,
        "stdout_tail": result.stdout[-500:] if result.stdout else "",
        "stderr_tail": result.stderr[-500:] if result.stderr else "",
    }


@app.task(bind=True, max_retries=2, default_retry_delay=300)
def run_myneta_scraper(self, house: str = "both"):
    """Weekly: Scrape MyNeta for politician data updates."""
    try:
        return _run_spider("myneta", house=house)
    except Exception as exc:
        self.retry(exc=exc)


@app.task(bind=True, max_retries=2, default_retry_delay=300)
def run_prs_scraper(self):
    """Weekly: Scrape PRS India for attendance data."""
    try:
        return _run_spider("prs_attendance")
    except Exception as exc:
        self.retry(exc=exc)


@app.task(bind=True)
def compute_corruption_signals(self):
    """Daily: Recompute corruption signals for all politicians."""
    from dotenv import load_dotenv
    load_dotenv()
    from supabase import create_client

    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    sb = create_client(url, key)

    result = sb.table("politicians").select(
        "id, name, criminal_cases(*), attendance_records(*), assets_declarations(*)"
    ).execute()

    total = 0
    for p in result.data or []:
        signals = _compute_signals_for(p)
        if signals:
            sb.table("corruption_signals").delete().eq(
                "politician_id", p["id"]
            ).eq("auto_generated", True).execute()
            sb.table("corruption_signals").insert(signals).execute()
            total += len(signals)

    return {"politicians": len(result.data or []), "signals": total}


def _compute_signals_for(p: dict) -> list[dict]:
    """Compute corruption signals for a single politician."""
    signals = []
    pid = p["id"]
    cases = p.get("criminal_cases", [])
    attendance = p.get("attendance_records", [])

    heinous = [c for c in cases if c.get("is_heinous")]
    if heinous:
        signals.append({
            "politician_id": pid, "signal_type": "heinous_cases",
            "signal_severity": "critical",
            "signal_description": f"{len(heinous)} heinous criminal case(s) declared.",
            "evidence_links": [], "auto_generated": True,
        })

    pending = [c for c in cases if c.get("current_status") == "pending"]
    if len(pending) >= 5:
        sev = "critical" if len(pending) >= 10 else "high" if len(pending) >= 7 else "medium"
        signals.append({
            "politician_id": pid, "signal_type": "high_case_count",
            "signal_severity": sev,
            "signal_description": f"{len(pending)} pending criminal cases.",
            "evidence_links": [], "auto_generated": True,
        })

    if attendance:
        att = attendance[0]
        pct = att.get("attendance_percent")
        if pct is not None and float(pct) < 40:
            signals.append({
                "politician_id": pid, "signal_type": "low_attendance",
                "signal_severity": "high" if float(pct) < 20 else "medium",
                "signal_description": f"Parliamentary attendance at {pct}% — well below average.",
                "evidence_links": [], "auto_generated": True,
            })

    return signals


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def sync_search_index(self):
    """Daily: Sync politicians to Meilisearch."""
    import requests

    base_url = os.environ.get("NEXT_PUBLIC_URL", "http://localhost:3000")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

    try:
        resp = requests.post(
            f"{base_url}/api/sync-search",
            headers={"Authorization": f"Bearer {key}"},
            timeout=120,
        )
        return {"status": resp.status_code, "body": resp.text[:200]}
    except Exception as exc:
        self.retry(exc=exc)


# --- Phase 3 tasks ---

@app.task(bind=True, max_retries=2, default_retry_delay=300)
def scrape_controversies(self):
    """Daily: Scrape Google News for politician controversies."""
    try:
        return _run_spider("news")
    except Exception as exc:
        self.retry(exc=exc)


@app.task(bind=True, max_retries=2, default_retry_delay=300)
def update_ecourts_status(self):
    """Weekly: Poll eCourts for live case status updates."""
    try:
        return _run_spider("ecourts")
    except Exception as exc:
        self.retry(exc=exc)


@app.task(bind=True, max_retries=2, default_retry_delay=300)
def scrape_mplad_funds(self):
    """Monthly: Scrape MPLADS portal for fund utilization data."""
    try:
        return _run_spider("mplad")
    except Exception as exc:
        self.retry(exc=exc)
