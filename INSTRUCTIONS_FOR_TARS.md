# Instructions for TARS — 19.1.a Operations Guide

> **TARS, this is your operational manual for the 19.1.a scraper system.**
> You are running on an Ubuntu Linux VPS. Your job is to keep the scraper
> pipeline running, the data fresh, and the Celery scheduler healthy.

---

## 1. Quick Orientation

19.1.a is an Indian politician transparency platform. The **frontend**
(Next.js) is deployed separately. Your VPS handles the **scraper system only**:
Python + Scrapy spiders that collect data and write it to a remote Supabase
PostgreSQL database.

**Read `PROJECT.md` in this repository for full documentation** — it contains
the complete architecture diagram, database schema (all 11 tables with columns),
design language, API specs, phase roadmap, and changelog. This file focuses on
what you need to operate the scraper on this VPS.

---

## 2. Repository Structure (Scraper-Relevant)

```
19.1.a/
├── PROJECT.md                  ← Full project documentation (READ THIS)
├── scraper/
│   ├── scrapy.cfg              ← Scrapy project config
│   ├── settings.py             ← Scrapy settings (delays, throttle, pipeline)
│   ├── middlewares.py          ← User-agent rotation middleware
│   ├── requirements.txt       ← Python dependencies
│   ├── .env                   ← YOUR SECRETS GO HERE (create this)
│   ├── celery_app.py          ← Celery beat scheduler config
│   ├── tasks.py               ← 7 Celery task definitions
│   ├── spiders/
│   │   ├── myneta_spider.py   ← Main spider: politicians, cases, assets
│   │   ├── prs_attendance.py  ← PRS India attendance data
│   │   ├── news_spider.py     ← Google News RSS controversies
│   │   ├── ecourts_spider.py  ← eCourts live case tracking
│   │   ├── mplad_spider.py    ← MPLAD fund utilization
│   │   ├── mca21_spider.py    ← Company interests (needs API key)
│   │   ├── gem_spider.py      ← GeM tenders (needs company data)
│   │   ├── eci_affidavit.py   ← ECI affidavit spider (stub)
│   │   └── sansad_spider.py   ← Sansad.in spider (stub)
│   ├── pipelines/
│   │   └── supabase_pipeline.py ← Writes all data to Supabase
│   └── parsers/
│       ├── ecourts_parser.py  ← eCourts response parser
│       ├── cases_parser.py    ← Criminal case extraction
│       ├── assets_parser.py   ← Asset declaration extraction
│       └── affidavit_parser.py ← Affidavit PDF parsing
```

---

## 3. VPS Setup (Ubuntu Linux)

### 3.1 System Dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv git docker.io docker-compose
sudo systemctl enable docker && sudo systemctl start docker
```

### 3.2 Clone the Repository

```bash
cd /opt
sudo git clone https://github.com/iamsknavin/19.1.a.git
sudo chown -R $USER:$USER /opt/19-1-a
cd /opt/19-1-a/scraper
```

### 3.3 Python Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip

# Install core dependencies
pip install scrapy requests supabase python-dotenv

# Install Celery + Redis for scheduling
pip install celery redis
```

### 3.4 Redis (for Celery)

```bash
# Option A: Docker (recommended)
docker run -d --name redis --restart unless-stopped -p 6379:6379 redis:alpine

# Option B: System package
# sudo apt install -y redis-server
# sudo systemctl enable redis-server
```

### 3.5 Environment File

Create `/opt/19-1-a/scraper/.env`:

```env
# === REQUIRED ===
SUPABASE_URL=https://uuridzmajcooiwcpoyyt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<get-from-supabase-dashboard>
REDIS_URL=redis://localhost:6379/0

# === OPTIONAL ===
MEILISEARCH_HOST=<meilisearch-cloud-url-if-applicable>
MEILISEARCH_ADMIN_KEY=<meilisearch-admin-key>
OPENCORPORATES_API_KEY=<optional-not-needed-for-myneta-rs-scraping>
DRY_RUN=false
```

**To get the Supabase service role key:**
1. Go to https://supabase.com/dashboard
2. Select project `uuridzmajcooiwcpoyyt`
3. Settings → API → Service Role Key (secret)
4. Copy it into the `.env` file above

**NEVER commit the `.env` file to git. It is in `.gitignore`.**

---

## 4. Supabase Connection

The scraper connects to Supabase via the Python `supabase` client library.
The connection is established in `pipelines/supabase_pipeline.py` at spider
start using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment.

