"""
Deduplication utilities for 19.1.a scraper.
Checks Supabase before inserting to avoid duplicates.
"""
import os
import logging
from supabase import create_client, Client

logger = logging.getLogger(__name__)


def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return create_client(url, key)


def get_existing_politician_id(supabase: Client, slug: str) -> str | None:
    """Return politician UUID if slug already exists in DB."""
    try:
        result = supabase.table("politicians").select("id").eq("slug", slug).execute()
        if result.data:
            return result.data[0]["id"]
    except Exception as e:
        logger.warning(f"Dedup check failed for slug={slug}: {e}")
    return None


def get_party_id_by_abbreviation(supabase: Client, abbreviation: str) -> str | None:
    """Return party UUID by abbreviation (e.g. 'BJP')."""
    try:
        result = (
            supabase.table("parties")
            .select("id")
            .eq("abbreviation", abbreviation)
            .execute()
        )
        if result.data:
            return result.data[0]["id"]
    except Exception as e:
        logger.warning(f"Party lookup failed for abbr={abbreviation}: {e}")
    return None


def get_party_id_by_name(supabase: Client, name: str) -> str | None:
    """Return party UUID by full name (fuzzy fallback)."""
    try:
        # Try exact match first
        result = (
            supabase.table("parties")
            .select("id, name, abbreviation")
            .execute()
        )
        if not result.data:
            return None

        name_lower = name.lower().strip()
        for party in result.data:
            if party["name"].lower() == name_lower:
                return party["id"]
            # Partial match for aliases like "BJP" → "Bharatiya Janata Party"
            if party.get("abbreviation", "").lower() == name_lower:
                return party["id"]

        # Fuzzy: check if party name contains search term
        for party in result.data:
            if name_lower in party["name"].lower() or party["name"].lower() in name_lower:
                return party["id"]

    except Exception as e:
        logger.warning(f"Party name lookup failed for name={name}: {e}")
    return None


def has_existing_case(
    supabase: Client, politician_id: str, case_number: str | None, ipc_sections: list
) -> bool:
    """Check if a criminal case already exists for this politician."""
    try:
        query = supabase.table("criminal_cases").select("id").eq(
            "politician_id", politician_id
        )
        if case_number:
            query = query.eq("case_number", case_number)
        result = query.execute()
        return bool(result.data)
    except Exception as e:
        logger.warning(f"Case dedup check failed: {e}")
    return False
