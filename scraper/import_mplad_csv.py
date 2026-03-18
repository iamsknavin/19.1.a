"""
Import MPLAD fund data from CSV files into Supabase fund_usage table.

Reads CSVs from the "MPLAD Data/" folder:
  - Allocated Limit for.csv           → total_allocated per MP
  - Expenditure on Completed and On-going Works as on Date.csv → total_utilized (summed)
  - Works Completed.csv               → completed works count + amounts
  - Works Sanctioned.csv              → sanctioned works count
  - Works Recommended.csv             → recommended works count
  - Amount consented for Calamity.csv  → calamity consent amounts

Matches MP names to politician IDs via name + constituency fuzzy matching.

Usage:
  cd scraper
  python import_mplad_csv.py                # real import
  python import_mplad_csv.py --dry-run      # preview only
"""
import csv
import os
import re
import sys
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "MPLAD Data"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_indian_amount(s: str) -> float | None:
    """Parse '14,12,89,442' or '9,80,00,000' → float."""
    if not s:
        return None
    cleaned = s.replace(",", "").replace("₹", "").replace("Rs", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def normalize_name(name: str) -> str:
    """Lowercase, strip titles, collapse whitespace."""
    n = name.strip().lower()
    n = re.sub(r"^(shri|smt|dr|adv|prof|justice|sri|mr|mrs|ms)\.?\s+", "", n)
    n = re.sub(r"\s+", " ", n)
    return n


def normalize_constituency(c: str) -> str:
    """Uppercase, strip suffixes like (SC), (ST)."""
    c = c.strip().upper()
    c = re.sub(r"\(SC\)|\(ST\)", "", c).strip()
    return c


# ---------------------------------------------------------------------------
# CSV readers
# ---------------------------------------------------------------------------

def read_allocations() -> dict[str, dict]:
    """Read per-MP allocations. Returns {(norm_name, norm_constituency): row}."""
    path = DATA_DIR / "Allocated Limit for.csv"
    data = {}
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get("Hon'ble Member Of Parliament", "").strip()
            const = row.get("Constituency", "").strip()
            amt = parse_indian_amount(row.get("Allocated Amount ( ₹ )", ""))
            key = (normalize_name(name), normalize_constituency(const))
            data[key] = {
                "raw_name": name,
                "raw_constituency": const,
                "state": row.get("State Name", "").strip(),
                "total_allocated": amt,
            }
    logger.info(f"Loaded {len(data)} allocation records")
    return data


def sum_expenditure_by_mp() -> dict[str, float]:
    """Sum fund disbursed per MP from expenditure CSV. Key: (norm_name, norm_const)."""
    path = DATA_DIR / "Expenditure on Completed and On-going Works as on Date.csv"
    sums: dict[str, float] = {}
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = normalize_name(row.get("Hon'ble Member Of Parliament", ""))
            const = normalize_constituency(row.get("Constituency", ""))
            amt = parse_indian_amount(row.get("Fund Disbursed Amount ( ₹ )", ""))
            key = (name, const)
            if amt:
                sums[key] = sums.get(key, 0) + amt
    logger.info(f"Summed expenditure for {len(sums)} MPs")
    return sums


def count_works(filename: str, amount_col: str | None = None) -> dict[str, dict]:
    """Count works per MP and optionally sum amounts."""
    path = DATA_DIR / filename
    if not path.exists():
        return {}
    counts: dict[str, dict] = {}
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = normalize_name(row.get("Hon'ble Member Of Parliament", ""))
            const = normalize_constituency(row.get("Constituency", ""))
            key = (name, const)
            if key not in counts:
                counts[key] = {"count": 0, "total_amount": 0}
            counts[key]["count"] += 1
            if amount_col:
                amt = parse_indian_amount(row.get(amount_col, ""))
                if amt:
                    counts[key]["total_amount"] += amt
    return counts


def read_calamity() -> dict[str, float]:
    """Sum calamity consent amounts per MP."""
    path = DATA_DIR / "Amount consented for Calamity.csv"
    if not path.exists():
        return {}
    sums: dict[str, float] = {}
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = normalize_name(row.get("Hon'ble Member Of Parliament", ""))
            amt = parse_indian_amount(row.get("Consent Amount ( ₹ )", ""))
            if amt:
                sums[name] = sums.get(name, 0) + amt
    return sums


# ---------------------------------------------------------------------------
# Politician matching
# ---------------------------------------------------------------------------

def build_politician_map(supabase) -> dict:
    """Build matching index from Supabase politicians table."""
    result = supabase.table("politicians").select("id, name, constituency, state").execute()
    pmap = {}  # (norm_name, norm_const) → politician_id
    name_only = {}  # norm_name → politician_id (fallback)
    for p in result.data or []:
        nname = normalize_name(p["name"])
        nconst = normalize_constituency(p.get("constituency") or "")
        pmap[(nname, nconst)] = p["id"]
        if nname not in name_only:
            name_only[nname] = p["id"]
    logger.info(f"Loaded {len(result.data or [])} politicians for matching")
    return pmap, name_only


def match_politician(name_norm, const_norm, pmap, name_only) -> str | None:
    """Try exact match, then name-only, then partial."""
    # Exact name + constituency
    pid = pmap.get((name_norm, const_norm))
    if pid:
        return pid
    # Name only
    pid = name_only.get(name_norm)
    if pid:
        return pid
    # Partial name match
    for (db_name, db_const), pid in pmap.items():
        if name_norm in db_name or db_name in name_norm:
            if const_norm and db_const and const_norm in db_const:
                return pid
    for db_name, pid in name_only.items():
        if name_norm in db_name or db_name in name_norm:
            return pid
    return None


# ---------------------------------------------------------------------------
# Main import
# ---------------------------------------------------------------------------

def main():
    dry_run = "--dry-run" in sys.argv

    # Load environment
    from dotenv import load_dotenv
    load_dotenv()

    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        logger.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
        sys.exit(1)

    from supabase import create_client
    sb = create_client(url, key)
    logger.info("Connected to Supabase")

    # Build politician matching index
    pmap, name_only = build_politician_map(sb)

    # Read all CSV data
    allocations = read_allocations()
    expenditure = sum_expenditure_by_mp()
    completed = count_works("Works Completed.csv", "FINAL AMOUNT ( ₹ )")
    sanctioned = count_works("Works Sanctioned.csv", "RECOMMENDED AMOUNT ( ₹ )")
    recommended = count_works("Works Recommended.csv", "RECOMMENDED AMOUNT ( ₹ )")
    calamity = read_calamity()

    # Merge and insert
    inserted = 0
    matched = 0
    unmatched = []

    for (name_norm, const_norm), alloc in allocations.items():
        pid = match_politician(name_norm, const_norm, pmap, name_only)
        if not pid:
            unmatched.append(alloc["raw_name"])
            continue
        matched += 1

        total_allocated = alloc["total_allocated"] or 0
        total_utilized = expenditure.get((name_norm, const_norm), 0)
        util_pct = round((total_utilized / total_allocated) * 100, 2) if total_allocated > 0 else None

        comp = completed.get((name_norm, const_norm), {})
        sanc = sanctioned.get((name_norm, const_norm), {})
        recom = recommended.get((name_norm, const_norm), {})
        cal_amt = calamity.get(name_norm, 0)

        projects = {
            "works_completed": comp.get("count", 0),
            "works_completed_amount": comp.get("total_amount", 0),
            "works_sanctioned": sanc.get("count", 0),
            "works_sanctioned_amount": sanc.get("total_amount", 0),
            "works_recommended": recom.get("count", 0),
            "works_recommended_amount": recom.get("total_amount", 0),
            "calamity_consent_amount": cal_amt,
        }

        row = {
            "politician_id": pid,
            "fund_type": "mplad",
            "financial_year": "2024-25",
            "total_allocated": total_allocated,
            "total_released": None,
            "total_utilized": total_utilized if total_utilized > 0 else None,
            "utilization_percent": util_pct,
            "projects": projects,
            "source_url": "https://mplads.mospi.gov.in/",
        }

        if dry_run:
            logger.info(
                f"[DRY] {alloc['raw_name']} | "
                f"Alloc: ₹{total_allocated:,.0f} | Util: ₹{total_utilized:,.0f} | "
                f"Works: {comp.get('count', 0)} done, {sanc.get('count', 0)} sanctioned"
            )
        else:
            try:
                sb.table("fund_usage").upsert(
                    row, on_conflict="politician_id,financial_year"
                ).execute()
                inserted += 1
            except Exception as e:
                logger.error(f"Failed to insert for {alloc['raw_name']}: {e}")

    logger.info(f"\nResults: {matched} matched, {len(unmatched)} unmatched, {inserted} inserted")
    if unmatched:
        logger.info(f"Unmatched MPs (first 20): {unmatched[:20]}")


if __name__ == "__main__":
    main()