**Key details:**
- **Project ID:** `uuridzmajcooiwcpoyyt`
- **Region:** `ap-south-1` (Mumbai)
- **URL:** `https://uuridzmajcooiwcpoyyt.supabase.co`
- **Auth:** Service role key (full DB access, bypasses RLS)
- **Database:** PostgreSQL with 11 tables, all RLS-enabled

The pipeline uses the **service role key** (not the anon key) because it needs
write access and must bypass Row Level Security policies. The anon key only
has read access.

### Connection Test

```bash
cd /opt/19-1-a/scraper
source venv/bin/activate
python3 -c "
from dotenv import load_dotenv
import os
load_dotenv()
from supabase import create_client
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])
result = sb.table('politicians').select('id', count='exact').limit(1).execute()
print(f'Connected OK. Politicians in DB: {result.count}')
"
```

---

## 5. How the Scraper Works

### 5.1 Pipeline Flow

```
Spider crawls website
    ↓
Yields item dict with item_type field
    ↓
SupabasePipeline.process_item() routes by item_type:
    "politician"     → upsert politicians + insert cases + upsert assets
    "attendance"     → upsert attendance_records (match by name)
    "controversy"    → insert into controversies
    "ecourts_update" → update criminal_cases with CNR/status
    "fund_usage"     → insert into fund_usage
    "company_interest" → insert into company_interests
    "tender"         → insert into govt_tenders
    ↓
Data written to Supabase PostgreSQL
```

### 5.2 Polite Scraping Settings

The scraper is configured to be respectful:
- `ROBOTSTXT_OBEY = True` — respects robots.txt
- `DOWNLOAD_DELAY = 1.5` — 1.5 seconds between requests
- `RANDOMIZE_DOWNLOAD_DELAY = True` — randomized 0.5x–1.5x
- `CONCURRENT_REQUESTS = 1` — one request at a time
- `AUTOTHROTTLE_ENABLED = True` — auto-adjusts delay up to 10s
- User-agent rotation across 5 browser UAs

**DO NOT decrease these delays. We want to be good citizens.**

### 5.3 Upsert vs Insert Behavior

| Data Type       | Method  | Dedup Key                      | Safe to re-run? |
| --------------- | ------- | ------------------------------ | --------------- |
| Politicians     | UPSERT  | `slug` (unique)                | Yes             |
| Assets          | UPSERT  | `politician_id, declaration_year` | Yes          |
| Criminal Cases  | INSERT  | None                           | NO — duplicates |
| Attendance      | UPSERT  | `politician_id, session_year`  | Yes             |
| Controversies   | INSERT  | None                           | Duplicates possible |
| Fund Usage      | INSERT  | None                           | Duplicates possible |

**CRITICAL:** Before re-running `myneta` spider, you MUST delete existing
criminal cases first to avoid duplicates:

```sql
-- Run via Supabase SQL Editor or psql
DELETE FROM criminal_cases;
```

Then run the spider. For controversies, the news spider has internal URL-based
dedup within a single run, but running it multiple times can create duplicates
over time. Consider dedup queries periodically.

---

## 6. Spider Commands

Always run from the scraper directory with the venv activated:

```bash
cd /opt/19-1-a/scraper
source venv/bin/activate
```

### 6.1 Main Data (MyNeta)

```bash
# Full scrape — Lok Sabha + Rajya Sabha winners
scrapy crawl myneta

# Specific houses
scrapy crawl myneta -a house=lok_sabha
scrapy crawl myneta -a house=rajya_sabha
scrapy crawl myneta -a house=vidhan_sabha    # State MLAs
scrapy crawl myneta -a house=both            # LS + RS
```

**Duration:** ~15-20 minutes for ~549 politicians at 1.5s delay.

**Before re-running:** Delete criminal_cases to avoid duplicates (see section 5.3).

### 6.2 Enrichment Spiders

```bash
# PRS India parliamentary attendance
scrapy crawl prs_attendance

# Google News controversies
scrapy crawl news                            # All politicians
scrapy crawl news -a limit=20               # First 20 only
scrapy crawl news -a dry_run=true -a limit=5 # Test without DB writes

# eCourts live case tracking (needs valid case_numbers in DB)
scrapy crawl ecourts

# MPLAD fund utilization (needs MPLAD portal to be up)
scrapy crawl mplad

# Company interests (free — scrapes MyNeta RS interest declarations)
scrapy crawl mca21

# GeM tenders (needs company_interests data from mca21 first)
scrapy crawl gem
```

### 6.3 Dry Run Mode

To test any spider without writing to the database:

