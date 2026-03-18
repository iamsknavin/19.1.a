"""
Scrapy settings for 19.1.a scraper.
Polite scraping: 1.5s delay, auto-throttle, robots.txt respected.
"""
import os
from dotenv import load_dotenv

load_dotenv()

BOT_NAME = "nineteen1a_scraper"
SPIDER_MODULES = ["spiders"]
NEWSPIDER_MODULE = "spiders"

# --- Polite scraping ---
ROBOTSTXT_OBEY = True
DOWNLOAD_DELAY = 1.5
RANDOMIZE_DOWNLOAD_DELAY = True  # 0.5x–1.5x of DOWNLOAD_DELAY
CONCURRENT_REQUESTS = 1
CONCURRENT_REQUESTS_PER_DOMAIN = 1

AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1.5
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 0.5
AUTOTHROTTLE_DEBUG = False

# --- User agent rotation ---
USER_AGENT_LIST = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
]

# Enable user agent rotation via middleware
DOWNLOADER_MIDDLEWARES = {
    "middlewares.RotateUserAgentMiddleware": 400,
    # Phase 2: Uncomment to enable proxy rotation
    # "scrapy_rotating_proxies.middlewares.RotatingProxyMiddleware": 610,
    # "scrapy_rotating_proxies.middlewares.BanDetectionMiddleware": 620,
}

# --- HTTP cache (enable when debugging to avoid re-hitting the server) ---
HTTPCACHE_ENABLED = False  # Set to True during development
HTTPCACHE_EXPIRATION_SECS = 86400  # 24 hours
HTTPCACHE_DIR = ".scrapy_cache"
HTTPCACHE_IGNORE_HTTP_CODES = [503, 429]

# --- Pipelines ---
ITEM_PIPELINES = {
    "pipelines.supabase_pipeline.SupabasePipeline": 300,
}

# --- Output ---
LOG_LEVEL = "INFO"
FEED_EXPORT_ENCODING = "utf-8"

# --- Playwright (for JS-heavy pages in Phase 2) ---
# DOWNLOAD_HANDLERS = {
#     "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
#     "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
# }
# PLAYWRIGHT_BROWSER_TYPE = "chromium"

# --- Environment ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
MEILISEARCH_HOST = os.getenv("MEILISEARCH_HOST", "http://localhost:7700")
MEILISEARCH_ADMIN_KEY = os.getenv("MEILISEARCH_ADMIN_KEY", "")
DRY_RUN = os.getenv("DRY_RUN", "false").lower() == "true"
