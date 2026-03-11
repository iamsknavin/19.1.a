"""
MPLAD Fund Usage Spider — Phase 3C.
Scrapes MPLADS portal for MP-wise fund allocation and utilization data.

Source: mplads.gov.in — constituency-wise fund data.

Usage:
  scrapy crawl mplad                      # all Lok Sabha MPs
  scrapy crawl mplad -a limit=10          # test with 10
  scrapy crawl mplad -a dry_run=true      # preview only
"""
import logging
import os
import re
from typing import Any, Generator

import scrapy
from scrapy.http import Response

logger = logging.getLogger(__name__)

MPLAD_BASE = "https://www.mplads.gov.in"
MPLAD_SEARCH = f"{MPLAD_BASE}/MPLADS/SearchConstituencyMP.do"


class MpladSpider(scrapy.Spider):
    """Scrapes MPLADS portal for fund utilization data."""

    name = "mplad"
    allowed_domains = ["mplads.gov.in", "www.mplads.gov.in"]
    custom_settings = {
        "DOWNLOAD_DELAY": 3.0,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 1,
        "ROBOTSTXT_OBEY": True,
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
        result = sb.table("politicians").select(
            "id, name, constituency, state"
        ).eq("house", "lok_sabha").eq("is_active", True).execute()

        politicians = result.data or []
        if not politicians:
            logger.warning("No active Lok Sabha MPs in DB")
            return

        logger.info(f"Searching MPLAD data for {len(politicians)} MPs")

        for mp in politicians:
            if self.limit and self._count >= self.limit:
                return

            constituency = mp.get("constituency", "")
            state = mp.get("state", "")
            if not constituency:
                continue

            yield scrapy.FormRequest(
                MPLAD_SEARCH,
                formdata={
                    "constituency": constituency,
                    "state": state,
                },
                callback=self.parse_fund_data,
                meta={
                    "politician_id": mp["id"],
                    "politician_name": mp["name"],
                    "constituency": constituency,
                },
            )
            self._count += 1

    def parse_fund_data(self, response: Response) -> Generator:
        """Parse MPLAD fund utilization page."""
        politician_id = response.meta["politician_id"]
        politician_name = response.meta["politician_name"]

        # Look for fund tables with allocation/release/utilization data
        for table in response.css("table"):
            rows = table.css("tr")
            if len(rows) < 2:
                continue

            # Check if this is a fund data table
            header_text = " ".join(rows[0].css("::text").getall()).lower()
            if not any(kw in header_text for kw in ["allocated", "released", "utilised", "utiliz"]):
                continue

            for tr in rows[1:]:
                cells = tr.css("td")
                all_texts = [" ".join(c.css("::text").getall()).strip() for c in cells]

                if len(all_texts) < 3:
                    continue

                fund_data = self._extract_fund_row(all_texts, header_text)
                if not fund_data:
                    continue

                item = {
                    "item_type": "fund_usage",
                    "politician_id": politician_id,
                    "fund_type": "mplad",
                    "source_url": response.url,
                    **fund_data,
                }

                if self.dry_run:
                    logger.info(
                        f"[DRY RUN] {politician_name} | "
                        f"FY {fund_data.get('financial_year')} | "
                        f"Utilization: {fund_data.get('utilization_percent', 'N/A')}%"
                    )

                yield item

    def _extract_fund_row(self, texts: list[str], header: str) -> dict[str, Any] | None:
        """Extract fund data from a table row."""
        result: dict[str, Any] = {}

        # Try to detect financial year (e.g., "2023-24", "2024-25")
        for text in texts:
            fy_match = re.search(r"(\d{4})\s*[-–]\s*(\d{2,4})", text)
            if fy_match:
                result["financial_year"] = f"{fy_match.group(1)}-{fy_match.group(2)[-2:]}"
                break

        if not result.get("financial_year"):
            return None

        # Parse amounts from remaining cells
        amounts = []
        for text in texts:
            amount = self._parse_amount(text)
            if amount is not None:
                amounts.append(amount)

        if len(amounts) >= 3:
            result["total_allocated"] = amounts[0]
            result["total_released"] = amounts[1]
            result["total_utilized"] = amounts[2]
            if amounts[0] > 0:
                result["utilization_percent"] = round(amounts[2] / amounts[0] * 100, 1)
        elif len(amounts) >= 2:
            result["total_released"] = amounts[0]
            result["total_utilized"] = amounts[1]

        return result if amounts else None

    @staticmethod
    def _parse_amount(text: str) -> float | None:
        """Parse Indian currency amount from text."""
        nums = re.sub(r"[^\d.]", "", text.replace(",", ""))
        try:
            return float(nums) if nums else None
        except ValueError:
            return None
