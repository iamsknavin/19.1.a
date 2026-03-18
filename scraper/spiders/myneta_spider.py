"""
MyNeta Spider for 19.1.a.

Scrapes myneta.info for Lok Sabha, Rajya Sabha, and State Assembly (Vidhan Sabha) data.
Extracts: name, party, constituency, state, house, assets, liabilities,
          criminal cases, profile photo.

Usage:
  scrapy crawl myneta                              # both LS+RS, winners only (default)
  scrapy crawl myneta -a house=lok_sabha           # Lok Sabha only
  scrapy crawl myneta -a house=rajya_sabha         # Rajya Sabha only
  scrapy crawl myneta -a house=vidhan_sabha        # ALL state assemblies (MLAs)
  scrapy crawl myneta -a house=vidhan_sabha -a state=Maharashtra  # single state
  scrapy crawl myneta -a all_candidates=true       # scrape ALL candidates (won + lost)
  scrapy crawl myneta -a dry_run=true              # dry run (no DB writes)
  scrapy crawl myneta -a limit=10                  # stop after 10 politicians (testing)

Rate limiting: 1.5s delay between requests (see settings.py).
Respects robots.txt. Rotates user agents.

If rate-limited by MyNeta:
  1. Increase DOWNLOAD_DELAY to 3 in settings.py
  2. Set HTTPCACHE_ENABLED=True in settings.py to cache responses
  3. Add proxy rotation: pip install scrapy-rotating-proxies
"""
import re
import logging
from typing import Any, Generator
from urllib.parse import urljoin

import scrapy
from scrapy.http import Response
from scrapy.exceptions import CloseSpider

from parsers.assets_parser import parse_assets_table, parse_amount
from parsers.cases_parser import parse_case_row, parse_ipc_sections

logger = logging.getLogger(__name__)

# MyNeta election URLs
# NOTE: MyNeta has no current Rajya Sabha page (rajyasabha2024 is 404).
# RS members are elected by state legislatures, not directly by voters,
# so MyNeta doesn't track them. RS data needs a different source (Sansad.in).
ELECTION_URLS = {
    "lok_sabha": "https://www.myneta.info/LokSabha2024/",
}

DECLARATION_YEARS = {
    "lok_sabha": 2024,
}

# State assembly elections — recent winners pages
# URL pattern: myneta.info/{State}{Year}/index.php?action=show_winners&sort=default
VIDHAN_SABHA_ELECTIONS = {
    "Maharashtra": 2024,
    "Jharkhand": 2024,
    "Haryana": 2024,
    "Jammu_And_Kashmir": 2024,
    "Rajasthan": 2023,
    "Madhya_Pradesh": 2023,
    "Chhattisgarh": 2023,
    "Telangana": 2023,
    "Mizoram": 2023,
    "Gujarat": 2022,
    "Himachal_Pradesh": 2022,
    "Punjab": 2022,
    "Uttarakhand": 2022,
    "Goa": 2022,
    "Uttar_Pradesh": 2022,
    "Manipur": 2022,
    "West_Bengal": 2021,
    "Tamil_Nadu": 2021,
    "Kerala": 2021,
    "Assam": 2021,
    "Bihar": 2025,
    "Delhi": 2025,
}


def slugify(text: str, suffix: str = "") -> str:
    """Convert name to URL slug."""
    base = (
        text.lower()
        .strip()
        .encode("ascii", "ignore")
        .decode("ascii")
        .replace("'", "")
        .replace(".", "")
    )
    base = re.sub(r"[^a-z0-9\s-]", "", base)
    base = re.sub(r"\s+", "-", base)
    base = re.sub(r"-+", "-", base).strip("-")

    if suffix:
        suf = re.sub(r"[^a-z0-9-]", "-", suffix.lower().strip())
        suf = re.sub(r"-+", "-", suf).strip("-")
        return f"{base}-{suf}"
    return base