```bash
# Global dry run via environment
DRY_RUN=true scrapy crawl myneta

# Spider-specific dry run (news spider only)
scrapy crawl news -a dry_run=true -a limit=5
```

---

## 7. Celery Scheduler (Automated Runs)

Celery handles automated scheduling. It needs Redis running.

### 7.1 Start Services

```bash
cd /opt/19-1-a/scraper
source venv/bin/activate

# Terminal 1: Celery worker (executes tasks)
celery -A celery_app worker --loglevel=info

# Terminal 2: Celery beat (schedules tasks)
celery -A celery_app beat --loglevel=info
```

### 7.2 Systemd Services (Production)

Create systemd units so Celery survives reboots:

**/etc/systemd/system/nineteen1a-worker.service:**
```ini
[Unit]
Description=19.1.a Celery Worker
After=network.target redis.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/19-1-a/scraper
Environment="PATH=/opt/19-1-a/scraper/venv/bin"
ExecStart=/opt/19-1-a/scraper/venv/bin/celery -A celery_app worker --loglevel=info
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**/etc/systemd/system/nineteen1a-beat.service:**
```ini
[Unit]
Description=19.1.a Celery Beat Scheduler
After=network.target redis.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/19-1-a/scraper
Environment="PATH=/opt/19-1-a/scraper/venv/bin"
ExecStart=/opt/19-1-a/scraper/venv/bin/celery -A celery_app beat --loglevel=info
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable nineteen1a-worker nineteen1a-beat
sudo systemctl start nineteen1a-worker nineteen1a-beat

# Check status
sudo systemctl status nineteen1a-worker
sudo systemctl status nineteen1a-beat

# View logs
sudo journalctl -u nineteen1a-worker -f
sudo journalctl -u nineteen1a-beat -f
```

### 7.3 Beat Schedule (All Times IST — Asia/Kolkata)

| Job                      | Schedule                  | What it does                       |
| ------------------------ | ------------------------- | ---------------------------------- |
| `scrape-myneta-weekly`   | Sunday 2:00 AM            | Full MyNeta re-scrape              |
| `scrape-prs-weekly`      | Sunday 3:00 AM            | PRS attendance update              |
| `compute-signals-daily`  | Daily 4:00 AM             | Recompute corruption signals       |
| `sync-search-daily`      | Daily 5:00 AM             | Sync Meilisearch index             |
| `scrape-news-daily`      | Daily 6:00 AM             | Google News controversy scan       |
| `scrape-ecourts-weekly`  | Sunday 7:00 AM            | eCourts case status polling        |
| `scrape-mplad-monthly`   | 1st of month 8:00 AM      | MPLAD fund data refresh            |

**WARNING about `scrape-myneta-weekly`:** The Celery task runs `myneta` via
`_run_spider()` which does NOT delete criminal_cases first. This will create
duplicate cases every week. You have two options:

**Option A:** Add a pre-task SQL delete (recommended — modify `tasks.py`):
```python
@app.task(bind=True, max_retries=2, default_retry_delay=300)
def run_myneta_scraper(self, house: str = "both"):
    # Delete old cases before re-scraping
    from supabase import create_client
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    sb.table("criminal_cases").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    return _run_spider("myneta", house=house)
```

**Option B:** Run a weekly cron job that deletes cases before the Celery task:
```bash
# crontab -e
55 1 * * 0 cd /opt/19-1-a/scraper && source venv/bin/activate && python3 -c "
from dotenv import load_dotenv; load_dotenv(); import os
from supabase import create_client
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])
sb.table('criminal_cases').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
print('Cleared criminal_cases')
"
```

---

## 8. Data Verification Queries

Run these via Supabase SQL Editor or `psql` to check data health:

```sql
-- Overall row counts
SELECT
  (SELECT count(*) FROM politicians) as politicians,
  (SELECT count(*) FROM criminal_cases) as criminal_cases,
  (SELECT count(*) FROM corruption_signals) as corruption_signals,
  (SELECT count(*) FROM controversies) as controversies,
  (SELECT count(*) FROM attendance_records) as attendance_records,
  (SELECT count(*) FROM assets_declarations) as assets_declarations,
  (SELECT count(*) FROM parties) as parties;

-- Check for garbled case data (should be 0 after re-scrape)
SELECT count(*) FROM criminal_cases
WHERE ipc_sections IS NOT NULL
  AND array_length(ipc_sections, 1) = 1
  AND ipc_sections[1] ~ '^\d{4}$';

-- Check for duplicate criminal cases
SELECT politician_id, case_number, court_name, count(*)
FROM criminal_cases
GROUP BY politician_id, case_number, court_name
HAVING count(*) > 1
LIMIT 20;

