"""
eCourts Case Status Spider — Playwright + Captcha OCR.
Polls eCourts India for live case status updates on existing criminal cases.

Strategy:
  1. Loads criminal cases with case_number + state from DB
  2. Uses Playwright to navigate eCourts (JS-rendered portal)
  3. Solves captcha using ddddocr (local OCR, no external service)
  4. Parses case status results and updates criminal_cases in Supabase

Requirements:
  pip install playwright ddddocr
  python -m playwright install chromium

Usage:
  cd scraper
  python -m scrapy crawl ecourts              # all cases with case_number
  python -m scrapy crawl ecourts -a limit=10  # test with 10 cases
  python -m scrapy crawl ecourts -a dry_run=true -a limit=5  # preview only

Note: eCourts requires State → District → Court Complex selection + captcha.
      The spider infers state from the criminal_case's linked politician.
      Each case takes ~10-15 seconds due to page loads + captcha solving.
"""
import logging
import os
import re
import time
from typing import Any, Generator

import scrapy

logger = logging.getLogger(__name__)

ECOURTS_URL = "https://services.ecourts.gov.in/ecourtindia_v6/?p=casestatus/index"

# Map Indian state names to eCourts state codes
# These are the value attributes in the #sess_state_code dropdown
STATE_CODE_MAP = {
    "andaman and nicobar": "28",
    "andhra pradesh": "2",
    "arunachal pradesh": "36",
    "assam": "6",
    "bihar": "5",
    "chandigarh": "29",
    "chhattisgarh": "27",
    "dadra and nagar haveli": "30",
    "daman and diu": "31",
    "delhi": "1",
    "goa": "8",
    "gujarat": "9",
    "haryana": "10",
    "himachal pradesh": "11",
    "jammu and kashmir": "34",
    "jharkhand": "26",
    "karnataka": "3",
    "kerala": "4",
    "ladakh": "35",
    "lakshadweep": "32",
    "madhya pradesh": "14",
    "maharashtra": "15",
    "manipur": "16",
    "meghalaya": "17",
    "mizoram": "18",
    "nagaland": "19",
    "odisha": "20",
    "puducherry": "33",
    "punjab": "21",
    "rajasthan": "22",
    "sikkim": "23",
    "tamil nadu": "7",
    "telangana": "37",
    "tripura": "24",
    "uttar pradesh": "13",
    "uttarakhand": "25",
    "west bengal": "12",
}


def _solve_captcha(page) -> str | None:
    """Download and solve the visible captcha image using ddddocr."""
    try:
        import ddddocr

        # Get the visible captcha image src
        captcha_imgs = page.query_selector_all('img[src*="securimage_show"]')
        for img in captcha_imgs:
            if img.is_visible():
                src = img.get_attribute("src")
                if not src:
                    continue

                # Fetch captcha image bytes via the browser's session
                full_url = f"https://services.ecourts.gov.in{src}"
                cookies = page.context.cookies()
                cookie_str = "; ".join(
                    [f'{c["name"]}={c["value"]}' for c in cookies]
                )

                import requests

                resp = requests.get(
                    full_url,
                    headers={"Cookie": cookie_str, "User-Agent": "Mozilla/5.0"},
                    timeout=10,
                )
                if resp.status_code == 200 and len(resp.content) > 100:
                    ocr = ddddocr.DdddOcr(show_ad=False)
                    result = ocr.classification(resp.content)
                    logger.debug(f"Captcha OCR result: {result}")
                    return result

        logger.warning("No visible captcha image found")
        return None
    except Exception as e:
        logger.error(f"Captcha solving failed: {e}")
        return None


