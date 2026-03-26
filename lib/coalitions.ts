/**
 * Indian parliamentary coalition definitions and party color mappings.
 *
 * Maps party abbreviations (as used by MyNeta / ECI affidavits) to their
 * coalition (NDA, INDIA, or OTHER) and to an SVG-safe hex color for the
 * hemicycle visualisation.
 *
 * Data is based on the 18th Lok Sabha (June 2024 general election results).
 * Update {@link NDA_PARTIES} / {@link INDIA_PARTIES} when alliances change.
 */

export type CoalitionName = "NDA" | "INDIA" | "OTHER";

/** NDA (National Democratic Alliance) — ruling coalition */
const NDA_PARTIES = [
  "BJP", "JDU", "TDP", "SS", "SHS", "JDS", "AGP", "RLD",
  "LJPRV", "ADMP", "AJSUP", "HAMS", "JSP", "NDPP", "NPF",
  "NPP", "RLP", "SKM", "UPPL", "RLTP", "PMK", "MNF", "ADAL",
  "SDF", "ZNPM", "PRAJA",
];

/** INDIA (Indian National Developmental Inclusive Alliance) — opposition */
const INDIA_PARTIES = [
  "INC", "SP", "AITC", "DMK", "NCP", "NCP(SP)", "RJD", "AAP",
  "CPI", "CPM", "CPIM", "CPIML", "IUML", "VCK", "RSP", "MDMK",
  "JMM", "KC(M)", "KCM", "SSUBT", "AIFB", "KECM",
];

const NDA_SET = new Set(NDA_PARTIES);
const INDIA_SET = new Set(INDIA_PARTIES);

/**
 * Resolve a party abbreviation to its parliamentary coalition.
 *
 * Returns `"NDA"` or `"INDIA"` for known alliance members, and `"OTHER"`
 * for independent MPs or parties outside either alliance.
 *
 * @param abbreviation - Party abbreviation as stored in the DB (e.g. "BJP", "INC").
 */
export function getCoalition(abbreviation: string): CoalitionName {
  if (NDA_SET.has(abbreviation)) return "NDA";
  if (INDIA_SET.has(abbreviation)) return "INDIA";
  return "OTHER";
}

export const COALITION_META: Record<
  CoalitionName,
  { label: string; color: string }
> = {
  NDA: { label: "NDA", color: "#e8c547" },
  INDIA: { label: "I.N.D.I.A", color: "#4a9eed" },
  OTHER: { label: "Others", color: "#555566" },
};

/** Hex colors for SVG fills — keyed by party abbreviation */
export const PARTY_COLORS: Record<string, string> = {
  BJP: "#FF6B2B",
  INC: "#19AAED",
  SP: "#d32f2f",
  AITC: "#20B2AA",
  DMK: "#E53E3E",
  TDP: "#FFD700",
  JDU: "#2E8B57",
  NCP: "#00796B",
  SS: "#FF8C00",
  SHS: "#FF8C00",
  CPI: "#C62828",
  CPM: "#C62828",
  CPIM: "#C62828",
  RJD: "#2E7D32",
  YSRCP: "#0066CC",
  AAP: "#0EA5E9",
  IUML: "#388E3C",
  RLD: "#43A047",
  VCK: "#6A1B9A",
  JDS: "#2E8B57",
  AGP: "#F9A825",
  RSP: "#D84315",
  MDMK: "#B71C1C",
  AIMIM: "#1B5E20",
  JMM: "#006400",
  BSP: "#4169E1",
  IND: "#6B7280",
};

const DEFAULT_COLOR = "#6B7280";

/**
 * Get the SVG hex color for a party abbreviation.
 *
 * Falls back to a neutral gray (`#6B7280`) for unknown parties so the
 * hemicycle always renders without missing colors.
 *
 * @param abbreviation - Party abbreviation as stored in the DB.
 */
export function getPartyColor(abbreviation: string): string {
  return PARTY_COLORS[abbreviation] ?? DEFAULT_COLOR;
}

/** Full party names for display in tooltips */
export const PARTY_NAMES: Record<string, string> = {
  BJP:       "Bharatiya Janata Party",
  INC:       "Indian National Congress",
  SP:        "Samajwadi Party",
  AITC:      "All India Trinamool Congress",
  DMK:       "Dravida Munnetra Kazhagam",
  TDP:       "Telugu Desam Party",
  JDU:       "Janata Dal (United)",
  NCP:       "Nationalist Congress Party",
  "NCP(SP)": "NCP (Sharadchandra Pawar)",
  SS:        "Shiv Sena",
  SSUBT:     "Shiv Sena (UBT)",
  CPI:       "Communist Party of India",
  CPM:       "CPI (Marxist)",
  CPIM:      "CPI (Marxist)",
  CPIML:     "CPI (ML) Liberation",
  RJD:       "Rashtriya Janata Dal",
  YSRCP:     "YSR Congress Party",
  AAP:       "Aam Aadmi Party",
  IUML:      "Indian Union Muslim League",
  RLD:       "Rashtriya Lok Dal",
  JDS:       "Janata Dal (Secular)",
  VCK:       "Viduthalai Chiruthaigal Katchi",
  RSP:       "Revolutionary Socialist Party",
  MDMK:      "Marumalarchi DMK",
  AIMIM:     "All India Majlis-e-Ittehadul Muslimeen",
  BSP:       "Bahujan Samaj Party",
  AGP:       "Asom Gana Parishad",
  PMK:       "Pattali Makkal Katchi",
  MNF:       "Mizo National Front",
  ADAL:      "Apna Dal (Sonelal)",
  JMM:       "Jharkhand Mukti Morcha",
  BRS:       "Bharat Rashtra Samithi",
  AIADMK:    "All India Anna DMK",
  IND:       "Independent",
};