-- Check for duplicate controversies
SELECT politician_id, title, count(*)
FROM controversies
GROUP BY politician_id, title
HAVING count(*) > 1
LIMIT 20;

-- Politicians by house
SELECT house, count(*) FROM politicians GROUP BY house;

-- Top 10 politicians by case count
SELECT p.name, p.constituency, p.state, count(c.id) as cases
FROM politicians p
LEFT JOIN criminal_cases c ON c.politician_id = p.id
GROUP BY p.id ORDER BY cases DESC LIMIT 10;
```

---

## 9. Troubleshooting

### Spider fails with connection error
```bash
# Test Supabase connectivity
curl -s https://uuridzmajcooiwcpoyyt.supabase.co/rest/v1/ \
  -H "apikey: <your-anon-key>" | head -c 200
```

### Redis not running
```bash
docker ps | grep redis
# If not running:
docker start redis
# Or re-create:
docker run -d --name redis --restart unless-stopped -p 6379:6379 redis:alpine
```

### Celery tasks stuck
```bash
# Purge all pending tasks
celery -A celery_app purge

# Restart worker
sudo systemctl restart nineteen1a-worker
```

### Spider blocked / rate-limited
The autothrottle will back off automatically. If you get 429s or 503s:
- Wait an hour before retrying
- DO NOT disable ROBOTSTXT_OBEY or reduce delays
- Check the HTTP cache: set `HTTPCACHE_ENABLED = True` in `settings.py` for debugging

### Check spider logs
```bash
# Run spider with debug logging
scrapy crawl myneta --loglevel=DEBUG 2>&1 | tee /tmp/myneta.log

# Check last Celery task output
sudo journalctl -u nineteen1a-worker --since "1 hour ago" | tail -100
```

---

## 10. Maintenance Tasks

### Weekly
- Check `sudo journalctl -u nineteen1a-worker -f` for errors
- Verify data counts with SQL queries (section 8)
- Check for duplicate controversies and clean if needed

### Monthly
- `git pull` to get latest spider fixes
- `pip install -r requirements.txt` to update dependencies
- Review Celery beat schedule for any timing conflicts
- Check Supabase usage dashboard for storage/bandwidth

### After Code Updates
- Always `git pull` then restart Celery:
  ```bash
  sudo systemctl restart nineteen1a-worker nineteen1a-beat
  ```
- If spider logic changed (especially `myneta_spider.py`), consider a full re-scrape
- Update `PROJECT.md` changelog with what changed

---

## 11. File Reference

| File | Purpose | When to modify |
| --- | --- | --- |
| `PROJECT.md` | Full project docs, schema, design, changelog | After every significant change |
| `scraper/.env` | Secrets (Supabase, Redis, API keys) | On first setup or key rotation |
| `scraper/settings.py` | Scrapy config (delays, throttle, pipeline) | Rarely — only if scraping behavior needs change |
| `scraper/celery_app.py` | Celery beat schedule (cron times) | When changing scrape frequency |
| `scraper/tasks.py` | Task definitions (what each scheduled job does) | When adding new scheduled spiders |
| `scraper/spiders/myneta_spider.py` | Main scraper — politicians, cases, assets | When MyNeta HTML structure changes |
| `scraper/spiders/news_spider.py` | Google News RSS controversies | When adding new controversy keywords |
| `scraper/pipelines/supabase_pipeline.py` | DB write logic for all item types | When adding new data types |
| `scraper/parsers/ecourts_parser.py` | eCourts response parsing | When eCourts API changes |
| `lib/ipc-sections.ts` | IPC section → human-readable crime labels | When adding new IPC sections |

---

## 12. Quick Start Checklist

```
[ ] 1. Clone repo to /opt/19-1-a
[ ] 2. Create Python venv and install dependencies
[ ] 3. Start Redis (Docker)
[ ] 4. Create scraper/.env with Supabase service role key
[ ] 5. Test Supabase connection (section 4)
[ ] 6. Run initial scrape: scrapy crawl myneta
[ ] 7. Run news spider: scrapy crawl news
[ ] 8. Verify data with SQL queries (section 8)
[ ] 9. Set up systemd services for Celery worker + beat
[ ] 10. Enable and start services
[ ] 11. Monitor logs for first 24 hours
```

---

*TARS, refer to `PROJECT.md` for the complete database schema, design language,
color palette, component patterns, and full changelog. This file is your
operational runbook. PROJECT.md is your reference manual. Update PROJECT.md changelog after you make any changes to code/repo*
