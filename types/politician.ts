import type { Database } from "./database";

export type Party = Database["public"]["Tables"]["parties"]["Row"];
export type Politician = Database["public"]["Tables"]["politicians"]["Row"];
export type ElectionTerm = Database["public"]["Tables"]["election_terms"]["Row"];
export type AssetsDeclaration = Database["public"]["Tables"]["assets_declarations"]["Row"];
export type CriminalCase = Database["public"]["Tables"]["criminal_cases"]["Row"];
export type CompanyInterest = Database["public"]["Tables"]["company_interests"]["Row"];
export type GovtTender = Database["public"]["Tables"]["govt_tenders"]["Row"];
export type FundUsage = Database["public"]["Tables"]["fund_usage"]["Row"];
export type Controversy = Database["public"]["Tables"]["controversies"]["Row"];
export type CorruptionSignal = Database["public"]["Tables"]["corruption_signals"]["Row"];
export type AttendanceRecord = Database["public"]["Tables"]["attendance_records"]["Row"];

/** Full politician profile with all related data — used on profile pages */
export interface PoliticianProfile extends Politician {
  parties: Party | null;
  assets_declarations: AssetsDeclaration[];
  criminal_cases: CriminalCase[];
  election_terms: ElectionTerm[];
  attendance_records: AttendanceRecord[];
  company_interests: CompanyInterest[];
  corruption_signals: CorruptionSignal[];
  controversies: Controversy[];
  fund_usage: FundUsage[];
}

/** Lightweight politician for cards and lists */
export interface PoliticianCard {
  id: string;
  name: string;
  slug: string;
  profile_image_url: string | null;
  constituency: string | null;
  state: string | null;
  house: string | null;
  is_active: boolean | null;
  parties: Pick<Party, "id" | "name" | "abbreviation" | "logo_url"> | null;
  latest_net_worth: number | null;
  criminal_case_count: number;
}

/** Stats shown on homepage */
export interface PlatformStats {
  total_politicians: number;
  total_lok_sabha: number;
  total_rajya_sabha: number;
  total_criminal_cases: number;
  total_declared_wealth: number;
  total_attendance_records: number;
  total_company_interests: number;
  last_updated: string | null;
}

/** Party summary for homepage cards */
export interface PartySummary {
  party: Party;
  mp_count: number;
  total_criminal_cases: number;
  avg_net_worth: number | null;
}

/** Raw joined politician query result from Supabase (before mapping to PoliticianCard) */
export interface PoliticianJoinRow {
  id: string;
  name: string;
  slug: string;
  profile_image_url: string | null;
  constituency: string | null;
  state: string | null;
  house: string | null;
  is_active: boolean | null;
  election_status: string | null;
  parties: { id: string; name: string; abbreviation: string | null; logo_url: string | null } | null;
  assets_declarations: { net_worth: number | null; declaration_year: number }[];
  criminal_cases: { id: string }[];
}
