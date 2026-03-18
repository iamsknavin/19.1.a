"""
Company Interests Spider — extracts govt contract declarations from MyNeta affidavits.

Strategy:
  1. Crawl MyNeta LS 2024 winner pages (same pages myneta_spider visits)
  2. Extract "Contracts with appropriate Govt" section from each affidavit
  3. Extract "Profession or Occupation" for business/directorship signals
  4. Match to our DB politicians and yield company_interest items

Most candidates declare "Nil" for contracts, but those who don't provide
real company/entity names that populate the company_interests table.

Usage:
  scrapy crawl mca21                     # all LS 2024 winners
  scrapy crawl mca21 -a limit=10         # test with 10
  scrapy crawl mca21 -a dry_run=true     # preview only
"""
import logging
import os
import re
from typing import Any, Generator
from urllib.parse import urljoin

import scrapy
from scrapy.http import Response

logger = logging.getLogger(__name__)

LS_2024_URL = "https://www.myneta.info/LokSabha2024/"


class Mca21Spider(scrapy.Spider):
    """Scrapes MyNeta affidavit pages for govt contract & business interest data."""

    name = "mca21"
    allowed_domains = ["myneta.info", "www.myneta.info"]
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
        self._politician_map: dict[str, str] = {}  # normalized name → politician_id
        self._const_map: dict[str, str] = {}  # (name, constituency) → politician_id

    def start_requests(self) -> Generator:
        # Load politicians from DB for name matching
        from dotenv import load_dotenv
        load_dotenv()
        from supabase import create_client

        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            logger.error("Supabase credentials not configured")
            return

        sb = create_client(url, key)
        result = sb.table("politicians").select("id, name, constituency").execute()

        for p in result.data or []:
            name = self._normalize(p["name"])
            self._politician_map[name] = p["id"]
            # Also store with constituency for disambiguation
            const = (p.get("constituency") or "").strip().upper()
            const = re.sub(r"\(SC\)|\(ST\)", "", const).strip()
            if const:
                self._const_map[(name, const)] = p["id"]

        logger.info(f"Loaded {len(result.data or [])} politicians for matching")

        # Start from LS 2024 index — get all winner pages
        yield scrapy.Request(LS_2024_URL, callback=self.parse_index)

    def _normalize(self, name: str) -> str:
        """Lowercase, strip titles, collapse whitespace."""
        n = name.strip().lower()
        n = re.sub(r"^(shri|smt|dr|adv|prof|justice|sri|mr|mrs|ms)\.?\s+", "", n)
        n = re.sub(r"\s+", " ", n)
        return n

    def _match_politician(self, name: str, constituency: str | None = None) -> str | None:
        """Match name to politician ID."""
        norm = self._normalize(name)
        # Exact match
        if norm in self._politician_map:
            return self._politician_map[norm]
        # With constituency
        if constituency:
            const_norm = constituency.strip().upper()
            const_norm = re.sub(r"\(SC\)|\(ST\)", "", const_norm).strip()
            pid = self._const_map.get((norm, const_norm))
            if pid:
                return pid
        # Partial match
        for db_name, pid in self._politician_map.items():
            if norm in db_name or db_name in norm:
                return pid
        return None

    def parse_index(self, response: Response) -> Generator:
        """Parse LS 2024 index — follow winner candidate links."""
        for row in response.css("table tr"):
            link = row.css("a[href*='candidate.php']::attr(href)").get()
            if not link:
                continue
            row_text = " ".join(row.css("::text").getall()).lower()
            if "won" not in row_text and "winner" not in row_text:
                continue
            if self.limit and self._count >= self.limit:
                return
            url = urljoin(response.url, link)
            yield scrapy.Request(url, callback=self.parse_candidate)
            self._count += 1

        # Also follow state/constituency sub-pages
        state_links = response.css(
            "a[href*='state_id']::attr(href), a[href*='index.php?action=show']::attr(href)"
        ).getall()
        for href in set(state_links):
            url = urljoin(response.url, href)
            yield scrapy.Request(url, callback=self.parse_state_page)

    def parse_state_page(self, response: Response) -> Generator:
        """Parse state listing page for winner links."""
        for row in response.css("table tr"):
            link = row.css("a[href*='candidate.php']::attr(href)").get()
            if not link:
                continue
            row_text = " ".join(row.css("::text").getall()).lower()
            if "won" not in row_text and "winner" not in row_text:
                continue
            if self.limit and self._count >= self.limit:
                return
            url = urljoin(response.url, link)
            yield scrapy.Request(url, callback=self.parse_candidate)
            self._count += 1

    def parse_candidate(self, response: Response) -> Generator:
        """Extract contracts and profession from a candidate affidavit page."""
        # Extract name from title
        title = response.css("title::text").get("")
        name_match = re.match(r"^([^(]+)", title)
        name = name_match.group(1).strip() if name_match else ""

        # Extract constituency from title
        const_match = re.search(r"Constituency[-\s]+([^(]+)\(", title)
        constituency = const_match.group(1).strip() if const_match else None

        if not name:
            return

        politician_id = self._match_politician(name, constituency)
        if not politician_id:
            logger.debug(f"No DB match for: {name}")
            return

        # Get full page text organized by sections
        # Look for h3 headers that indicate contracts/profession sections
        page_html = response.text

        # --- Extract "Contracts with appropriate Govt" ---
        contracts = self._extract_contracts(response, page_html)
        for contract in contracts:
            item = {
                "item_type": "company_interest",
                "politician_id": politician_id,
                "politician_name": name,
                "company_name": contract["entity"],
                "role": contract.get("role", "Government Contract"),
                "company_type": "government_contract",
                "company_status": None,
                "cin": None,
                "mca_data_url": None,
                "source_url": response.url,
            }
            if self.dry_run:
                logger.info(f"[DRY] {name} → {contract['entity']} ({contract.get('role', 'Govt Contract')})")
            else:
                logger.info(f"Found: {name} → {contract['entity']}")
            yield item

        # --- Extract profession/business info ---
        professions = self._extract_profession(response, page_html)
        for prof in professions:
            if self._is_business_profession(prof):
                item = {
                    "item_type": "company_interest",
                    "politician_id": politician_id,
                    "politician_name": name,
                    "company_name": prof,
                    "role": "Self-declared profession",
                    "company_type": "profession_declaration",
                    "company_status": None,
                    "cin": None,
                    "mca_data_url": None,
                    "source_url": response.url,
                }
                if self.dry_run:
                    logger.info(f"[DRY] {name} → Profession: {prof}")
                else:
                    logger.info(f"Profession: {name} → {prof}")
                yield item

    def _extract_contracts(self, response: Response, html: str) -> list[dict]:
        """Extract government contract declarations from TABLE#contractdetails."""
        contracts = []

        # MyNeta uses TABLE#contractdetails with inner .w3-table rows
        # Each row: <td>label</td><td><b>value</b></td>
        # Labels describe who (candidate, spouse, dependent, HUF, partnership, private co)
        contract_table = response.css("TABLE#contractdetails .w3-table tr")
        if not contract_table:
            # Fallback: try lowercase id
            contract_table = response.css("table#contractdetails .w3-table tr")

        for row in contract_table:
            cells = row.css("td")
            if len(cells) < 2:
                continue
            label = " ".join(cells[0].css("::text").getall()).strip()
            value = " ".join(cells[1].css("b::text").getall()).strip()
            if not value or self._is_nil(value):
                continue

            # Determine role from label
            role = "Government Contract"
            label_lower = label.lower()
            if "spouse" in label_lower:
                role = "Govt Contract (Spouse)"
            elif "dependent" in label_lower:
                role = "Govt Contract (Dependent)"
            elif "hindu undivided" in label_lower or "trust" in label_lower:
                role = "Govt Contract (HUF/Trust)"
            elif "partnership" in label_lower:
                role = "Govt Contract (Partnership)"
            elif "private" in label_lower:
                role = "Govt Contract (Private Company)"

            contracts.append({"entity": value, "role": role})

        return contracts

    def _extract_profession(self, response: Response, html: str) -> list[str]:
        """Extract profession/occupation from TABLE#profession."""
        professions = []

        # MyNeta uses TABLE#profession with inner .w3-table rows
        # Each row: <td>Self/Spouse</td><td><b>profession text</b></td>
        prof_table = response.css("TABLE#profession .w3-table tr")
        if not prof_table:
            prof_table = response.css("table#profession .w3-table tr")

        for row in prof_table:
            cells = row.css("td")
            if len(cells) < 2:
                continue
            label = " ".join(cells[0].css("::text").getall()).strip()
            value = " ".join(cells[1].css("b::text").getall()).strip()
            if not value or self._is_nil(value):
                continue
            # Only take "Self" profession (not spouse/dependent)
            if label.strip().lower() == "self":
                professions.append(value)

        return professions

    def _is_nil(self, text: str) -> bool:
        """Check if text is a nil/empty declaration."""
        t = text.strip().lower()
        return t in (
            "nil", "none", "not applicable", "na", "n/a", "no",
            "not any", "nill", "-", "0", "", "null", "yes",
        ) or t.startswith("nil") or t.startswith("not applicable")

    def _is_business_profession(self, prof: str) -> bool:
        """Check if a profession indicates business/directorship interests."""
        keywords = [
            "business", "director", "proprietor", "partner", "entrepreneur",
            "industrialist", "manufacturer", "trader", "merchant", "exporter",
            "importer", "contractor", "builder", "developer", "promoter",
            "chairman", "managing", "ceo", "founder", "co-founder",
            "company", "enterprise", "pvt", "ltd", "corporation",
            "firm", "industries", "ventures", "group",
        ]
        lower = prof.lower()
        return any(kw in lower for kw in keywords)
