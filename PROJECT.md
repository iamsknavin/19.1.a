# NETAwatch — Project Documentation

> **Indian Politician Transparency Platform**
> Every rupee. Every case. Every vote. Public record.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Design Language](#design-language)
- [Database Schema](#database-schema)
- [Scraper System](#scraper-system)
- [Public REST API](#public-rest-api)
- [Phase Roadmap](#phase-roadmap)
- [Data Sources](#data-sources)
- [Environment Setup](#environment-setup)
- [Commands Reference](#commands-reference)
- [Changelog](#changelog)

---

## Overview

NETAwatch aggregates publicly available data about Indian elected representatives — criminal cases, asset declarations, parliamentary attendance, corruption signals, MPLAD fund usage, and news controversies — into a single, searchable platform. All data comes from mandatory public disclosures and government portals.

**Live Stats (as of 2026-03-12):**

| Metric               | Count  |
| --------------------- | ------ |
| Politicians           | 550    |
| Lok Sabha MPs         | 545    |
| Vidhan Sabha MLAs     | 4      |
| Parties               | 35     |
| Criminal Cases        | 1,701  |
| Asset Declarations    | 545    |
| Corruption Signals    | 29     |
| Controversies         | 1,814  |
| Attendance Records    | 66     |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  Next.js 14 (App Router) + TypeScript + Tailwind CSS        │
│  IBM Plex Mono / IBM Plex Sans                              │
│                                                             │
│  Pages:                                                     │
│    /                    — Homepage (stats, map, top MPs)     │
│    /politicians         — Browse all (filters, pagination)  │
│    /politician/[slug]   — Full profile (tabbed layout)      │
│    /parties             — All parties with MP counts         │
│    /party/[slug]        — Party detail page                 │
│    /state/[state-slug]  — State-level breakdown             │
│    /about               — About the project                 │
│    /data-sources        — Data source attribution           │
│    /api-docs            — REST API documentation            │
│                                                             │
│  Components:                                                │
│    layout/  — Header, Footer (sticky header, responsive)    │
│    politician/ — PoliticianCard, PartyBadge, CasesBadge,    │
│                 CorruptionSignalBadge, WealthBar             │
│    ui/ — StatCard, PhaseStub, DataSourceTag                 │
│    SearchBar, IndiaMap                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Supabase Client (SSR + Browser)
                   │ Meilisearch (search queries)
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                      BACKEND / API                          │
│  No separate backend — Next.js API routes + Supabase        │
│                                                             │
│  /api/v1/politicians       — List with filters              │
│  /api/v1/politicians/[slug] — Full detail                   │
│  /api/v1/parties           — Party listing                  │
│  /api/v1/stats             — Aggregate stats                │
│  /api/sync-search          — Meilisearch sync endpoint      │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                       DATABASE                              │
│  Supabase PostgreSQL (ap-south-1 / Mumbai)                  │
│  Project: uuridzmajcooiwcpoyyt                              │
│  11 tables, RLS enabled, 2 policies per table               │
│  (anon read + authenticated read)                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    SCRAPER SYSTEM                            │
│  Python + Scrapy (in /scraper/ directory)                   │
│  Celery + Redis for scheduled jobs                          │
│  10 spider files, Supabase pipeline                         │
│  Polite: 1.5s delay, auto-throttle, robots.txt respected    │
└──────────────────┬──────────────────────────────────────────┐
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                       SEARCH                                │
│  Meilisearch (Docker local / Meilisearch Cloud prod)        │
│  Index: politicians (name, constituency, state, party)      │
│  Fuzzy search, typo tolerance, instant results              │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer        | Technology                         | Version   |
| ------------ | ---------------------------------- | --------- |
| Framework    | Next.js (App Router)               | 14.2.18   |
| Language     | TypeScript                         | ^5        |
| Styling      | Tailwind CSS                       | ^3.4.1    |
| UI Library   | React                              | ^18       |
| Database     | Supabase PostgreSQL                | —         |
| DB Client    | @supabase/supabase-js + @supabase/ssr | ^2.47 / ^0.5.2 |
| Search       | Meilisearch                        | ^0.44     |
| Scraping     | Python + Scrapy                    | —         |
| Scheduling   | Celery + Redis                     | —         |
| Fonts        | IBM Plex Mono, IBM Plex Sans       | Google    |
| Utilities    | clsx + tailwind-merge              | —         |

---

## Design Language

### Philosophy

NETAwatch uses a **dark, data-forward, monospace-accented** design. The aesthetic is intentionally stark and utilitarian — modeled on investigative journalism tools and financial terminals. Data is presented densely with no decorative flourishes. The accent gold evokes a "watchdog" / "spotlight" metaphor.

### Color Palette

| Token           | Hex       | Usage                                    |
| --------------- | --------- | ---------------------------------------- |
| `bg`            | `#0a0a0f` | Page background — near-black             |
| `surface`       | `#111118` | Card / panel background                  |
| `surface-2`     | `#1a1a24` | Hover states, nested surfaces            |
| `accent`        | `#e8c547` | Primary accent — gold/amber              |
| `accent-dim`    | `#b8982e` | Accent hover state                       |
| `danger`        | `#e53e3e` | Criminal cases, critical signals         |
| `danger-dim`    | `#9b2c2c` | Danger hover/dim                         |
| `warning`       | `#ed8936` | Medium severity, warnings                |
| `safe`          | `#38a169` | Good indicators (high attendance, clean) |
| `safe-dim`      | `#276749` | Safe hover/dim                           |
| `border`        | `#2a2a3a` | All borders — subtle purple-gray         |
| `text-primary`  | `#f0ede6` | Main body text — warm off-white          |
| `text-secondary` | `#8a8a9a` | Secondary labels, nav links              |
| `text-muted`    | `#555566` | Fine print, metadata                     |

### Typography

| Font             | Usage                                             |
| ---------------- | ------------------------------------------------- |
| IBM Plex Mono    | Navigation, labels, stats, badges, data tables    |
| IBM Plex Sans    | Body text, descriptions, long-form content        |

- **Font sizes:** Standard Tailwind scale + custom `text-2xs` (0.65rem) for micro labels.
- **Uppercase tracking:** Used for section headers (`text-2xs uppercase tracking-widest`).

### Layout Patterns

- **Max width:** `max-w-7xl` (1280px) centered with horizontal padding.
- **Sticky header:** `sticky top-0 z-50` with `bg-surface` and bottom border.
- **Grid system:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` for card layouts.
- **Spacing:** Consistent `gap-4` to `gap-8`, `py-8` section padding.
- **Cards:** `bg-surface` with `border border-border rounded-lg p-4` (no shadows).
- **Tabs:** Horizontal tab bar with `border-b border-border`, active tab has `border-accent` underline.
- **Tables:** Custom `.data-table` class with monospace headers, hover row highlighting.
- **Scrollbar:** Thin 6px custom scrollbar matching surface/border colors.
- **Selection:** Gold (`accent`) background with black text on text selection.

### Component Patterns

- **StatCard:** Icon + large monospace number + label, on `surface` background.
- **PoliticianCard:** Profile image + name + constituency + party badge + case count + net worth.
- **CasesBadge:** Red pill-shaped badge showing criminal case count.
- **CorruptionSignalBadge:** Severity-colored badge (critical=red, high=orange, medium=yellow, low=gray).
- **WealthBar:** Horizontal bar showing net worth in lakhs/crores (Indian number system).
- **PartyBadge:** Party abbreviation with optional logo.
- **DataSourceTag:** Small tag showing data provenance.
- **PhaseStub:** Placeholder for features not yet active (grayed out with phase label).

### Responsive Breakpoints

| Breakpoint | Width   | Behavior                          |
| ---------- | ------- | --------------------------------- |
| Mobile     | < 640px | Single column, search hidden, hamburger |
| `sm`       | 640px   | Two columns, search visible       |
| `md`       | 768px   | Navigation visible                |
| `lg`       | 1024px  | Three-column card grids           |

---

## Database Schema

### Tables (11 total, all with RLS)

#### `parties` (35 rows)
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid (PK) | Auto-generated |
| name | text | Full party name |
| abbreviation | text (unique) | e.g. "BJP", "INC" |
| logo_url | text? | Party logo URL |
| founded_year | int? | |
| ideology | text? | |
| parent_party_id | uuid? (FK → parties) | For alliance tracking |

#### `politicians` (549 rows)
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid (PK) | Auto-generated |
| name | text | Full name |
| name_hindi | text? | Hindi transliteration |
| slug | text (unique) | URL-safe identifier |
| profile_image_url | text? | MyNeta headshot |
| date_of_birth | date? | |
| gender | text? | |
| education | text? | |
| party_id | uuid? (FK → parties) | |
| constituency | text? | |
| state | text? | |
| house | text | `lok_sabha` / `rajya_sabha` / `vidhan_sabha` |
| term_start | date? | |
| term_end | date? | |
| is_active | boolean? | Default true |
| election_status | text? | Default `candidate` |
| social_twitter | text? | |
| social_facebook | text? | |
| official_website | text? | |

#### `criminal_cases` (1,574 rows)
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid (PK) | |
| politician_id | uuid (FK → politicians) | |
| case_number | text? | Court case number |
| court_name | text? | |
| court_type | text? | |
| state | text? | |
| ipc_sections | text[]? | Array of IPC/BNS sections |
| case_description | text? | |
| case_year | int? | |
| current_status | text? | `pending` / `convicted` / `acquitted` / `discharged` / `stayed` / `unknown` |
| is_heinous | boolean? | Flagged by parser |
| ecourts_case_id | text? | CNR number from eCourts |
| declaration_year | int? | Year of affidavit declaring this case |

#### `controversies` (1,814 rows)
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid (PK) | |
| politician_id | uuid (FK → politicians) | |
| title | text | News headline |
| description | text? | Summary |
| controversy_type | text? | `ed_action`, `cbi_action`, `criminal_case`, `corruption`, `scandal`, etc. |
| severity | text? | `low` / `medium` / `high` / `critical` |
| date_of_incident | date? | |
| news_links | text[]? | Source URLs |
| is_verified | boolean? | Default false |
| is_active | boolean? | Default true |

#### `corruption_signals` (29 rows)
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid (PK) | |
| politician_id | uuid (FK → politicians) | |
| signal_type | text? | `heinous_cases`, `high_case_count`, `low_attendance`, `wealth_surge` |
| signal_severity | text? | `low` / `medium` / `high` / `critical` |
| signal_description | text? | Human-readable explanation |
| evidence_links | text[]? | |
| auto_generated | boolean? | Default true — engine-generated signals |
| is_dismissed | boolean? | Default false |

#### `attendance_records` (66 rows)
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid (PK) | |
| politician_id | uuid (FK → politicians) | |
| session_year | int? | |
| session_name | text? | |
| days_present | int? | |
| total_days | int? | |
| attendance_percent | numeric? | |
| questions_asked | int? | |
| debates_participated | int? | |
| bills_introduced | int? | |

#### `assets_declarations` (0 rows — needs scraper re-run)
Detailed asset breakdown from ECI affidavits: cash, bank deposits, bonds, LIC, vehicles, jewelry, land, buildings, total movable/immovable, liabilities, net worth, spouse assets.

#### `election_terms` (0 rows — needs scraper re-run)
Election history: year, house, constituency, votes received, vote share, margin, result.

#### `company_interests` (0 rows — needs MCA21 API key)
Corporate directorships and shareholdings from MCA21 registry.

#### `govt_tenders` (0 rows — needs company data first)
GeM procurement contracts linked to politician-associated companies.

#### `fund_usage` (0 rows — needs MPLAD portal data)
MPLAD/MLALAD fund allocation, release, and utilization with projects (JSONB).

---

## Scraper System

### Configuration (`scraper/settings.py`)

```
BOT_NAME:                netawatch_scraper
ROBOTSTXT_OBEY:          True
DOWNLOAD_DELAY:          1.5s (randomized 0.5x–1.5x)
CONCURRENT_REQUESTS:     1
AUTOTHROTTLE:            Enabled (target 0.5 concurrency, max 10s delay)
USER_AGENT:              Rotating pool of 5 browser UAs
PIPELINE:                SupabasePipeline (priority 300)
LOG_LEVEL:               INFO
```

### Spiders (10 total)

| Spider | File | Command | Data Target | Status |
| --- | --- | --- | --- | --- |
| `myneta` | `myneta_spider.py` | `scrapy crawl myneta` | Politicians, criminal cases, assets | Active |
| `prs_attendance` | `prs_attendance.py` | `scrapy crawl prs_attendance` | Attendance records | Active (66/543 matched) |
| `news` | `news_spider.py` | `scrapy crawl news` | Controversies | Active (1,814 scraped) |
| `ecourts` | `ecourts_spider.py` | `scrapy crawl ecourts` | Criminal case updates | Ready (needs case_numbers) |
| `mplad` | `mplad_spider.py` | `scrapy crawl mplad` | Fund usage | Ready (needs portal data) |
| `mca21` | `mca21_spider.py` | `scrapy crawl mca21` | Company interests | Blocked (needs API key) |
| `gem` | `gem_spider.py` | `scrapy crawl gem` | Govt tenders | Blocked (needs company data) |
| `eci_affidavit` | `eci_affidavit.py` | — | Asset declarations | Phase 2 stub |
| `sansad` | `sansad_spider.py` | — | Parliament data | Phase 2 stub |

### Spider Details

**myneta** — Main data pipeline
- Scrapes myneta.info candidate pages
- Supports: Lok Sabha (`house=lok_sabha`), Rajya Sabha (`house=rajya_sabha`), Vidhan Sabha (`house=vidhan_sabha`), all (`house=both`)
- Dynamic criminal case column detection via `<th>` header parsing (Phase 3.0 fix)
- Detects `_CASE_HEADER_MAP` keywords: ipc, section, act, court, case no, case type, description, status, penalty
- Fallback to legacy column positions if headers not found

**news** — Google News RSS controversy tracker
- Searches: `"{politician_name}" {keyword}` via Google News RSS
- Keywords: scam, arrest, raid, FIR, ED, CBI, corruption, scandal, controversy, fraud, money laundering
- Severity classification: critical (ED/CBI action), high (arrest/FIR), medium (corruption allegation), low (general controversy)
- Deduplication by URL
- Supports `-a limit=N` to cap number of politicians processed
- Supports `-a dry_run=true` to skip DB writes

**ecourts** — eCourts case status tracker
- Loads criminal cases with `case_number` from DB
- Queries `services.ecourts.gov.in/ecourtindia_v6/` API
- Extracts: CNR number, case status, hearing dates, judge name
- Updates `ecourts_case_id` field on existing criminal cases

**mplad** — MPLAD fund utilization
- Loads Lok Sabha MPs from DB
- Searches `mplads.gov.in` by constituency
- Parses fund allocation/release/utilization tables
- Calculates utilization percentage

### Celery Beat Schedule

| Job | Task | Schedule | Description |
| --- | --- | --- | --- |
| `scrape-myneta-weekly` | `run_myneta_scraper` | Sunday 2:00 AM IST | Full MyNeta re-scrape |
| `scrape-prs-weekly` | `run_prs_scraper` | Sunday 3:00 AM IST | PRS attendance update |
| `compute-signals-daily` | `compute_corruption_signals` | Daily 4:00 AM IST | Recompute all signals |
| `sync-search-daily` | `sync_search_index` | Daily 5:00 AM IST | Meilisearch re-index |
| `scrape-news-daily` | `scrape_controversies` | Daily 6:00 AM IST | Google News scan |
| `scrape-ecourts-weekly` | `update_ecourts_status` | Sunday 7:00 AM IST | eCourts polling |
| `scrape-mplad-monthly` | `scrape_mplad_funds` | 1st of month 8:00 AM IST | MPLAD data refresh |

### Pipeline (`pipelines/supabase_pipeline.py`)

Routes items by `item_type`:
- `politician` → upsert into `politicians` + `parties`
- `criminal_case` → insert into `criminal_cases`
- `asset` → insert into `assets_declarations`
- `attendance` → upsert into `attendance_records`
- `controversy` → insert into `controversies` (dedup by URL)
- `ecourts_update` → update `criminal_cases` with CNR/status
- `fund_usage` → insert into `fund_usage`
- `company` → insert into `company_interests`
- `tender` → insert into `govt_tenders`

---

## Public REST API

**Base URL:** `/api/v1/`
**Rate Limit:** 100 requests/minute per IP (in-memory)
**CORS:** Open (`*`)
**Cache:** `s-maxage=300, stale-while-revalidate=600`
**Response Format:**
```json
{
  "data": [...],
  "meta": {
    "total": 549,
    "page": 1,
    "per_page": 20,
    "timestamp": "2026-03-11T12:00:00.000Z"
  }
}
```

### Endpoints

#### `GET /api/v1/politicians`
List politicians with optional filters.

| Parameter | Type | Description |
| --- | --- | --- |
| `page` | int | Page number (default: 1) |
| `per_page` | int | Items per page (default: 20, max: 100) |
| `state` | string | Filter by state name |
| `house` | string | Filter by `lok_sabha`, `rajya_sabha`, `vidhan_sabha` |
| `has_cases` | boolean | Filter by criminal case presence |
| `q` | string | Search by name |

#### `GET /api/v1/politicians/[slug]`
Full politician profile with all related data (cases, attendance, controversies, signals, fund usage).

#### `GET /api/v1/parties`
List all parties with MP counts.

#### `GET /api/v1/stats`
Aggregate platform statistics.

---

## Phase Roadmap

### Phase 1 — Foundation (Complete)
- [x] Supabase schema (11 tables, RLS, policies)
- [x] MyNeta spider (Lok Sabha + Rajya Sabha winners)
- [x] Criminal case parsing from affidavits
- [x] Politician profile pages (tabbed layout)
- [x] Browse/search pages with Meilisearch
- [x] Party pages with MP breakdown
- [x] Homepage with stats, India map, top MPs
- [x] Responsive dark UI with design system
- [x] 35 parties seeded, 545 LS + 4 RS MPs scraped

### Phase 2 — Depth (Complete)
- [x] PRS India attendance spider (66 records matched)
- [x] Corruption signal computation engine (heinous cases, high case count, low attendance)
- [x] MCA21 company interests spider (ready — needs API key)
- [x] GeM tender tracking spider (ready — needs company data)
- [x] Celery + Redis scheduler (4 scheduled jobs)
- [x] Vidhan Sabha MLA support (4 test MLAs)
- [x] State-level pages
- [x] Meilisearch full-text search integration

### Phase 3 — Intelligence (Complete)
- [x] **3.0** Criminal case parser fix — dynamic `<th>` column detection
- [x] **3A** Controversy tracker — Google News RSS spider (1,814 controversies scraped)
- [x] **3B** eCourts live case tracking — spider + CNR badge UI
- [x] **3C** MPLAD fund usage — spider + utilization bar UI
- [x] **3D** Public REST API — 4 endpoints + interactive docs page
- [x] Frontend safety filters for garbled legacy data (regex guards on IPC, court_name, case_description)
- [x] API docs page linked in site navigation
- [x] Celery beat schedule expanded (7 scheduled jobs total)

### Phase 4 — Scale (Planned)
- [ ] Full Vidhan Sabha scrape (all 28 states + 8 UTs)
- [ ] OpenCorporates API integration for company data
- [ ] Wealth trend analysis (multi-year asset tracking)
- [ ] Email/webhook alerts for case status changes
- [ ] User accounts for watchlists
- [ ] PDF report generation per politician
- [ ] Vercel production deployment with Meilisearch Cloud

---

## Data Sources

| Source | URL | Data Provided | Update Frequency |
| --- | --- | --- | --- |
| MyNeta / ADR | myneta.info | Politician profiles, criminal cases, assets | Weekly |
| ECI Affidavit Portal | affidavit.eci.gov.in | Official election affidavits | Per election |
| PRS Legislative Research | prsindia.org | Parliamentary attendance, performance | Weekly |
| eCourts India | ecourts.gov.in | Live case status, CNR numbers | Weekly |
| Google News RSS | news.google.com | Controversy tracking | Daily |
| MPLADS Portal | mplads.gov.in | Fund utilization data | Monthly |
| MCA21 | mca.gov.in | Company directorships | As needed |
| GeM Portal | gem.gov.in | Government procurement | As needed |
| Sansad.in | sansad.in | Official Lok Sabha data | As needed |

---

## Environment Setup

### Prerequisites
- Node.js 18+
- Python 3.10+ (Anaconda recommended on Windows)
- Docker (for Meilisearch locally)
- Redis (for Celery — `docker run -d -p 6379:6379 redis:alpine`)

### Frontend (`/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://uuridzmajcooiwcpoyyt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_MEILISEARCH_HOST=http://localhost:7700
NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY=<search-key>
```

### Scraper (`/scraper/.env`)
```env
SUPABASE_URL=https://uuridzmajcooiwcpoyyt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_ADMIN_KEY=<admin-key>
REDIS_URL=redis://localhost:6379/0
OPENCORPORATES_API_KEY=<optional-for-mca21>
```

### Windows Note
Windows has conflicting Python stubs in `WindowsApps`. Use Anaconda Python explicitly or ensure Anaconda is first in `PATH`.

---

## Commands Reference

### Frontend
```bash
npm run dev         # Start dev server (localhost:3000)
npm run build       # Production build
npm run start       # Start production server
npm run lint        # ESLint check
```

### Scraper
```bash
cd scraper

# Main data
scrapy crawl myneta                          # LS + RS winners
scrapy crawl myneta -a house=vidhan_sabha    # All state MLAs
scrapy crawl myneta -a house=both            # Everything

# Enrichment
scrapy crawl prs_attendance                  # PRS attendance data
scrapy crawl news                            # Google News controversies
scrapy crawl news -a limit=20               # Limit to 20 politicians
scrapy crawl news -a dry_run=true -a limit=5 # Test without DB writes
scrapy crawl ecourts                         # eCourts case updates
scrapy crawl mplad                           # MPLAD fund data
scrapy crawl mca21                           # Company interests (needs API key)
scrapy crawl gem                             # GeM tenders (needs company data)
```

### Celery
```bash
cd scraper
celery -A celery_app worker --loglevel=info  # Start worker
celery -A celery_app beat --loglevel=info    # Start scheduler
```

### Meilisearch (Docker)
```bash
docker run -d -p 7700:7700 \
  -e MEILI_MASTER_KEY=<your-key> \
  getmeili/meilisearch:latest
```

---

## Known Issues & Quirks

1. **Supabase `never` type inference:** `.eq("is_active", true)` on `boolean | null` columns causes Supabase client to infer result type as `never`. Workaround: cast with `as unknown as YourType[]`.

2. **Garbled legacy case data:** The old parser (before Phase 3.0 fix) stored data in wrong columns — years as IPC sections, rupee amounts as court names. Frontend has regex safety filters to hide these. A full re-scrape with the fixed parser would clean this up.

3. **PRS pagination:** Only 66/543 MPs matched due to AJAX pagination on PRS India. The spider only captures the first page of results. Needs Playwright integration for JS rendering.

4. **Indian number formatting:** All currency values use lakhs/crores (not millions/billions). The `formatIndianCurrency()` function in `lib/formatters.ts` handles this.

---

## Changelog

### 2026-03-12 — Asset Parser Fix + Full Re-scrape
- **Fixed:** Asset extraction was reading wrong table columns (grabbed `dependent3` instead of `self`)
- **Fixed:** MyNeta asset tables have multi-column layout: `Sr No | Description | Self | Spouse | HUF | Dep1...` — now reads col 1 (description) as label and col 2 (self) as value
- **Fixed:** Added unique constraint `uq_assets_politician_year` on `assets_declarations(politician_id, declaration_year)` — was missing, causing upserts to silently fail
- **Fixed:** `parse_assets_table()` improved: skips header rows, skips descriptive text in values, handles summary table (`Assets: Rs X` / `Liabilities: Rs X`), computes net worth from total_assets - total_liabilities
- **Data:** Full MyNeta re-scrape: 546 politicians, 1,701 criminal cases, 545 asset declarations
- **Data:** Average MP net worth: ~Rs 39.25 Cr, max ~Rs 4,667 Cr

### 2026-03-11 — Phase 3 Finalization
- **Added:** API docs link to Header navigation and Footer platform links
- **Added:** `PROJECT.md` comprehensive documentation file
- **Updated:** Footer phase indicator from "Phase 1" to "Phase 3"
- **Data:** News spider run — 1,814 controversies populated in database

### 2026-03-10 — Phase 3 Implementation
- **Added:** `news_spider.py` — Google News RSS controversy spider with severity classification
- **Added:** `ecourts_spider.py` + `ecourts_parser.py` — eCourts live case tracking
- **Added:** `mplad_spider.py` — MPLAD fund utilization scraper
- **Added:** Public REST API (`/api/v1/politicians`, `/api/v1/parties`, `/api/v1/stats`)
- **Added:** `api-helpers.ts` — Pagination, rate limiting (100 req/min), CORS, response envelope
- **Added:** `/api-docs` page — Interactive API documentation
- **Added:** 3 new Celery tasks + beat schedule entries (news daily, ecourts weekly, mplad monthly)
- **Added:** 3 new pipeline handlers (controversy, ecourts_update, fund_usage)
- **Fixed:** Criminal case parser — dynamic `<th>` column detection with `_CASE_HEADER_MAP`
- **Fixed:** `declaration_year` hardcoded to 2024 → now uses `response.meta`
- **Fixed:** Frontend regex filters to hide garbled data (years in IPC, rupee amounts in court names)
- **Fixed:** Supabase `never` type inference in API routes (explicit type casting)
- **Fixed:** ESLint errors in TabLayout component (props for controversies/fundUsage)

### 2026-03-09 — Phase 2 Implementation
- **Added:** PRS attendance spider (66 records)
- **Added:** Corruption signal engine (heinous cases, high case count, low attendance, wealth surge)
- **Added:** MCA21 company interests spider (ready for API key)
- **Added:** GeM tender tracking spider (ready for company data)
- **Added:** Celery + Redis scheduler with 4 initial jobs
- **Added:** Vidhan Sabha MLA support in MyNeta spider
- **Added:** State-level breakdown pages
- **Added:** Meilisearch search integration

### 2026-03-08 — Phase 1 Implementation
- **Initial commit:** Next.js 14 + Supabase + Tailwind project scaffold
- **Added:** 11-table database schema with RLS
- **Added:** MyNeta spider for Lok Sabha + Rajya Sabha
- **Added:** 35 parties seeded
- **Added:** 549 politicians scraped (545 LS + 4 MLA)
- **Added:** Browse, search, party, profile pages
- **Added:** Homepage with stats, India SVG map, top MPs
- **Added:** Dark design system (IBM Plex fonts, gold accent, data-forward layout)

---

*This file is maintained as the single source of truth for the NETAwatch project. Update it after every significant change.*
