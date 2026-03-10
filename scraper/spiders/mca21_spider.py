"""
MCA21 Company Interests Spider — Phase 2B.
Looks up politician-linked companies via Ministry of Corporate Affairs data.

Strategy:
  1. Fetches all politicians from DB
  2. Searches for director records matching politician names
  3. Extracts company details (CIN, role, status)
  4. Cross-references with government tenders for conflict detection

Note: MCA21 portal requires captcha for direct access.
      This spider uses OpenCorporates API as a fallback when configured.
      Set OPENCORPORATES_API_KEY in .env for live data.

Usage:
  scrapy crawl mca21                     # all politicians
  scrapy crawl mca21 -a limit=10         # test with 10
  scrapy crawl mca21 -a dry_run=true     # preview only
"""
import logging
import os
import re
from typing import Any, Generator
from urllib.parse import quote

import scrapy
from scrapy.http import Response

logger = logging.getLogger(__name__)

OPENCORPORATES_BASE = "https://api.opencorporates.com/v0.4"


class Mca21Spider(scrapy.Spider):
    """Searches company registries for politician-linked directorships."""

    name = "mca21"
    allowed_domains = ["api.opencorporates.com"]
    custom_settings = {
        "DOWNLOAD_DELAY": 2.0,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 1,
    }

    def __init__(self, dry_run: str = "false", limit: str = "0", **kwargs):
        super().__init__(**kwargs)
        self.dry_run = dry_run.lower() == "true"
        self.limit = int(limit)
        self.api_key = os.environ.get("OPENCORPORATES_API_KEY", "")
        self._count = 0

    def start_requests(self) -> Generator:
        if not self.api_key:
            logger.warning(
                "OPENCORPORATES_API_KEY not set. "
                "Set it in .env to enable company lookups. "
                "Spider will exit."
            )
            return

        # Load politicians from DB via pipeline
        from dotenv import load_dotenv
        load_dotenv()
        from supabase import create_client

        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            logger.error("Supabase credentials not configured")
            return

        sb = create_client(url, key)
        result = sb.table("politicians").select("id, name, state").execute()

        for politician in result.data or []:
            if self.limit and self._count >= self.limit:
                return

            name = politician["name"]
            # Search OpenCorporates for officers matching this name in India
            search_url = (
                f"{OPENCORPORATES_BASE}/officers/search"
                f"?q={quote(name)}"
                f"&jurisdiction_code=in"
                f"&api_token={self.api_key}"
            )

            yield scrapy.Request(
                search_url,
                callback=self.parse_officer_search,
                meta={
                    "politician_id": politician["id"],
                    "politician_name": name,
                    "politician_state": politician.get("state"),
                },
            )
            self._count += 1

    def parse_officer_search(self, response: Response) -> Generator:
        """Parse OpenCorporates officer search results."""
        import json

        politician_id = response.meta["politician_id"]
        politician_name = response.meta["politician_name"]

        try:
            data = json.loads(response.text)
            officers = data.get("results", {}).get("officers", [])
        except (json.JSONDecodeError, AttributeError):
            logger.warning(f"Failed to parse response for {politician_name}")
            return

        for officer_data in officers:
            officer = officer_data.get("officer", {})
            company = officer.get("company", {})

            if not company.get("name"):
                continue

            item = {
                "item_type": "company_interest",
                "politician_id": politician_id,
                "politician_name": politician_name,
                "company_name": company.get("name"),
                "cin": company.get("company_number"),
                "role": officer.get("position"),
                "company_type": company.get("company_type"),
                "company_status": company.get("current_status"),
                "mca_data_url": company.get("opencorporates_url"),
            }

            if self.dry_run:
                logger.info(
                    f"[DRY RUN] {politician_name} → "
                    f"{company.get('name')} ({officer.get('position')})"
                )
            else:
                logger.info(
                    f"✅ {politician_name} → "
                    f"{company.get('name')} ({officer.get('position')})"
                )

            yield item
