export const PHASE_CONFIG = {
  current: 3,
  features: {
    // Phase 2 — LIVE
    company_interests: true,
    corruption_signals: true,
    mla_data: true,

    // Phase 3 — LIVE
    ecourts_live: true,
    controversy_tracker: true,
    mplad_tracking: true,
    public_api: true,

    // Phase 4 — Coming Soon
    tender_tracking: false,        // GeM tenders — needs fuller company_interests data
    rajya_sabha_data: false,       // RS members — needs Sansad.in scraper
    full_attendance: false,        // Full 543 MPs — PRS AJAX pagination needs Playwright
  },
} as const;

export type PhaseFeature = keyof typeof PHASE_CONFIG.features;

/** Features planned for Phase 4 */
export const PHASE_4_FEATURES = [
  {
    key: "tender_tracking",
    title: "GeM Tender Tracking",
    description: "Cross-reference MP company interests with ₹ government procurement contracts on the GeM portal. Flags potential conflicts of interest.",
    eta: "Phase 4",
  },
  {
    key: "rajya_sabha_data",
    title: "Rajya Sabha Members",
    description: "Full Rajya Sabha member profiles including business declarations, attendance, and case history sourced from Sansad.in.",
    eta: "Phase 4",
  },
  {
    key: "full_attendance",
    title: "Complete Attendance Data",
    description: "Expand attendance coverage to all 543 Lok Sabha MPs. Currently 452 matched via PRS — AJAX pagination improvement in progress.",
    eta: "Phase 4",
  },
] as const;

export const DATA_SOURCES = {
  myneta: {
    name: "MyNeta / ADR",
    url: "https://www.myneta.info",
    description: "Candidate affidavit data aggregated by Association for Democratic Reforms",
    phase: 1,
  },
  eci: {
    name: "Election Commission of India",
    url: "https://affidavit.eci.gov.in",
    description: "Official ECI affidavit portal",
    phase: 1,
  },
  prs: {
    name: "PRS Legislative Research",
    url: "https://prsindia.org",
    description: "Parliamentary attendance and performance data",
    phase: 2,
  },
  sansad: {
    name: "Sansad.in",
    url: "https://sansad.in",
    description: "Official Lok Sabha data portal — Rajya Sabha scraper planned for Phase 4",
    phase: 4,
  },
  mca21: {
    name: "MyNeta Interest Declarations",
    url: "https://myneta.info/InterestbyRajyasabhaMember/",
    description: "Company directorships and business interests from RS member interest declarations",
    phase: 2,
  },
  gem: {
    name: "GeM Portal",
    url: "https://gem.gov.in",
    description: "Government e-Marketplace procurement data — planned for Phase 4",
    phase: 4,
  },
  ecourts: {
    name: "eCourts India",
    url: "https://ecourts.gov.in",
    description: "Live case status from the national court data portal",
    phase: 3,
  },
  gnews: {
    name: "Google News",
    url: "https://news.google.com",
    description: "Controversy and news tracking via RSS feeds",
    phase: 3,
  },
  mplads: {
    name: "MPLADS Portal",
    url: "https://www.mplads.gov.in",
    description: "MP Local Area Development Scheme fund utilization data",
    phase: 3,
  },
} as const;