def _parse_case_results(page) -> dict[str, Any] | None:
    """Parse the case status results table from the eCourts page."""
    result: dict[str, Any] = {}

    # Wait for results to appear
    time.sleep(2)

    page_text = page.inner_text("body")

    # Check for "Record Not Found" or similar
    if "record not found" in page_text.lower() or "no record" in page_text.lower():
        return None

    # Extract CNR number
    cnr_match = re.search(
        r"CNR\s*(?:No\.?|Number)?\s*[:\-]?\s*([A-Z]{4}\d{10,})", page_text
    )
    if cnr_match:
        result["ecourts_case_id"] = cnr_match.group(1).strip()

    # Extract case status from table rows
    status_patterns = {
        "disposed": ["disposed", "disposed off"],
        "convicted": ["convicted", "guilty", "sentenced"],
        "acquitted": ["acquitted", "not guilty"],
        "discharged": ["discharged"],
        "pending": ["pending", "under trial", "not yet disposed"],
        "transferred": ["transferred"],
        "stayed": ["stayed"],
    }

    text_lower = page_text.lower()

    # Look for status in structured table cells
    status_cells = page.query_selector_all(
        "td:has-text('Status'), td:has-text('Case Status')"
    )
    status_text = ""
    for cell in status_cells:
        # Get the next sibling cell
        next_cell = cell.evaluate(
            "el => el.nextElementSibling ? el.nextElementSibling.innerText : ''"
        )
        if next_cell:
            status_text += " " + next_cell

    combined = (status_text + " " + text_lower).lower()
    for status, keywords in status_patterns.items():
        if any(kw in combined for kw in keywords):
            result["current_status"] = status
            break

    # Extract dates
    date_pattern = r"(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})"

    # Next hearing date
    next_match = re.search(
        r"next\s+(?:date|hearing)[:\s]*" + date_pattern, page_text, re.IGNORECASE
    )
    if not next_match:
        next_match = re.search(
            r"listed\s+(?:on|for)[:\s]*" + date_pattern, page_text, re.IGNORECASE
        )
    if next_match:
        result["next_hearing_date"] = _normalize_date(next_match.group(1))

    # Last hearing date
    last_match = re.search(
        r"(?:last|previous)\s+(?:date|hearing)[:\s]*" + date_pattern,
        page_text,
        re.IGNORECASE,
    )
    if last_match:
        result["last_hearing_date"] = _normalize_date(last_match.group(1))

    # Judge name
    judge_match = re.search(
        r"(?:judge|justice|hon.?ble|before)[:\s]*([A-Z][a-zA-Z.\s]{3,40})",
        page_text,
    )
    if judge_match:
        judge_name = judge_match.group(1).strip()
        # Filter out false positives
        if len(judge_name) > 4 and not any(
            w in judge_name.lower()
            for w in ["status", "number", "date", "court", "case"]
        ):
            result["judge_name"] = judge_name

    return result if result else None


def _normalize_date(date_str: str) -> str | None:
    """Normalize date string to YYYY-MM-DD."""
    from datetime import datetime

    for fmt in ["%d-%m-%Y", "%d/%m/%Y", "%d-%m-%y", "%d/%m/%y"]:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _extract_case_parts(case_number: str) -> tuple[str, str, str]:
    """
    Extract case type prefix, number, and year from case_number string.
    Examples:
      "CC. No. 4 of 2024" → ("CC", "4", "2024")
      "6547/2015" → ("", "6547", "2015")
      "CRI No. 622/2019" → ("CRI", "622", "2019")
    """
    # Try pattern: TYPE No. NUMBER of/- YEAR
    m = re.match(
        r"^([A-Za-z.]+)\s*(?:No\.?\s*)?(\d+)\s*(?:of|/|-)\s*(\d{4})",
        case_number.strip(),
    )
    if m:
        return m.group(1).strip().rstrip("."), m.group(2), m.group(3)

    # Try pattern: NUMBER/YEAR
    m = re.match(r"^(\d+)\s*/\s*(\d{4})", case_number.strip())
    if m:
        return "", m.group(1), m.group(2)

    # Try pattern: TYPE NUMBER/YEAR
    m = re.match(r"^([A-Za-z.]+)\s*(\d+)\s*/\s*(\d{4})", case_number.strip())
    if m:
        return m.group(1).strip().rstrip("."), m.group(2), m.group(3)

    return "", "", ""


