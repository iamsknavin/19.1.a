export const PHASE_CONFIG = {
  current: 3,
  features: {
    company_interests: false, // Phase 2
    tender_tracking: false, // Phase 2
    corruption_signals: true, // Phase 2 — LIVE
    mla_data: true, // Phase 2 — LIVE
    ecourts_live: true, // Phase 3 — LIVE
    controversy_tracker: true, // Phase 3 — LIVE
    mplad_tracking: true, // Phase 3 — LIVE
    public_api: true, // Phase 3 — LIVE
  },
} as const;

export type PhaseFeature = keyof typeof PHASE_CONFIG.features;

export const DATA_SOURCES = {
  myneta: {
    name: "MyNeta / ADR",
    url: "https://www.myneta.info",
    description: "Candidate affidavit data aggregated by Association for Democratic Reforms",
  },
  eci: {
    name: "Election Commission of India",
    url: "https://affidavit.eci.gov.in",
    description: "Official ECI affidavit portal",
  },
  prs: {
    name: "PRS Legislative Research",
    url: "https://prsindia.org",
    description: "Parliamentary attendance and performance data",
  },
  sansad: {
    name: "Sansad.in",
    url: "https://sansad.in",
    description: "Official Lok Sabha data portal",
  },
  mca21: {
    name: "MCA21 / Ministry of Corporate Affairs",
    url: "https://www.mca.gov.in",
    description: "Company registration and director data (Phase 2)",
  },
  gem: {
    name: "GeM Portal",
    url: "https://gem.gov.in",
    description: "Government e-Marketplace procurement data (Phase 2)",
  },
  ecourts: {
    name: "eCourts India",
    url: "https://ecourts.gov.in",
    description: "Live case status from the national court data portal",
  },
  gnews: {
    name: "Google News",
    url: "https://news.google.com",
    description: "Controversy and news tracking via RSS feeds",
  },
  mplads: {
    name: "MPLADS Portal",
    url: "https://www.mplads.gov.in",
    description: "MP Local Area Development Scheme fund utilization data",
  },
} as const;
