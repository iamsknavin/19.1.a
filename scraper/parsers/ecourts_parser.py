"""
Parser for eCourts India case status responses.
Extracts hearing dates, status, and case identifiers.
"""
import re
import logging
from typing import Any

logger = logging.getLogger(__name__)


def parse_ecourts_response(response) -> dict[str, Any] | None:
    """
    Parse an eCourts case status page/fragment.
    Returns dict with status, hearing dates, judge, etc.
    """
    text = " ".join(response.css("::text").getall())
    if not text.strip():
        return None

    result: dict[str, Any] = {}

    # Extract case number / CNR number
    cnr_match = re.search(r"CNR\s*(?:No\.?|Number)?\s*[:\-]?\s*([A-Z0-9]+)", text, re.IGNORECASE)
    if cnr_match:
        result["ecourts_case_id"] = cnr_match.group(1).strip()

    # Extract status
    status = _extract_status(text, response)
    if status:
        result["status"] = status

    # Extract next hearing date
    next_date = _extract_date(text, [
        r"next\s+(?:date|hearing)\s*[:\-]?\s*(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})",
        r"listed\s+(?:on|for)\s*[:\-]?\s*(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})",
        r"adjourned\s+to\s*[:\-]?\s*(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})",
    ])
    if next_date:
        result["next_hearing_date"] = next_date

    # Extract last hearing date
    last_date = _extract_date(text, [
        r"last\s+(?:date|hearing)\s*[:\-]?\s*(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})",
        r"(?:heard|disposed)\s+on\s*[:\-]?\s*(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})",
    ])
    if last_date:
        result["last_hearing_date"] = last_date

    # Extract judge name
    judge_match = re.search(
        r"(?:judge|justice|hon.?ble)\s*[:\-]?\s*([A-Z][a-zA-Z.\s]{3,40})",
        text, re.IGNORECASE
    )
    if judge_match:
        result["judge_name"] = judge_match.group(1).strip()

    # Extract court name from response
    court = response.css(".court_name::text, .court-name::text, h3::text").get("")
    if court.strip():
        result["court_name"] = court.strip()

    return result if result else None


def _extract_status(text: str, response) -> str | None:
    """Extract normalized case status from eCourts text."""
    text_lower = text.lower()

    # Check for status in structured elements
    status_el = response.css(".case_status::text, .status::text, td:contains('Status') + td::text").get("")
    combined = f"{status_el} {text_lower}".lower()

    if any(w in combined for w in ["disposed", "disposed off"]):
        return "disposed"
    if any(w in combined for w in ["convicted", "guilty"]):
        return "convicted"
    if any(w in combined for w in ["acquitted", "not guilty"]):
        return "acquitted"
    if any(w in combined for w in ["discharged"]):
        return "discharged"
    if any(w in combined for w in ["pending", "under trial", "not yet disposed"]):
        return "pending"
    if any(w in combined for w in ["transferred"]):
        return "transferred"
    if any(w in combined for w in ["stayed"]):
        return "stayed"

    return None


def _extract_date(text: str, patterns: list[str]) -> str | None:
    """Extract and normalize a date from text using multiple patterns."""
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return _normalize_date(match.group(1))
    return None


def _normalize_date(date_str: str) -> str | None:
    """Normalize date string to YYYY-MM-DD format."""
    from datetime import datetime

    for fmt in ["%d-%m-%Y", "%d/%m/%Y", "%d-%m-%y", "%d/%m/%y"]:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None
