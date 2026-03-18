"""
PRS Legislative Research Attendance Spider.
Scrapes prsindia.org/mptrack for parliamentary performance data.

Strategy:
  1. Requests all pages of PRS MP Track upfront (per-page=50)
  2. Visits each MP's individual page for detailed stats
  3. Matches MP names to our DB via the pipeline

Previous bug: per-page=9 + undefined `seen_hrefs` caused pagination
to crash after page 1, yielding only ~66 MPs. Fixed by:
  - Using per-page=50 (was 9)
  - Requesting all pages upfront instead of following pagination links
  - Tracking seen hrefs to avoid duplicates

Usage:
  scrapy crawl prs_attendance                    # 18th Lok Sabha (default)
  scrapy crawl prs_attendance -a dry_run=true    # dry run
  scrapy crawl prs_attendance -a limit=10        # test with 10 MPs
"""
import re
import logging
from typing import Any, Generator
from urllib.parse import urljoin

import scrapy
from scrapy.http import Response

logger = logging.getLogger(__name__)

PRS_BASE = "https://prsindia.org"
# PRS ignores per-page param — always returns exactly 9 MPs per page
# 543 MPs / 9 per page = 61 pages needed; use 65 for safety
LIST_URL_TPL = f"{PRS_BASE}/mptrack?slug1=18th-lok-sabha&page={{page}}"
MAX_PAGES = 65


class PrsAttendanceSpider(scrapy.Spider):
    """Scrapes PRS India MP Track for parliamentary performance data."""

    name = "prs_attendance"
    allowed_domains = ["prsindia.org"]
    custom_settings = {
        "DOWNLOAD_DELAY": 1.5,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 2,
    }

    def __init__(self, dry_run: str = "false", limit: str = "0", **kwargs):
        super().__init__(**kwargs)
        self.dry_run = dry_run.lower() == "true"
        self.limit = int(limit)
        self._count = 0
        self._seen_hrefs: set[str] = set()

    def start_requests(self):
        # Request all pages upfront — PRS serves server-rendered HTML for each page
        for page in range(1, MAX_PAGES + 1):
            if self.limit and self._count >= self.limit:
                return
            url = LIST_URL_TPL.format(page=page)
            yield scrapy.Request(url, callback=self.parse_list, meta={"page": page})

    def parse_list(self, response: Response) -> Generator:
        """Parse MP list page. Extract links to individual MP pages."""
        mp_data: dict[str, str] = {}  # href → name
        for link in response.css("a[href*='/mptrack/18th-lok-sabha/']"):
            href = link.attrib.get("href", "")
            if not href or href.rstrip("/") == "/mptrack/18th-lok-sabha":
                continue
            href = href.rstrip("/")
            name = link.css("::text").get("").strip()
            if name and len(name) >= 3:
                mp_data[href] = name
            elif href not in mp_data:
                mp_data[href] = ""

        found = 0
        for href, name in mp_data.items():
            if not name:
                continue
            if href in self._seen_hrefs:
                continue
            self._seen_hrefs.add(href)
            if self.limit and self._count >= self.limit:
                return

            url = urljoin(PRS_BASE, href)
            yield scrapy.Request(
                url,
                callback=self.parse_mp_page,
                meta={"mp_name": name, "prs_url": url},
            )
            self._count += 1
            found += 1

        page = response.meta.get("page", "?")
        logger.info(f"Page {page}: {found} new MPs (total queued: {self._count})")

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

        # Fallback patterns if PRS changed their page format
        if attendance_pct is None:
            attendance_pct = self._extract_float(
                text, r"Attendance[:\s]+(\d+(?:\.\d+)?)\s*%"
            )
        if debates is None:
            debates = self._extract_int(
                text, r"Debates?\s*(?:Participated)?[:\s]+(\d+)"
            )
        if questions is None:
            questions = self._extract_int(
                text, r"Questions?\s*(?:Asked)?[:\s]+(\d+)"
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
