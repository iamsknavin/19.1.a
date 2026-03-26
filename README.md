# 19.1.a

**Indian politician transparency platform.** Your right to know. Every rupee. Every case. Every vote.

> *"All citizens shall have the right to freedom of speech and expression."*
> — Article 19(1)(a), Constitution of India

Track Lok Sabha MPs, State MLAs, wealth declarations, criminal cases, controversies, and parliamentary performance — all sourced from mandatory public disclosures.

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Open Source](https://img.shields.io/badge/open-source-blue.svg)](https://github.com/iamsknavin/19.1.a)

---

## What it does

- **Assets & Wealth** — Net worth, movable and immovable assets from ECI affidavits
- **Criminal Cases** — Self-declared cases with IPC sections, court names, eCourts linking
- **Controversy Tracker** — Google News RSS monitoring with severity badges
- **Parliamentary Performance** — Attendance, questions, debates from PRS India
- **Corruption Signals** — Automated risk detection based on declared data
- **MPLAD Fund Tracking** — MP fund allocation and utilization data
- **Party Analysis** — Aggregate stats per party: wealth, cases, seat count
- **Search** — Fast full-text search via Meilisearch (name, party, constituency)
- **Public REST API** — `/api/v1/` endpoints for researchers and journalists

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | Next.js 14 App Router + TypeScript + Tailwind |
| Database | Supabase (PostgreSQL) |
| Search | Meilisearch (optional — falls back to Supabase full-text search) |
| Scraper | Python + Scrapy |
| Hosting | Vercel (frontend) + Supabase (DB) |

## Current Data

544 Lok Sabha MPs (18th Lok Sabha, incl. Priyanka Gandhi Vadra Wayanad by-election)

| Table | Records | Source |
|-------|---------|--------|
| Politicians | 544 | MyNeta / ADR + ECI |
| Criminal Cases | 717 | ECI Affidavits (via MyNeta) |
| Asset Declarations | 545 | ECI Affidavits (via MyNeta) |
| Controversies | 1,814 | Google News RSS |
| Attendance Records | 66 | PRS Legislative Research |
| Corruption Signals | 29 | Auto-generated |
| Parties | 35 | Manual + ECI |

---

## Running Locally

### Prerequisites

- [Node.js 18+](https://nodejs.org)
- [Python 3.11+](https://python.org)
- [Supabase account](https://supabase.com) (free)
- [Meilisearch](https://meilisearch.com) (local via Docker or Cloud free tier)

### 1. Clone and install

```bash
git clone https://github.com/iamsknavin/19.1.a.git
cd 19.1.a
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase URL, anon key, service role key, and Meilisearch keys
```

Get your keys from:
- [Supabase Dashboard](https://app.supabase.com) → Project Settings → API
- Meilisearch: `docker run -d -p 7700:7700 getmeili/meilisearch:latest` (no key needed locally)

### 3. Start Meilisearch (local dev, optional)

Meilisearch is optional. If it is not running, the search API automatically
falls back to Supabase full-text search (ilike). For production, [Meilisearch Cloud](https://cloud.meilisearch.com) is recommended for typo-tolerance and performance.

```bash
docker run -d -p 7700:7700 getmeili/meilisearch:latest
```

### 4. Run the dev server

```bash
npm run dev
# Open http://localhost:3000
```

---

## Running the Scraper

```bash
cd scraper
python -m venv venv
source venv/bin/activate    # Linux/Mac
# OR: venv\Scripts\activate  # Windows

pip install -r requirements.txt
cp .env.example .env
# Edit .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

### Available spiders:
```bash
scrapy crawl myneta                          # Lok Sabha winners
scrapy crawl myneta -a house=vidhan_sabha    # State MLAs
scrapy crawl prs_attendance                  # PRS attendance data
scrapy crawl news                            # Google News controversies
scrapy crawl ecourts                         # eCourts case updates
scrapy crawl mplad                           # MPLAD fund data
scrapy crawl mca21                           # Company interests (free, no API key)
scrapy crawl gem                             # GeM tenders (needs company data)
```

### Dry run (no DB writes — test first):
```bash
scrapy crawl myneta -a dry_run=true -a limit=10
scrapy crawl news -a dry_run=true -a limit=5
```

### Sync to Meilisearch (after scraping):
```bash
curl -X POST http://localhost:3000/api/sync-search \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

---

## Data Sources

| Source | URL | Data |
|--------|-----|------|
| MyNeta / ADR | myneta.info | Affidavit summaries, criminal cases |
| Election Commission | affidavit.eci.gov.in | Official ECI PDFs |
| PRS India | prsindia.org | Parliamentary attendance |
| Google News | news.google.com | Controversy tracking (RSS) |
| eCourts India | ecourts.gov.in | Live case status |
| MPLADS Portal | mplads.gov.in | Fund utilization data |
| MyNeta RS Interests | myneta.info | Company directorships |
| GeM Portal | gem.gov.in | Government tenders |

---

## Phase 4 Roadmap

| Feature | Status | Notes |
|---------|--------|-------|
| GeM Tender Tracking | Blocked | Waiting on `company_interests` data from MCA21 spider |
| Rajya Sabha Members | In progress | Sansad.in scraper needed (MyNeta has no RS page) |
| Complete Attendance Data | Partial | 91/543 MPs tracked via PRS; AJAX pagination needed |

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=        # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon key (safe for browser)
SUPABASE_SERVICE_ROLE_KEY=       # Service role key (server only, never commit)
NEXT_PUBLIC_MEILISEARCH_HOST=    # Meilisearch URL
NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY=  # Search-only key (safe for browser)
MEILISEARCH_ADMIN_KEY=           # Admin key (server only)
```

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m "Add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## Disclaimer

All data on 19.1.a is sourced from mandatory public disclosures made by politicians themselves. 19.1.a does not make allegations — we present public records. 19.1.a is not affiliated with the Government of India or the Election Commission of India.

---

## Troubleshooting

- **Meilisearch not running:** Search still works via Supabase fallback. For production, use [Meilisearch Cloud](https://cloud.meilisearch.com).
- **Supabase RLS errors:** Ensure your `.env.local` has the correct `SUPABASE_SERVICE_ROLE_KEY` for write operations.
- **Build errors:** Run `npm run lint` first to catch TypeScript issues.

---

## License

[MIT](LICENSE)
