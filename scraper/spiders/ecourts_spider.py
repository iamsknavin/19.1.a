"""
eCourts Case Status Spider — Phase 3B.
Polls eCourts India for live case status updates on existing criminal cases.

Strategy:
  1. Loads criminal cases with case_number from DB
  2. Searches eCourts Services API by case number
  3. Updates existing criminal_cases with live status, next hearing date

Note: eCourts is JS-heavy. This spider uses the services API endpoint
      which returns HTML fragments suitable for scraping.

Usage:
  scrapy crawl ecourts                    # all cases
  scrapy crawl ecourts -a limit=10        # test with 10
  scrapy crawl ecourts -a dry_run=true    # preview only
"""
import logging
import os
import re
from typing import Generator
from urllib.parse import urlencode

import scrapy
from scrapy.http import Response

logger = logging.getLogger(__name__)

ECOURTS_BASE = "https://services.ecourts.gov.in/ecourtindia_v6"


class ECourtsSpider(scrapy.Spider):
    """Searches eCourts for live status of existing criminal cases."""

    name = "ecourts"
    allowed_domains = ["services.ecourts.gov.in", "ecourts.gov.in"]
    custom_settings = {
        "DOWNLOAD_DELAY": 5.0,  # Respectful delay for government portal
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 1,
        "ROBOTSTXT_OBEY": True,
        "DEFAULT_REQUEST_HEADERS": {
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-IN,en;q=0.9",
        },
    }

    def __init__(self, dry_run: str = "false", limit: str = "0", **kwargs):
        super().__init__(**kwargs)
        self.dry_run = dry_run.lower() == "true"
        self.limit = int(limit)
        self._count = 0

    def start_requests(self) -> Generator:
        from dotenv import load_dotenv
        load_dotenv()
        from supabase import create_client

        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            logger.error("Supabase credentials not configured")
            return

        sb = create_client(url, key)
        result = sb.table("criminal_cases").select(
            "id, politician_id, case_number, court_name, current_status"
        ).not_.is_("case_number", "null").execute()

        cases = result.data or []
        if not cases:
            logger.warning("No criminal cases with case numbers in DB")
            return

        logger.info(f"Checking eCourts status for {len(cases)} cases")

        for case in cases:
            if self.limit and self._count >= self.limit:
                return

            case_number = case.get("case_number", "").strip()
            if not case_number:
                continue

            # Search eCourts by case number
            params = urlencode({"q": case_number})
            search_url = f"{ECOURTS_BASE}/casestatus/?{params}"

            yield scrapy.Request(
                search_url,
                callback=self.parse_case_status,
                meta={
                    "case_id": case["id"],
                    "politician_id": case["politician_id"],
                    "case_number": case_number,
                    "old_status": case.get("current_status"),
                },
                errback=self.handle_error,
            )
            self._count += 1

    def parse_case_status(self, response: Response) -> Generator:
        """Parse eCourts case status page."""
        from parsers.ecourts_parser import parse_ecourts_response

        case_id = response.meta["case_id"]
        case_number = response.meta["case_number"]

        parsed = parse_ecourts_response(response)
        if not parsed:
            logger.debug(f"No eCourts data found for {case_number}")
            return

        item = {
            "item_type": "ecourts_update",
            "case_id": case_id,
            "politician_id": response.meta["politician_id"],
            "case_number": case_number,
            "ecourts_case_id": parsed.get("ecourts_case_id"),
            "current_status": parsed.get("status"),
            "next_hearing_date": parsed.get("next_hearing_date"),
            "last_hearing_date": parsed.get("last_hearing_date"),
            "judge_name": parsed.get("judge_name"),
            "court_name": parsed.get("court_name"),
        }

        if self.dry_run:
            logger.info(
                f"[DRY RUN] {case_number} → "
                f"status={parsed.get('status')}, "
                f"next_hearing={parsed.get('next_hearing_date')}"
            )

        yield item

    def handle_error(self, failure):
        """Handle request failures gracefully."""
        case_number = failure.request.meta.get("case_number", "unknown")
        logger.warning(f"Failed to fetch eCourts for {case_number}: {failure.value}")