class MyNetaSpider(scrapy.Spider):
    """Spider for scraping MyNeta.info politician profiles."""

    name = "myneta"
    allowed_domains = ["myneta.info", "www.myneta.info"]
    custom_settings = {
        "DOWNLOAD_DELAY": 1.5,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 1,
    }

    def __init__(
        self,
        house: str = "both",
        dry_run: str = "false",
        limit: str = "0",
        all_candidates: str = "false",
        state: str = "",
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.target_house = house.lower()
        self.dry_run = dry_run.lower() == "true"
        self.limit = int(limit)
        self.winners_only = all_candidates.lower() != "true"
        self.target_state = state  # for vidhan_sabha: specific state filter
        self._count = 0
        self._seen_slugs: set[str] = set()

        if self.dry_run:
            logger.info("🔍 DRY RUN — data will be logged but not saved to DB")
        mode = "winners only" if self.winners_only else "all candidates"
        logger.info(f"Targeting: {self.target_house} | Mode: {mode} | Limit: {self.limit or 'none'}")

    def start_requests(self):
        """Start from the election index pages."""
        if self.target_house in ("lok_sabha", "both"):
            yield scrapy.Request(
                ELECTION_URLS["lok_sabha"],
                callback=self.parse_index,
                meta={"house": "lok_sabha"},
                dont_filter=True,
            )

        if self.target_house in ("rajya_sabha", "both"):
            yield scrapy.Request(
                ELECTION_URLS["rajya_sabha"],
                callback=self.parse_index,
                meta={"house": "rajya_sabha"},
                dont_filter=True,
            )

        if self.target_house in ("vidhan_sabha", "all"):
            for state_key, year in VIDHAN_SABHA_ELECTIONS.items():
                if self.target_state and state_key.lower().replace("_", "") != self.target_state.lower().replace("_", ""):
                    continue
                # Use base index page (not show_winners which uses JS obfuscation)
                url = f"https://www.myneta.info/{state_key}{year}/"
                yield scrapy.Request(
                    url,
                    callback=self.parse_index,
                    meta={"house": "vidhan_sabha", "vs_state": state_key.replace("_", " "), "vs_year": year},
                    dont_filter=True,
                )

    def parse_index(self, response: Response) -> Generator:
        """
        Parse the election index page.
        Finds all state/constituency links and follows them.
        Tries to extract election result (Won/Lost) from listing tables.
        """
        house = response.meta["house"]
        logger.info(f"Parsing index for {house}: {response.url}")

        # MyNeta index has table with state links
        # Try to find all candidate links directly or state sub-pages
        # Also try to capture election result from the listing table
        candidate_links = self._extract_candidate_links_with_result(response)

        if candidate_links:
            for href, election_result in candidate_links:
                if self._at_limit():
                    return
                url = urljoin(response.url, href)
                yield scrapy.Request(
                    url,
                    callback=self.parse_candidate,
                    meta={"house": house, "source_url": url, "election_result": election_result},
                )
        else:
            # Need to follow state links first
            state_links = response.css(
                "a[href*='state_id'], a[href*='show_winners'], a[href*='show_candidates']"
            ).css("::attr(href)").getall()

            # Also try table rows with state names
            if not state_links:
                state_links = response.css(
                    "table a[href*='index.php']::attr(href)"
                ).getall()

            logger.info(f"Found {len(state_links)} state links for {house}")

            for href in set(state_links):
                url = urljoin(response.url, href)
                yield scrapy.Request(
                    url,
                    callback=self.parse_state_page,
                    meta={"house": house},
                )

    def parse_state_page(self, response: Response) -> Generator:
        """Parse a state listing page and follow candidate links."""
        house = response.meta["house"]

        if self._at_limit():
            raise CloseSpider(reason=f"Reached limit of {self.limit} politicians")

        candidate_links = self._extract_candidate_links_with_result(response)
        logger.debug(f"State page {response.url}: found {len(candidate_links)} candidates")

        for href, election_result in candidate_links:
            if self._at_limit():
                return
            url = urljoin(response.url, href)
            yield scrapy.Request(
                url,
                callback=self.parse_candidate,
                meta={"house": house, "source_url": url, "election_result": election_result},
            )

    def parse_candidate(self, response: Response) -> dict[str, Any] | None:
        """
        Parse a single candidate profile page on MyNeta.

        MyNeta candidate pages have:
        - Header with name, party, constituency
        - Assets table (movable + immovable)
        - Liabilities section
        - Criminal cases table
        - Personal details (DOB, education, PAN)
        """
        house = response.meta.get("house", "lok_sabha")
        source_url = response.meta.get("source_url", response.url)

        # --- Extract basic info ---
        # Primary: parse title (most reliable for MyNeta — always present)
        # Title format: "Name(Party):Constituency- CONST(STATE) - Affidavit..."
        title_data = self._parse_title(response)
        name = title_data.get("name") or self._extract_name(response)
        if not name:
            logger.warning(f"Could not extract name from {response.url}")
            return None

        party_name = title_data.get("party") or self._extract_party(response)
        constituency = title_data.get("constituency") or self._extract_constituency(response)
        state = title_data.get("state") or self._extract_state(response)

        # Generate unique slug
        slug = self._unique_slug(name, constituency)

        # --- Extract assets ---
        assets = self._extract_assets(response)

        # --- Extract criminal cases ---
        criminal_cases = self._extract_criminal_cases(response)

        # --- Extract profile image ---
        profile_image_url = self._extract_profile_image(response)

        # --- Extract personal details ---
        personal = self._extract_personal_details(response)

        # Determine election result from listing page or candidate page
        election_result = response.meta.get("election_result", "candidate")

        # Build item
        item = {
            "item_type": "politician",
            "name": name,
            "slug": slug,
            "party_name": party_name,
            "constituency": constituency,
            "state": state,
            "house": house,
            "is_active": True,
            "election_status": election_result,
            "profile_image_url": profile_image_url,
            "assets": assets,
            "criminal_cases": criminal_cases,
            "declaration_year": response.meta.get("vs_year") or DECLARATION_YEARS.get(house, 2024),
            "source_url": source_url,
            **personal,
        }

        self._count += 1
        if self._count % 50 == 0:
            logger.info(f"Progress: {self._count} politicians scraped")

        return item

    # --- Private extraction helpers ---

    def _parse_title(self, response: Response) -> dict[str, str | None]:
        """
        Parse name, party, constituency, and state from the MyNeta page title.

        Title format: "Name(Party):Constituency- CONST(STATE) - Affidavit Information of Candidate:"
        Examples:
          "Amit Shah(Bharatiya Janata Party(BJP)):Constituency- GANDHINAGAR(GUJARAT) - Affidavit..."
          "Sanjay (Kaka) Patil(Bharatiya Janata Party(BJP)):Constituency- SANGLI(MAHARASHTRA) - ..."
          "Rahul Gandhi(Indian National Congress(INC)):Constituency- WAYANAD(KERALA) - ..."
        """
        result: dict[str, str | None] = {
            "name": None, "party": None, "constituency": None, "state": None
        }
        title = response.css("title::text").get("").strip()
        if not title:
            return result

        # Split on ":Constituency-" to separate "Name(Party)" from "CONST(STATE) - ..."
        split_match = re.split(r":Constituency[-\s]+", title, maxsplit=1, flags=re.IGNORECASE)
        if len(split_match) < 2:
            return result

        left_part, right_part = split_match[0], split_match[1]

        # Find the outermost "(" from the right in left_part — separates Name from Party.
        # Scan right-to-left: ')' increases depth, '(' decreases depth.
        # The outermost '(' is when depth returns to 0 (matching the last ')').
        depth = 0
        party_start = -1
        for i in range(len(left_part) - 1, -1, -1):
            c = left_part[i]
            if c == ")":
                depth += 1
            elif c == "(":
                depth -= 1
                if depth == 0:  # Found the outermost opener
                    party_start = i
                    break

        if party_start > 0:
            result["name"] = left_part[:party_start].strip()
            # Party is between the outermost '(' and the trailing ')'
            party_raw = left_part[party_start + 1:].strip()
            if party_raw.endswith(")"):
                party_raw = party_raw[:-1]
            result["party"] = party_raw.strip()

        # Parse constituency and state from right_part: "CONST(STATE) - Affidavit..."
        # SC/ST reserved seats have format: "CONST (SC)(STATE)" or "CONST(SC)(STATE)"
        # Use findall to get ALL parenthesized groups, then pick the last one as state
        const_match = re.match(r"\s*([^(]+)", right_part)
        paren_groups = re.findall(r"\(([^)]+)\)", right_part)
        if const_match and paren_groups:
            result["constituency"] = const_match.group(1).strip()
            # Last parenthesized group before " - Affidavit" is the state
            # Skip SC/ST markers — the actual state is always the last group
            state_candidate = paren_groups[-1].strip()
            # If last group looks like a suffix (e.g., from "Affidavit..."), use second-to-last
            if "affidavit" in state_candidate.lower() or "criminal" in state_candidate.lower():
                if len(paren_groups) >= 2:
                    state_candidate = paren_groups[-2].strip()
            result["state"] = state_candidate

        return result

    def _extract_name(self, response: Response) -> str | None:
        """
        Extract politician name from page HTML (fallback if _parse_title fails).
        Note: _parse_title() is the primary source and handles MyNeta's title format.
        """
        # Try common MyNeta CSS selectors for the name heading
        selectors = [
            "h1.cand-name::text",
            "h2.cand-name::text",
            "div.cand-name h1::text",
            "div.cand-name h2::text",
            "#main-content h1::text",
            "h1::text",
        ]
        for sel in selectors:
            name = response.css(sel).get()
            if name:
                name = name.strip()
                # Strip anything after " - " (subtitle / site name)
                name = re.sub(r"\s*-\s*myneta.*", "", name, flags=re.IGNORECASE)
                name = re.sub(r"\s*\|\s*.*", "", name)
                if name and len(name) > 2:
                    return name

        # Breadcrumb fallback
        breadcrumb = response.css("div.breadcrumb a::text, nav a::text").getall()
        for crumb in reversed(breadcrumb):
            if len(crumb.strip()) > 3:
                return crumb.strip()

        return None

    def _extract_party(self, response: Response) -> str | None:
        """Extract party name."""
        selectors = [
            "span.party::text",
            "div.party::text",
            "td.party::text",
            "span[class*='party']::text",
        ]
        for sel in selectors:
            party = response.css(sel).get()
            if party and party.strip():
                return party.strip()

        # Look in table rows
        for row in response.css("table tr"):
            label = row.css("td:first-child::text").get("").lower()
            if "party" in label:
                value = row.css("td:last-child::text").get()
                if value:
                    return value.strip()

        return None

    def _extract_constituency(self, response: Response) -> str | None:
        """Extract constituency name."""
        selectors = [
            "span.constituency::text",
            "div.constituency::text",
        ]
        for sel in selectors:
            val = response.css(sel).get()
            if val:
                return val.strip()

        for row in response.css("table tr"):
            label = row.css("td:first-child::text").get("").lower()
            if "constituency" in label:
                value = row.css("td:last-child::text").get()
                if value:
                    return value.strip()

        return None

    def _extract_state(self, response: Response) -> str | None:
        """Extract state name."""
        for row in response.css("table tr"):
            label = row.css("td:first-child::text").get("").lower()
            if "state" in label:
                value = row.css("td:last-child::text").get()
                if value:
                    return value.strip()

        # Try from page title or breadcrumbs
        title = response.css("title::text").get("")
        state_match = re.search(r"from\s+([A-Z][a-zA-Z\s]+)", title)
        if state_match:
            return state_match.group(1).strip()

        return None

    def _extract_assets(self, response: Response) -> dict[str, Any]:
        """Extract assets table data.

        MyNeta asset tables have columns:
            Sr No | Description | Self | Spouse | HUF | Dependent1 | ...
        We need column 1 (description) as label and column 2 (self) as value.
        Some tables also have a summary row like "Gross Total Value" at the end.
        """
        rows = []

        # MyNeta assets are in a table — find by looking for "Movable Assets" header
        for table in response.css("table"):
            table_text = table.get().lower()
            if "movable" in table_text or "immovable" in table_text:
                for tr in table.css("tr"):
                    cells = tr.css("td")
                    if len(cells) >= 3:
                        # Multi-column: Sr No | Description | Self | Spouse | ...
                        # Use description (col 1) as label, self (col 2) as value
                        label = " ".join(cells[1].css("::text").getall()).strip()
                        value = " ".join(cells[2].css("::text").getall()).strip()
                        if label and value:
                            rows.append({"label": label, "value": value})
                    elif len(cells) == 2:
                        # Two-column summary row: Label | Value
                        label = " ".join(cells[0].css("::text").getall()).strip()
                        value = " ".join(cells[1].css("::text").getall()).strip()
                        if label and value:
                            rows.append({"label": label, "value": value})

        # Also grab the summary table that shows "Assets: Rs X" and "Liabilities: Rs Y"
        for table in response.css("table"):
            table_text = table.get().lower()
            if "assets" in table_text and "liabilit" in table_text and "movable" not in table_text:
                for tr in table.css("tr"):
                    cells = tr.css("td")
                    if len(cells) == 2:
                        label = " ".join(cells[0].css("::text").getall()).strip()
                        value = " ".join(cells[1].css("::text").getall()).strip()
                        if label and value and ("Rs" in value or "Nil" in value):
                            rows.append({"label": label, "value": value})

        if not rows:
            # Fallback: look for Rs. values in any table
            for table in response.css("table"):
                for tr in table.css("tr"):
                    cells = tr.css("td")
                    if len(cells) >= 2:
                        label = " ".join(cells[0].css("::text").getall()).strip()
                        value_text = " ".join(cells[-1].css("::text").getall()).strip()
                        if "Rs" in value_text or "₹" in value_text:
                            rows.append({"label": label, "value": value_text})

        assets = parse_assets_table(rows)

        # Try to also extract summary figures directly from page text
        # Some pages show "Total Assets: Rs. X" prominently
        full_text = " ".join(response.css("::text").getall())
        if "net_worth" not in assets or assets.get("net_worth") is None:
            net_worth_match = re.search(
                r"net\s*worth[:\s]*(?:Rs\.?\s*)?([\d,]+(?:\.\d+)?)",
                full_text,
                re.IGNORECASE,
            )
            if net_worth_match:
                assets["net_worth"] = parse_amount(net_worth_match.group(1))

        # Compute net worth from total_assets - total_liabilities if missing
        if "net_worth" not in assets or assets.get("net_worth") is None:
            ta = assets.get("total_assets")
            tl = assets.get("total_liabilities", 0)
            if ta is not None:
                assets["net_worth"] = ta - (tl or 0)

        return assets

    # Column header keywords → field name mapping for criminal case tables
    _CASE_HEADER_MAP = {
        "ipc": "ipc_sections_raw",
        "section": "ipc_sections_raw",
        "act": "ipc_sections_raw",
        "court": "court_name",
        "case no": "case_number",
        "case number": "case_number",
        "fir no": "case_number",
        "fir": "case_number",
        "case type": "case_description",
        "description": "case_description",
        "details": "case_description",
        "other details": "case_description",
        "status": "status",
        "stage": "status",
        "charges framed": "_charges_framed",
        "serial": "_serial",
        "sr": "_serial",
        "penalty": "_penalty",
        "fine": "_penalty",
        "punishment": "_penalty",
        "appeal": "_appeal",
    }

    def _detect_column_map(self, header_row) -> dict[int, str]:
        """Build column-index → field-name map from <th>/<td> header cells."""
        cells = header_row.css("th, td")
        col_map: dict[int, str] = {}
        for idx, cell in enumerate(cells):
            text = " ".join(cell.css("::text").getall()).strip().lower()
            for keyword, field in self._CASE_HEADER_MAP.items():
                if keyword in text:
                    col_map[idx] = field
                    break
        return col_map

    def _extract_criminal_cases(self, response: Response) -> list[dict]:
        """Extract criminal cases from the page using dynamic column detection."""
        cases = []
        house = response.meta.get("house", "lok_sabha")
        decl_year = response.meta.get("vs_year") or DECLARATION_YEARS.get(house, 2024)

        for table in response.css("table"):
            table_text = table.get().lower()
            if not ("criminal" in table_text or "case" in table_text or "ipc" in table_text):
                continue

            # Skip the "Other Elections" summary table which has
            # "Declared Assets | Declared Cases" — NOT actual criminal case data
            if "other election" in table_text or "declared assets" in table_text or "declared cases" in table_text:
                continue

            rows = table.css("tr")
            if not rows:
                continue

            # Detect column mapping from header row
            col_map = self._detect_column_map(rows[0])

            # Fallback: if no headers detected, use legacy positional mapping
            if not col_map:
                col_map = {0: "ipc_sections_raw", 1: "court_name", 2: "case_description", 3: "status"}

            for tr in rows[1:]:
                cells = tr.css("td")
                if len(cells) < 2:
                    continue

                all_texts = [" ".join(c.css("::text").getall()).strip() for c in cells]

                raw_case: dict[str, Any] = {
                    "source_url": response.url,
                    "declaration_year": decl_year,
                }

                for idx, text in enumerate(all_texts):
                    field = col_map.get(idx)
                    if field and not field.startswith("_"):
                        raw_case[field] = text

                # Only include rows that have IPC sections
                ipc = parse_ipc_sections(raw_case.get("ipc_sections_raw", ""))
                if ipc:
                    parsed = parse_case_row(raw_case)
                    if parsed.get("ipc_sections"):
                        cases.append(parsed)

        return cases

    def _extract_profile_image(self, response: Response) -> str | None:
        """Extract candidate profile photo URL."""
        selectors = [
            "img.cand-photo::attr(src)",
            "img.candidate-photo::attr(src)",
            "div.cand-photo img::attr(src)",
            "div.candidate-image img::attr(src)",
            "#main-content img:first-of-type::attr(src)",
        ]
        for sel in selectors:
            src = response.css(sel).get()
            if src and not src.endswith("no-photo.jpg"):
                return urljoin(response.url, src)
        return None

    def _extract_personal_details(self, response: Response) -> dict[str, Any]:
        """Extract DOB, education, PAN (last 4 digits only)."""
        details: dict[str, Any] = {}

        for table in response.css("table"):
            for tr in table.css("tr"):
                cells = tr.css("td")
                if len(cells) < 2:
                    continue
                label = cells[0].css("::text").get("").lower().strip()
                value = " ".join(cells[-1].css("::text").getall()).strip()

                if "birth" in label or "age" in label:
                    # Try to parse date
                    date_match = re.search(r"(\d{2}[/-]\d{2}[/-]\d{4})", value)
                    if date_match:
                        raw = date_match.group(1).replace("/", "-")
                        parts = raw.split("-")
                        if len(parts) == 3 and len(parts[2]) == 4:
                            try:
                                details["date_of_birth"] = f"{parts[2]}-{parts[1]}-{parts[0]}"
                            except Exception:
                                pass

                elif "education" in label or "qualification" in label:
                    details["education"] = value

                elif "pan" in label:
                    # Store only last 4 characters of PAN
                    pan_clean = re.sub(r"\s+", "", value)
                    if len(pan_clean) >= 4:
                        details["pan_card_last4"] = pan_clean[-4:]

                elif "gender" in label or "sex" in label:
                    gender = value.lower()
                    if "male" in gender or "female" in gender:
                        details["gender"] = "male" if "male" in gender else "female"

        return details

    def _unique_slug(self, name: str, constituency: str | None) -> str:
        """Generate a unique slug, appending constituency if needed."""
        base = slugify(name)
        if base not in self._seen_slugs:
            self._seen_slugs.add(base)
            return base

        # Try with constituency
        if constituency:
            slug_with_const = slugify(name, constituency)
            if slug_with_const not in self._seen_slugs:
                self._seen_slugs.add(slug_with_const)
                return slug_with_const

        # Final fallback: append counter
        counter = 2
        while True:
            candidate = f"{base}-{counter}"
            if candidate not in self._seen_slugs:
                self._seen_slugs.add(candidate)
                return candidate
            counter += 1

    def _extract_candidate_links_with_result(self, response: Response) -> list[tuple[str, str]]:
        """
        Extract candidate links and their election results from a listing page.
        MyNeta tables often have columns: S.No, Candidate, Constituency, Party, Result
        Returns list of (href, election_status) tuples where election_status is 'won', 'lost', or 'candidate'.

        When self.winners_only is True (default), only returns candidates who won.
        Use -a all_candidates=true to scrape all candidates.
        """
        results: list[tuple[str, str]] = []

        # Try to find table rows containing candidate links
        for row in response.css("table tr"):
            link = row.css("a[href*='candidate.php']::attr(href)").get()
            if not link:
                continue

            # Check for election result in the row text
            row_text = " ".join(row.css("::text").getall()).lower()
            if "won" in row_text or "winner" in row_text:
                election_result = "won"
            elif "lost" in row_text or "lose" in row_text:
                election_result = "lost"
            else:
                election_result = "candidate"

            # Skip non-winners when winners_only mode is active
            if self.winners_only and election_result != "won":
                continue

            results.append((link, election_result))

        # Fallback: if no table rows found, try plain candidate links
        # (only when not in winners_only mode, since we can't determine result)
        if not results and not self.winners_only:
            for href in response.css("a[href*='candidate.php']::attr(href)").getall():
                results.append((href, "candidate"))

        return results

    def _at_limit(self) -> bool:
        """Check if we've hit the --limit cap."""
        return self.limit > 0 and self._count >= self.limit
