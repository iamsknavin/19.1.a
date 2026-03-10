"""
GeM Government Tender Spider — Phase 2C.
Searches Government e-Marketplace for tenders linked to politician companies.

Strategy:
  1. Loads company_interests from DB (requires 2B data first)
  2. Searches GeM for matching company names/CINs
  3. Flags potential conflict-of-interest tenders

Note: GeM portal (gem.gov.in) doesn't have a public API.
      This spider uses the public search interface.
      For production, consider using the GeM API partner program.

Usage:
  scrapy crawl gem                       # all companies
  scrapy crawl gem -a limit=10           # test
  scrapy crawl gem -a dry_run=true       # preview
"""
import logging
import os
from typing import Generator
from urllib.parse import quote

import scrapy
from scrapy.http import Response

logger = logging.getLogger(__name__)

GEM_SEARCH = "https://mkp.gem.gov.in/search"


class GemSpider(scrapy.Spider):
    """Searches GeM portal for tenders involving politician-linked companies."""

    name = "gem"
    allowed_domains = ["gem.gov.in", "mkp.gem.gov.in"]
    custom_settings = {
        "DOWNLOAD_DELAY": 3.0,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 1,
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
        result = sb.table("company_interests").select(
            "id, politician_id, company_name, cin, politicians(name)"
        ).execute()

        companies = result.data or []
        if not companies:
            logger.warning(
                "No company interests in DB. Run mca21 spider first (Phase 2B)."
            )
            return

        for company in companies:
            if self.limit and self._count >= self.limit:
                return

            name = company.get("company_name", "")
            if not name:
                continue

            search_url = f"{GEM_SEARCH}?q={quote(name)}"
            yield scrapy.Request(
                search_url,
                callback=self.parse_search,
                meta={
                    "company_id": company["id"],
                    "politician_id": company["politician_id"],
                    "company_name": name,
                },
            )
            self._count += 1

    def parse_search(self, response: Response) -> Generator:
        """Parse GeM search results for matching tenders."""
        company_name = response.meta["company_name"]

        # GeM uses JS-heavy rendering — extract any available data
        for result in response.css(".product-card, .bid-card, .search-result"):
            title = result.css("h3::text, .title::text").get("").strip()
            value = result.css(".price::text, .value::text").get("").strip()
            authority = result.css(".seller::text, .authority::text").get("").strip()

            if not title:
                continue

            item = {
                "item_type": "tender",
                "politician_id": response.meta["politician_id"],
                "company_id": response.meta["company_id"],
                "tender_title": title,
                "tendering_authority": authority,
                "contract_value": self._parse_value(value),
                "source": "gem",
                "source_url": response.url,
                "conflict_of_interest_flag": True,
            }

            if self.dry_run:
                logger.info(f"[DRY RUN] {company_name} → {title}")

            yield item

    @staticmethod
    def _parse_value(text: str) -> float | None:
        """Parse contract value from text like '₹12,50,000'."""
        import re
        nums = re.sub(r"[^\d.]", "", text)
        try:
            return float(nums) if nums else None
        except ValueError:
            return None