class ECourtsSpider(scrapy.Spider):
    """
    eCourts spider using Playwright for JS rendering + ddddocr for captcha.
    Searches eCourts by party name (politician name) to find case status.
    """

    name = "ecourts"
    custom_settings = {
        "DOWNLOAD_DELAY": 0,  # We manage delays ourselves via Playwright
        "CONCURRENT_REQUESTS": 1,
        "ITEM_PIPELINES": {"pipelines.supabase_pipeline.SupabasePipeline": 300},
    }

    def __init__(self, dry_run: str = "false", limit: str = "0", **kwargs):
        super().__init__(**kwargs)
        self.dry_run = dry_run.lower() == "true"
        self.limit = int(limit)
        self._count = 0
        self._success = 0
        self._failed = 0
        self._browser = None
        self._page = None

    def start_requests(self) -> Generator:
        """
        Load cases from DB, then process them via Playwright.
        We yield a single dummy request to trigger the pipeline,
        then do all actual work in the callback.
        """
        # Yield a dummy request to start the spider
        yield scrapy.Request(
            "https://services.ecourts.gov.in/ecourtindia_v6/",
            callback=self.process_cases,
            dont_filter=True,
            meta={"dont_redirect": True},
            errback=self.process_cases_on_error,
        )

    def process_cases_on_error(self, failure):
        """Handle initial request error — still process cases."""
        yield from self._run_playwright()

    def process_cases(self, response) -> Generator:
        """Main processing — runs Playwright to check each case."""
        yield from self._run_playwright()

    def _run_playwright(self) -> Generator:
        """Core logic: load cases from DB, check each via Playwright."""
        from dotenv import load_dotenv

        load_dotenv()
        from supabase import create_client

        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            logger.error("Supabase credentials not configured")
            return

        sb = create_client(url, key)

        # Load cases with case_number, joining politician for state info
        result = (
            sb.table("criminal_cases")
            .select("id, politician_id, case_number, court_name, state, current_status, politicians(name, state)")
            .not_.is_("case_number", "null")
            .is_("ecourts_case_id", "null")  # Skip already-linked cases
            .execute()
        )

        cases = result.data or []
        if not cases:
            logger.warning("No unlinked criminal cases with case numbers")
            return

        logger.info(f"Processing {len(cases)} cases via Playwright + captcha OCR")

        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = context.new_page()

            for case in cases:
                if self.limit and self._count >= self.limit:
                    break

                case_number = (case.get("case_number") or "").strip()
                if not case_number:
                    continue

                # Get state from case or politician
                state = case.get("state") or ""
                if not state and case.get("politicians"):
                    pol = case["politicians"]
                    if isinstance(pol, dict):
                        state = pol.get("state", "")

                politician_name = ""
                if case.get("politicians") and isinstance(case["politicians"], dict):
                    politician_name = case["politicians"].get("name", "")

                state_code = STATE_CODE_MAP.get(state.lower().strip(), "")
                if not state_code:
                    logger.debug(
                        f"Skipping {case_number} — no state code for '{state}'"
                    )
                    continue

                self._count += 1
                logger.info(
                    f"[{self._count}] Checking: {case_number} ({state}) for {politician_name}"
                )

                try:
                    parsed = self._search_case(
                        page, case_number, state_code, politician_name
                    )

                    if parsed:
                        item = {
                            "item_type": "ecourts_update",
                            "case_id": case["id"],
                            "politician_id": case["politician_id"],
                            "case_number": case_number,
                            **parsed,
                        }

                        if self.dry_run:
                            logger.info(f"[DRY RUN] {case_number} → {parsed}")
                        else:
                            yield item

                        self._success += 1
                    else:
                        self._failed += 1
                        logger.debug(f"No results for {case_number}")

                except Exception as e:
                    self._failed += 1
                    logger.warning(f"Error processing {case_number}: {e}")

                # Respectful delay between cases
                time.sleep(3)

            browser.close()

        logger.info(
            f"eCourts complete: {self._success} updated, "
            f"{self._failed} failed, {self._count} total"
        )

    def _search_case(
        self,
        page,
        case_number: str,
        state_code: str,
        politician_name: str,
    ) -> dict[str, Any] | None:
        """
        Search for a case on eCourts using the Party Name tab.
        This avoids needing to know case type and exact district.

        Returns parsed case data dict or None.
        """
        MAX_CAPTCHA_RETRIES = 3

        # Navigate to case status page
        page.goto(ECOURTS_URL, wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)

        # Close any popup
        ok_btn = page.query_selector('button:has-text("OK")')
        if ok_btn and ok_btn.is_visible():
            ok_btn.click()
            time.sleep(1)

        # Select state
        page.select_option("#sess_state_code", value=state_code)
        time.sleep(3)

        # Select first available district
        districts = page.query_selector_all("#sess_dist_code option")
        if len(districts) <= 1:
            logger.debug(f"No districts loaded for state {state_code}")
            return None
        page.select_option("#sess_dist_code", index=1)
        time.sleep(3)

        # Select first court complex
        complexes = page.query_selector_all("#court_complex_code option")
        if len(complexes) <= 1:
            logger.debug("No court complexes loaded")
            return None
        page.select_option("#court_complex_code", index=1)
        time.sleep(2)

        # Use Party Name tab — search by politician name
        page.click("#partyname-tabMenu")
        time.sleep(1)

        # Fill party name
        name_input = page.query_selector("#petres_name")
        if not name_input or not name_input.is_visible():
            logger.debug("Party name input not found")
            return None

        # Use last name for broader matching
        search_name = politician_name.split()[-1] if politician_name else ""
        if not search_name or len(search_name) < 3:
            search_name = politician_name

        name_input.fill(search_name)

        # Fill year (use empty for all years, or extract from case_number)
        _, _, year = _extract_case_parts(case_number)
        year_input = page.query_selector("#rgyearP")
        if year_input and year_input.is_visible() and year:
            year_input.fill(year)

        # Select "Both" (pending + disposed) radio
        both_radio = page.query_selector("#radBP")
        if both_radio:
            both_radio.click()

        # Solve captcha and submit (with retries)
        for attempt in range(MAX_CAPTCHA_RETRIES):
            captcha_text = _solve_captcha(page)
            if not captcha_text:
                logger.debug(f"Captcha solve attempt {attempt + 1} failed")
                # Refresh captcha
                refresh = page.query_selector('img[src*="refresh-btn"]')
                if refresh and refresh.is_visible():
                    refresh.click()
                    time.sleep(2)
                continue

            # Fill captcha
            captcha_input = page.query_selector("#party_captcha_code")
            if not captcha_input:
                # Try alternative captcha input IDs
                captcha_input = page.query_selector(
                    'input[name="party_captcha_code"], input[id*="captcha"]'
                )
            if captcha_input and captcha_input.is_visible():
                captcha_input.fill(captcha_text)

            # Click search/Go button within party name tab
            go_btn = page.query_selector('#partynametab button:has-text("Go")')
            if not go_btn:
                go_btn = page.query_selector(
                    '#partynametab input[type="button"][value="Go"]'
                )
            if go_btn:
                go_btn.click()
                time.sleep(5)

                # Check if captcha was wrong
                error_text = page.inner_text("body").lower()
                if "invalid captcha" in error_text or "wrong captcha" in error_text:
                    logger.debug(
                        f"Captcha attempt {attempt + 1} wrong, retrying..."
                    )
                    # Refresh captcha for next attempt
                    refresh = page.query_selector('img[src*="refresh-btn"]')
                    if refresh and refresh.is_visible():
                        refresh.click()
                        time.sleep(2)
                    continue

                # Parse results
                return _parse_case_results(page)

        logger.warning(f"Failed to solve captcha after {MAX_CAPTCHA_RETRIES} attempts")
        return None
