"""
Google News RSS Controversy Spider — Phase 3A.
Searches Google News RSS feeds for politician-linked controversies.

Strategy:
  1. Loads politician names from DB
  2. Searches Google News RSS for name + controversy keywords
  3. Deduplicates by URL, classifies severity
  4. Stores in controversies table

Usage:
  scrapy crawl news                      # all politicians
  scrapy crawl news -a limit=10          # test with 10
  scrapy crawl news -a dry_run=true      # preview only
"""
import hashlib
import logging
import os
import re
from datetime import datetime
from typing import Any, Generator
from urllib.parse import quote

import scrapy
from scrapy.http import Response

logger = logging.getLogger(__name__)

GNEWS_RSS = "https://news.google.com/rss/search"

# Keywords that indicate a controversy
CONTROVERSY_KEYWORDS = [
    "scam", "arrest", "raid", "FIR", "chargesheet", "ED",
    "CBI", "corruption", "fraud", "scandal", "accused",
    "convicted", "sentenced", "money laundering", "disproportionate assets",
    "IT raid", "income tax raid", "hawala", "bribery",
]

SEVERITY_CRITICAL = {"arrest", "convicted", "sentenced", "chargesheet", "money laundering"}
SEVERITY_HIGH = {"raid", "ED", "CBI", "IT raid", "FIR", "disproportionate assets", "hawala"}
SEVERITY_MEDIUM = {"scam", "corruption", "fraud", "scandal", "accused", "bribery"}


def classify_severity(title: str, description: str) -> str:
    """Classify controversy severity from headline text."""
    combined = f"{title} {description}".lower()
    if any(kw.lower() in combined for kw in SEVERITY_CRITICAL):
        return "critical"
    if any(kw.lower() in combined for kw in SEVERITY_HIGH):
        return "high"
    if any(kw.lower() in combined for kw in SEVERITY_MEDIUM):
        return "medium"
    return "low"


def classify_type(title: str, description: str) -> str:
    """Classify controversy type from headline text."""
    combined = f"{title} {description}".lower()
    if any(w in combined for w in ["ed ", "enforcement", "money laundering", "pmla"]):
        return "ed_action"
    if any(w in combined for w in ["cbi", "central bureau"]):
        return "cbi_action"
    if any(w in combined for w in ["it raid", "income tax"]):
        return "it_raid"
    if any(w in combined for w in ["fir", "chargesheet", "arrest"]):
        return "criminal_case"
    if any(w in combined for w in ["scam", "fraud", "corruption", "bribery"]):
        return "corruption"
    if any(w in combined for w in ["scandal", "controversy"]):
        return "scandal"
    return "other"


class NewsSpider(scrapy.Spider):
    """Scrapes Google News RSS for politician-linked controversies."""

    name = "news"
    allowed_domains = ["news.google.com"]
    custom_settings = {
        "DOWNLOAD_DELAY": 2.0,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 1,
        "ROBOTSTXT_OBEY": False,  # Google News RSS doesn't need robots.txt
    }

    def __init__(self, dry_run: str = "false", limit: str = "0", **kwargs):
        super().__init__(**kwargs)
        self.dry_run = dry_run.lower() == "true"
        self.limit = int(limit)
        self._count = 0
        self._seen_urls: set[str] = set()

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

        # Load existing controversy URLs for dedup
        existing = sb.table("controversies").select("news_links").execute()
        for row in existing.data or []:
            for link in row.get("news_links") or []:
                self._seen_urls.add(link)

        # Load politicians
        result = sb.table("politicians").select("id, name").eq("is_active", True).execute()
        politicians = result.data or []
        if not politicians:
            logger.warning("No active politicians in DB")
            return

        logger.info(f"Searching news for {len(politicians)} politicians")

        for politician in politicians:
            if self.limit and self._count >= self.limit:
                return

            name = politician["name"]
            # Build search query: politician name + controversy keywords
            keywords = " OR ".join(CONTROVERSY_KEYWORDS[:6])  # Top keywords
            query = f'"{name}" ({keywords})'
            rss_url = f"{GNEWS_RSS}?q={quote(query)}&hl=en-IN&gl=IN&ceid=IN:en"

            yield scrapy.Request(
                rss_url,
                callback=self.parse_rss,
                meta={
                    "politician_id": politician["id"],
                    "politician_name": name,
                },
            )
            self._count += 1

    def parse_rss(self, response: Response) -> Generator:
        """Parse Google News RSS feed for controversy items."""
        politician_id = response.meta["politician_id"]
        politician_name = response.meta["politician_name"]

        items = response.css("item")
        if not items:
            return

        for item_el in items[:5]:  # Max 5 per politician
            title = item_el.css("title::text").get("").strip()
            link = item_el.css("link::text").get("").strip()
            # Google News RSS has link as text node after <link> tag
            if not link:
                link = item_el.css("link").xpath("following-sibling::text()").get("").strip()
            pub_date = item_el.css("pubDate::text").get("").strip()
            source = item_el.css("source::text").get("").strip()
            description = item_el.css("description::text").get("").strip()

            if not title or not link:
                continue

            # Deduplicate
            if link in self._seen_urls:
                continue
            self._seen_urls.add(link)

            # Verify politician name actually appears in the title/description
            name_parts = politician_name.lower().split()
            combined_text = f"{title} {description}".lower()
            if not any(part in combined_text for part in name_parts if len(part) > 2):
                continue

            severity = classify_severity(title, description)
            controversy_type = classify_type(title, description)

            parsed_date = None
            if pub_date:
                try:
                    parsed_date = datetime.strptime(
                        pub_date, "%a, %d %b %Y %H:%M:%S %Z"
                    ).strftime("%Y-%m-%d")
                except ValueError:
                    pass

            item = {
                "item_type": "controversy",
                "politician_id": politician_id,
                "title": title[:500],
                "description": re.sub(r"<[^>]+>", "", description)[:1000] if description else None,
                "controversy_type": controversy_type,
                "severity": severity,
                "date_of_incident": parsed_date,
                "news_links": [link],
                "news_source": source,
                "is_verified": False,
                "is_active": True,
            }

            if self.dry_run:
                logger.info(
                    f"[DRY RUN] {politician_name} | [{severity}] {title[:80]}"
                )

            yield item
