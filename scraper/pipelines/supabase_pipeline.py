"""
Supabase write pipeline for 19.1.a scraper.
Handles upserts for politicians, assets, and criminal cases.
Respects DRY_RUN mode — logs but does not write.
"""
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


class SupabasePipeline:
    """Write scraped politician data to Supabase."""

    def __init__(self, supabase_url: str, service_key: str, dry_run: bool):
        self.supabase_url = supabase_url
        self.service_key = service_key
        self.dry_run = dry_run
        self.supabase = None
        self._party_cache: dict[str, str] = {}  # name → uuid
        self._politician_cache: dict[str, str] = {}  # "name|constituency" → uuid
        self.stats = {"politicians": 0, "assets": 0, "cases": 0, "attendance": 0, "errors": 0}

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            supabase_url=crawler.settings.get("SUPABASE_URL", ""),
            service_key=crawler.settings.get("SUPABASE_SERVICE_ROLE_KEY", ""),
            dry_run=crawler.settings.getbool("DRY_RUN", False),
        )

    def open_spider(self, spider):
        if self.dry_run:
            logger.info("🔍 DRY RUN MODE — no data will be written to Supabase")
            return

        if not self.supabase_url or not self.service_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. "
                "Copy .env.example to .env and fill in your credentials."
            )

        from supabase import create_client
        self.supabase = create_client(self.supabase_url, self.service_key)
        logger.info("✅ Connected to Supabase")

        # Pre-load party cache
        result = self.supabase.table("parties").select("id, name, abbreviation").execute()
        for party in result.data or []:
            if party.get("abbreviation"):
                self._party_cache[party["abbreviation"].upper()] = party["id"]
            self._party_cache[party["name"].lower()] = party["id"]

    def _build_politician_cache(self):
        """Build name+constituency → id cache for matching PRS data."""
        if self._politician_cache or not self.supabase:
            return
        result = self.supabase.table("politicians").select("id, name, constituency").execute()
        for p in result.data or []:
            key = f"{p['name'].lower().strip()}|{(p.get('constituency') or '').lower().strip()}"
            self._politician_cache[key] = p["id"]
            # Also index by name only for fuzzy matching
            name_key = p["name"].lower().strip()
            if name_key not in self._politician_cache:
                self._politician_cache[name_key] = p["id"]

    def close_spider(self, spider):
        logger.info(
            f"📊 Pipeline stats: {self.stats['politicians']} politicians, "
            f"{self.stats['assets']} asset records, "
            f"{self.stats['cases']} criminal cases, "
            f"{self.stats['attendance']} attendance records, "
            f"{self.stats['errors']} errors"
        )

    def process_item(self, item: dict[str, Any], spider) -> dict[str, Any]:
        """Route item to correct handler based on item_type."""
        item_type = item.get("item_type")

        if item_type == "politician":
            self._process_politician(item, spider)
        elif item_type == "attendance":
            self._process_attendance(item, spider)
        elif item_type == "company_interest":
            self._process_company(item, spider)
        elif item_type == "tender":
            self._process_tender(item, spider)
        elif item_type == "controversy":
            self._process_controversy(item, spider)
        elif item_type == "ecourts_update":
            self._process_ecourts_update(item, spider)
        elif item_type == "fund_usage":
            self._process_fund_usage(item, spider)
        else:
            logger.warning(f"Unknown item_type: {item_type}")

        return item

    def _resolve_party_id(self, party_name: str | None) -> str | None:
        """Look up party UUID from cache. Falls back to DB query."""
        if not party_name:
            return self._party_cache.get("IND")

        # Try abbreviation first (uppercase)
        key_upper = party_name.upper().strip()
        if key_upper in self._party_cache:
            return self._party_cache[key_upper]

        # Try full name (lowercase)
        key_lower = party_name.lower().strip()
        if key_lower in self._party_cache:
            return self._party_cache[key_lower]

        # Try partial match
        for cached_name, party_id in self._party_cache.items():
            if key_lower in cached_name or cached_name in key_lower:
                return party_id

        # Party not found — use Independent
        logger.debug(f"Party not found in cache: '{party_name}', using Independent")
        return self._party_cache.get("IND")

    def _process_politician(self, item: dict[str, Any], spider):
        """Upsert politician + assets + criminal cases."""
        name = item.get("name", "")
        slug = item.get("slug", "")

        if not name or not slug:
            logger.warning("Skipping item with missing name/slug")
            self.stats["errors"] += 1
            return

        party_id = self._resolve_party_id(item.get("party_name"))

        politician_data = {
            "name": name,
            "name_hindi": item.get("name_hindi"),
            "slug": slug,
            "profile_image_url": item.get("profile_image_url"),
            "date_of_birth": item.get("date_of_birth"),
            "gender": item.get("gender"),
            "education": item.get("education"),
            "party_id": party_id,
            "constituency": item.get("constituency"),
            "state": item.get("state"),
            "house": item.get("house"),
            "is_active": item.get("is_active", True),
            "election_status": item.get("election_status", "candidate"),
            "pan_card_last4": item.get("pan_card_last4"),
            "official_website": item.get("official_website"),
        }

        if self.dry_run:
            logger.info(
                f"[DRY RUN] Would upsert politician: {name} | "
                f"Party: {item.get('party_name')} | "
                f"Constituency: {item.get('constituency')} | "
                f"Net Worth: {item.get('net_worth')} | "
                f"Cases: {len(item.get('criminal_cases', []))}"
            )
            return

        try:
            # Upsert politician (slug is unique key)
            result = (
                self.supabase.table("politicians")
                .upsert(politician_data, on_conflict="slug")
                .execute()
            )
            politician_id = result.data[0]["id"]
            self.stats["politicians"] += 1

            # Upsert assets declaration
            assets = item.get("assets", {})
            if assets:
                assets_data = {
                    "politician_id": politician_id,
                    "declaration_year": item.get("declaration_year", 2024),
                    "source_url": item.get("source_url"),
                    "source_type": "myneta",
                    **assets,
                }
                self.supabase.table("assets_declarations").upsert(
                    assets_data,
                    on_conflict="politician_id,declaration_year",
                ).execute()
                self.stats["assets"] += 1

            # Upsert criminal cases
            for case in item.get("criminal_cases", []):
                case_data = {
                    "politician_id": politician_id,
                    "source_url": item.get("source_url"),
                    "declaration_year": item.get("declaration_year", 2024),
                    **case,
                }
                self.supabase.table("criminal_cases").insert(case_data).execute()
                self.stats["cases"] += 1

            logger.info(
                f"✅ {name} | {item.get('party_name')} | "
                f"Net worth: {assets.get('net_worth', 'N/A')} | "
                f"Cases: {len(item.get('criminal_cases', []))}"
            )

        except Exception as e:
            logger.error(f"❌ Failed to save {name}: {e}")
            self.stats["errors"] += 1

    def _resolve_politician_id(self, name: str, constituency: str | None) -> str | None:
        """Match PRS/external MP name to our politician_id."""
        self._build_politician_cache()
        name_lower = name.lower().strip()
        const_lower = (constituency or "").lower().strip()

        # Exact match on name + constituency
        key = f"{name_lower}|{const_lower}"
        if key in self._politician_cache:
            return self._politician_cache[key]

        # Name-only match
        if name_lower in self._politician_cache:
            return self._politician_cache[name_lower]

        # Fuzzy: check if PRS name is contained in any cached name or vice versa
        for cached_key, pid in self._politician_cache.items():
            cached_name = cached_key.split("|")[0] if "|" in cached_key else cached_key
            if name_lower in cached_name or cached_name in name_lower:
                return pid

        return None

    def _process_company(self, item: dict[str, Any], spider):
        """Insert company interest record."""
        if self.dry_run:
            return
        try:
            data = {
                "politician_id": item["politician_id"],
                "company_name": item.get("company_name"),
                "cin": item.get("cin"),
                "role": item.get("role"),
                "company_type": item.get("company_type"),
                "company_status": item.get("company_status"),
                "mca_data_url": item.get("mca_data_url"),
            }
            self.supabase.table("company_interests").insert(data).execute()
            self.stats["companies"] = self.stats.get("companies", 0) + 1
        except Exception as e:
            logger.error(f"❌ Failed to save company: {e}")
            self.stats["errors"] += 1

    def _process_tender(self, item: dict[str, Any], spider):
        """Insert government tender record."""
        if self.dry_run:
            return
        try:
            data = {
                "politician_id": item["politician_id"],
                "company_id": item.get("company_id"),
                "tender_title": item.get("tender_title"),
                "tendering_authority": item.get("tendering_authority"),
                "contract_value": item.get("contract_value"),
                "source": item.get("source"),
                "source_url": item.get("source_url"),
                "conflict_of_interest_flag": item.get("conflict_of_interest_flag", False),
            }
            self.supabase.table("govt_tenders").insert(data).execute()
            self.stats["tenders"] = self.stats.get("tenders", 0) + 1
        except Exception as e:
            logger.error(f"❌ Failed to save tender: {e}")
            self.stats["errors"] += 1

    def _process_attendance(self, item: dict[str, Any], spider):
        """Upsert attendance record matched to a politician."""
        mp_name = item.get("mp_name", "")
        if not mp_name:
            self.stats["errors"] += 1
            return

        if self.dry_run:
            return

        politician_id = self._resolve_politician_id(
            mp_name, item.get("constituency")
        )
        if not politician_id:
            logger.debug(f"Could not match PRS MP: {mp_name}")
            self.stats["errors"] += 1
            return

        try:
            data = {
                "politician_id": politician_id,
                "session_name": item.get("session_name"),
                "session_year": item.get("session_year"),
                "attendance_percent": item.get("attendance_percent"),
                "days_present": item.get("days_present"),
                "total_days": item.get("total_days"),
                "questions_asked": item.get("questions_asked"),
                "debates_participated": item.get("debates_participated"),
                "bills_introduced": item.get("bills_introduced"),
                "source_url": item.get("source_url"),
            }
            self.supabase.table("attendance_records").upsert(
                data, on_conflict="politician_id,session_year"
            ).execute()
            self.stats["attendance"] += 1
        except Exception as e:
            logger.error(f"❌ Failed to save attendance for {mp_name}: {e}")
            self.stats["errors"] += 1

    def _process_controversy(self, item: dict[str, Any], spider):
        """Insert controversy record."""
        if self.dry_run:
            return
        try:
            data = {
                "politician_id": item["politician_id"],
                "title": item.get("title"),
                "description": item.get("description"),
                "controversy_type": item.get("controversy_type"),
                "severity": item.get("severity"),
                "date_of_incident": item.get("date_of_incident"),
                "news_links": item.get("news_links", []),
                "is_verified": item.get("is_verified", False),
                "is_active": item.get("is_active", True),
            }
            self.supabase.table("controversies").insert(data).execute()
            self.stats["controversies"] = self.stats.get("controversies", 0) + 1
        except Exception as e:
            logger.error(f"❌ Failed to save controversy: {e}")
            self.stats["errors"] += 1

    def _process_ecourts_update(self, item: dict[str, Any], spider):
        """Update existing criminal case with eCourts live data."""
        if self.dry_run:
            return
        try:
            update_data: dict[str, Any] = {}
            for field in [
                "ecourts_case_id",
                "current_status",
                "next_hearing_date",
                "last_hearing_date",
                "judge_name",
                "court_name",
            ]:
                if item.get(field):
                    update_data[field] = item[field]

            if update_data:
                self.supabase.table("criminal_cases").update(
                    update_data
                ).eq("id", item["case_id"]).execute()
                self.stats["ecourts"] = self.stats.get("ecourts", 0) + 1
        except Exception as e:
            logger.error(f"❌ Failed to update eCourts case: {e}")
            self.stats["errors"] += 1

    def _process_fund_usage(self, item: dict[str, Any], spider):
        """Upsert MPLAD/MLA-LAD fund usage record."""
        if self.dry_run:
            return
        try:
            data = {
                "politician_id": item["politician_id"],
                "fund_type": item.get("fund_type", "mplad"),
                "financial_year": item.get("financial_year"),
                "total_allocated": item.get("total_allocated"),
                "total_released": item.get("total_released"),
                "total_utilized": item.get("total_utilized"),
                "utilization_percent": item.get("utilization_percent"),
                "source_url": item.get("source_url"),
            }
            self.supabase.table("fund_usage").insert(data).execute()
            self.stats["funds"] = self.stats.get("funds", 0) + 1
        except Exception as e:
            logger.error(f"❌ Failed to save fund usage: {e}")
            self.stats["errors"] += 1
