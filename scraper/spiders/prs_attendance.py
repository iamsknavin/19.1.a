"""
PRS Legislative Research Attendance Spider — Phase 2.
Scrapes prsindia.org/mptrack for parliamentary performance data.

Usage:
  scrapy crawl prs_attendance                    # 18th Lok Sabha (default)
  scrapy crawl prs_attendance -a dry_run=true    # dry run
  scrapy crawl prs_attendance -a limit=10        # test with 10 MPs

Data extracted per MP:
  - Overall attendance %
  - Debates participated
  - Questions asked
  - Private member bills introduced
"""
import re
import logging
from typing import Any, Generator
from urllib.parse import urljoin

import scrapy
from scrapy.http import Response

logger = logging.getLogger(__name__)

PRS_BASE = "https://prsindia.org"
LIST_URL = f"{PRS_BASE}/mptrack?slug1=18th-lok-sabha&page=1&per-page=9"


class PrsAttendanceSpider(scrapy.Spider):
    """Scrapes PRS India MP Track for parliamentary performance data."""

    name = "prs_attendance"
    allowed_domains = ["prsindia.org"]
    custom_settings = {
        "DOWNLOAD_DELAY": 1.5,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 2,
        "DEPTH_LIMIT": 0,
    }

    def __init__(self, dry_run: str = "false", limit: str = "0", **kwargs):
        super().__init__(**kwargs)
        self.dry_run = dry_run.lower() == "true"
        self.limit = int(limit)
        self._count = 0

    def start_requests(self):
        yield scrapy.Request(LIST_URL, callback=self.parse_list, meta={"page": 1})

    def parse_list(self, response: Response) -> Generator:
        """Parse MP list page. Extract links to individual MP pages."""
        # Find all MP profile links: /mptrack/18th-lok-sabha/mp-slug
        # Each MP has 2 links (image + text) — collect name from text link
        mp_data = {}  # href → name
        for link in response.css("a[href*='/mptrack/18th-lok-sabha/']"):
            href = link.attrib.get("href", "")
            if not href or href.rstrip("/") == "/mptrack/18th-lok-sabha":
                continue
            name = link.css("::text").get("").strip()
            if name and len(name) >= 3:
                mp_data[href] = name
            elif href not in mp_data:
                mp_data[href] = ""  # placeholder for image-only link

        for href, name in mp_data.items():
            if not name:
                continue
            if self.limit and self._count >= self.limit:
                return

            url = urljoin(PRS_BASE, href)
            yield scrapy.Request(
                url,
                callback=self.parse_mp_page,
                meta={"mp_name": name, "prs_url": url},
            )
            self._count += 1

        # Follow pagination: ul.pagination li a
        current_page = response.meta.get("page", 1)
        next_page = current_page + 1
        # Look for next page link in pagination
        next_link = None
        for a in response.css("ul.pagination li a, li.next a, a.page-link"):
            href = a.attrib.get("href", "")
            text = a.css("::text").get("").strip().lower()
            if "next" in text or f"page={next_page}" in href:
                next_link = href
                break

        if not next_link:
            # Construct next page URL directly
            next_link = f"/mptrack?slug1=18th-lok-sabha&page={next_page}&per-page=9"
            # Only follow if we found MPs on current page
            if not seen_hrefs:
                next_link = None

        if next_link and (not self.limit or self._count < self.limit):
            yield scrapy.Request(
                urljoin(PRS_BASE, next_link),
                callback=self.parse_list,
                meta={"page": next_page},
            )

    def parse_mp_page(self, response: Response) -> dict[str, Any] | None:
        """Parse individual MP page for attendance and performance data."""
        mp_name = response.meta.get("mp_name", "")
        prs_url = response.meta.get("prs_url", response.url)

        # Normalize whitespace for reliable regex matching
        raw_text = " ".join(response.css("::text").getall())
        text = re.sub(r"\s+", " ", raw_text)

        # Extract constituency and state
        constituency = None
        state = None
        const_match = re.search(
            r"(?:constituency)[:\s]+([A-Za-z\s\-\.]+?)(?:\s*[\(,]|State|Party|$)",
            text, re.IGNORECASE
        )
        if const_match:
            constituency = const_match.group(1).strip().upper()
        state_match = re.search(
            r"(?:state)[:\s]+([A-Za-z\s\-\.&]+?)(?:\s*[\(,]|Constituency|Party|$)",
            text, re.IGNORECASE
        )
        if state_match:
            state = state_match.group(1).strip()

        # PRS format: "Label Selected MP VALUE National Average ..."
        attendance_pct = self._extract_float(
            text, r"Attendance\s+Selected\s+MP\s+(\d+(?:\.\d+)?)\s*%"
        )
        debates = self._extract_int(
            text, r"No\.?\s*of\s*Debates\s+Selected\s+MP\s+(\d+)"
        )
        questions = self._extract_int(
            text, r"No\.?\s*of\s*Questions\s+Selected\s+MP\s+(\d+)"
        )
        bills = self._extract_int(
            text, r"Private\s+Member.?s?\s+Bills?\s+Selected\s+MP\s+(\d+)"
        )

        item = {
            "item_type": "attendance",
            "mp_name": mp_name,
            "constituency": constituency,
            "state": state,
            "session_name": "18th Lok Sabha",
            "session_year": 2024,
            "debates_participated": debates,
            "questions_asked": questions,
            "bills_introduced": bills,
            "attendance_percent": attendance_pct,
            "source_url": prs_url,
        }

        if self.dry_run:
            logger.info(
                f"[DRY RUN] {mp_name} | Attendance: {attendance_pct}% | "
                f"Debates: {debates} | Questions: {questions} | Bills: {bills}"
            )
        else:
            logger.info(
                f"✅ PRS: {mp_name} | Attendance: {attendance_pct}% | "
                f"Debates: {debates} | Questions: {questions}"
            )

        return item

    def _extract_int(self, text: str, pattern: str) -> int | None:
        """Extract an integer from text using regex."""
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return int(match.group(1))
            except (ValueError, IndexError):
                pass
        return None

    def _extract_float(self, text: str, pattern: str) -> float | None:
        """Extract a float from text using regex."""
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except (ValueError, IndexError):
                pass
        return None
