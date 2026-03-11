"""
Parser for extracting asset figures from MyNeta HTML tables.
MyNeta structures affidavit data in HTML tables — no OCR needed for Phase 1.

MyNeta table structure:
  Movable/Immovable tables:  Sr No | Description | Self | Spouse | HUF | Dep1 | ...
  Summary table:             "Assets:" | "Rs X,XX,XXX ~X Lacs+"
                             "Liabilities:" | "Rs X,XX,XXX" or "Nil"

The "Self" column (index 2) contains the candidate's own asset values.
The summary table at the bottom is the most reliable for total_assets.
"""
import re
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Regex to extract the first numeric value from strings like "Rs.1,23,45,678" or "90,000  90 Thou+"
_AMOUNT_RE = re.compile(r"[\d,]+\.?\d*")

# Regex to detect values that are clearly not amounts (long text descriptions, names, etc.)
_NOT_AMOUNT_RE = re.compile(r"[a-zA-Z]{5,}")


def parse_amount(text: str | None) -> float | None:
    """
    Parse an Indian currency string to a float.
    "Rs. 1,23,45,678" → 12345678.0
    "90,000   90 Thou+" → 90000.0
    "Nil" → None
    """
    if not text:
        return None
    text = text.strip()

    # "Nil" or "NIL" means zero/nothing
    if text.lower() in ("nil", "nil ", "nill"):
        return None

    # Skip values that look like descriptive text (bank names, addresses, etc.)
    # Only skip if there's no "Rs" prefix — presence of Rs means it's definitely a value
    if _NOT_AMOUNT_RE.search(text) and not re.search(r"Rs\.?\s", text, re.IGNORECASE):
        return None

    cleaned = text.replace("Rs.", "").replace("Rs", "").replace("₹", "").strip()
    # Extract the first number (before any description like "90 Thou+")
    cleaned_no_commas = cleaned.replace(",", "")
    match = _AMOUNT_RE.search(cleaned_no_commas)
    if match:
        try:
            val = float(match.group())
            # Sanity: skip tiny numbers that are likely row indices (1, 2, 3...)
            if val < 10 and len(match.group()) <= 2:
                return None
            return val
        except ValueError:
            pass
    return None


def parse_assets_table(rows: list[dict]) -> dict[str, Any]:
    """
    Parse the movable/immovable assets rows from MyNeta profile table.

    rows: list of {"label": str, "value": str} dicts from the asset table.
    Returns a dict matching the assets_declarations table columns.
    """
    result: dict[str, Any] = {}

    # Mapping from MyNeta label patterns to DB column names
    # Order matters — more specific patterns should come first
    label_map = {
        # Summary (highest priority — match these first)
        "total asset": "total_assets",
        "assets:": "total_assets",
        "total liabilit": "total_liabilities",
        "liabilities:": "total_liabilities",
        "net worth": "net_worth",
        # Totals
        "gross total": "_gross_total",
        "total current market value": "_immovable_total",
        "total movable": "total_movable_assets",
        "total immovable": "total_immovable_assets",
        # Movable assets
        "cash": "cash_in_hand",
        "deposit": "bank_deposits",
        "bond": "bonds_debentures",
        "share": "bonds_debentures",
        "nsc": "nsc_postal",
        "postal": "nsc_postal",
        "lic": "lic_policies",
        "insurance": "lic_policies",
        "personal loan": "personal_loans_given",
        "advance given": "personal_loans_given",
        "motor": "motor_vehicles",
        "vehicle": "motor_vehicles",
        "jewell": "jewelry_gold",
        "gold": "jewelry_gold",
        "ornament": "jewelry_gold",
        # Immovable assets
        "agricultural land": "agricultural_land",
        "non agricultural": "non_agricultural_land",
        "non-agricultural": "non_agricultural_land",
        "commercial build": "buildings",
        "residential build": "buildings",
        "building": "buildings",
    }

    for row in rows:
        label = (row.get("label") or "").lower().strip()
        value = row.get("value") or ""

        # Skip header rows
        if label in ("description", "sr no", "self", ""):
            continue

        for key, col in label_map.items():
            if key in label:
                parsed = parse_amount(value)
                if parsed is not None:
                    # For buildings, accumulate commercial + residential
                    if col == "buildings" and col in result:
                        result[col] = (result[col] or 0) + parsed
                    # For _gross_total (movable subtotal), map to total_movable_assets
                    elif col == "_gross_total":
                        result["total_movable_assets"] = parsed
                    elif col == "_immovable_total":
                        result["total_immovable_assets"] = parsed
                    else:
                        result[col] = parsed
                break

    return result
