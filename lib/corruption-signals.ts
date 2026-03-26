/**
 * Corruption Signal Engine — Phase 2D
 *
 * Analyzes criminal cases, assets, and attendance data to generate
 * automated corruption risk signals for each politician. All signals are
 * derived exclusively from mandatory public disclosures and carry the
 * `auto_generated: true` flag so they can be distinguished from manually
 * curated signals.
 *
 * Signal types:
 *   - heinous_cases:      Has cases involving murder, kidnapping, etc.
 *   - high_case_count:    Unusually high number of pending criminal cases
 *   - corruption_charges: Charged under Prevention of Corruption Act
 *   - fraud_charges:      Charged under IPC fraud/forgery sections
 *   - wealth_surge:       Disproportionate asset growth (needs multi-year data)
 *   - low_attendance:     Parliamentary attendance well below average
 *   - low_participation:  Very few questions/debates despite being in office
 *
 * Severity thresholds:
 *   - medium:   Attendance < 40%, pending cases 5–6, asset growth 5–10×
 *   - high:     Attendance < 20%, pending cases 7–9, asset growth > 10×,
 *               fraud charges (IPC 420 / 406 / 409 / 467 / 468 / 471)
 *   - critical: Any heinous case, pending cases ≥ 10, PCA charges,
 *               asset growth > 10×
 */

export type SignalSeverity = "low" | "medium" | "high" | "critical";

export interface CorruptionSignal {
  politician_id: string;
  signal_type: string;
  signal_severity: SignalSeverity;
  signal_description: string;
  evidence_links: string[];
  auto_generated: boolean;
}

interface PoliticianData {
  id: string;
  name: string;
  criminal_cases: { id: string; is_heinous: boolean | null; current_status: string | null; ipc_sections: string[] | null }[];
  attendance_records: { attendance_percent: number | null; questions_asked: number | null; debates_participated: number | null }[];
  assets_declarations: { total_assets: number | null; net_worth: number | null; declaration_year: number }[];
}

/**
 * Compute all corruption risk signals for a single politician.
 *
 * Runs six independent checks in order: heinous offences, high pending case
 * count, corruption / fraud IPC sections, low attendance, low participation,
 * and disproportionate wealth growth. Each check may emit zero or one signal.
 *
 * @param politician - Politician record with related criminal cases,
 *   attendance records, and asset declarations already joined.
 * @returns Array of {@link CorruptionSignal} objects ready for DB insertion.
 *   Returns an empty array when no signals are triggered.
 */
export function computeSignals(politician: PoliticianData): CorruptionSignal[] {
  const signals: CorruptionSignal[] = [];
  const pid = politician.id;

  // 1. Heinous offences
  const heinous = politician.criminal_cases.filter((c) => c.is_heinous);
  if (heinous.length > 0) {
    signals.push({
      politician_id: pid,
      signal_type: "heinous_cases",
      signal_severity: "critical",
      signal_description: `${heinous.length} heinous criminal case(s) declared, including offences like murder, kidnapping, or major fraud.`,
      evidence_links: [],
      auto_generated: true,
    });
  }

  // 2. High pending case count
  const pendingCases = politician.criminal_cases.filter(
    (c) => c.current_status === "pending"
  );
  if (pendingCases.length >= 5) {
    const sev: SignalSeverity = pendingCases.length >= 10 ? "critical" : pendingCases.length >= 7 ? "high" : "medium";
    signals.push({
      politician_id: pid,
      signal_type: "high_case_count",
      signal_severity: sev,
      signal_description: `${pendingCases.length} pending criminal cases — significantly above average.`,
      evidence_links: [],
      auto_generated: true,
    });
  }

  // 3. Serious IPC sections (corruption-specific)
  const corruptionSections = ["13", "7", "8", "9", "10", "11", "12"]; // Prevention of Corruption Act
  const fraudSections = ["420", "406", "409", "467", "468", "471"]; // Fraud, criminal breach of trust, forgery
  const allSections = politician.criminal_cases.flatMap((c) => c.ipc_sections ?? []);
  const hasCorruptionCharges = allSections.some((s) =>
    corruptionSections.some((cs) => s.includes(`PC Act-${cs}`) || s.includes(`PCA-${cs}`))
  );
  const hasFraudCharges = allSections.some((s) => fraudSections.includes(s));

  if (hasCorruptionCharges) {
    signals.push({
      politician_id: pid,
      signal_type: "corruption_charges",
      signal_severity: "critical",
      signal_description: "Charged under Prevention of Corruption Act sections.",
      evidence_links: [],
      auto_generated: true,
    });
  }
  if (hasFraudCharges) {
    signals.push({
      politician_id: pid,
      signal_type: "fraud_charges",
      signal_severity: "high",
      signal_description: "Charged under IPC fraud/forgery sections (420, 406, 409, 467, 468, 471).",
      evidence_links: [],
      auto_generated: true,
    });
  }

  // 4. Low attendance
  const latestAttendance = politician.attendance_records[0];
  if (latestAttendance?.attendance_percent !== null && latestAttendance?.attendance_percent !== undefined) {
    const pct = latestAttendance.attendance_percent;
    if (pct < 40) {
      signals.push({
        politician_id: pid,
        signal_type: "low_attendance",
        signal_severity: pct < 20 ? "high" : "medium",
        signal_description: `Parliamentary attendance at ${pct}% — well below the national average of ~80%.`,
        evidence_links: [],
        auto_generated: true,
      });
    }
  }

  // 5. Low participation (questions + debates)
  if (latestAttendance) {
    const q = latestAttendance.questions_asked ?? 0;
    const d = latestAttendance.debates_participated ?? 0;
    if (q === 0 && d === 0) {
      signals.push({
        politician_id: pid,
        signal_type: "low_participation",
        signal_severity: "medium",
        signal_description: "Zero questions asked and zero debates participated in Parliament.",
        evidence_links: [],
        auto_generated: true,
      });
    }
  }

  // 6. Wealth disproportionate (needs 2+ years of asset data)
  const sortedAssets = [...politician.assets_declarations].sort(
    (a, b) => a.declaration_year - b.declaration_year
  );
  if (sortedAssets.length >= 2) {
    const older = sortedAssets[0];
    const newer = sortedAssets[sortedAssets.length - 1];
    if (older.total_assets && newer.total_assets && older.total_assets > 0) {
      const growthRatio = newer.total_assets / older.total_assets;
      const years = newer.declaration_year - older.declaration_year;
      if (years > 0 && growthRatio > 5) {
        signals.push({
          politician_id: pid,
          signal_type: "wealth_surge",
          signal_severity: growthRatio > 10 ? "critical" : "high",
          signal_description: `Assets grew ${growthRatio.toFixed(1)}x over ${years} years (from ₹${(older.total_assets / 1e7).toFixed(1)}Cr to ₹${(newer.total_assets / 1e7).toFixed(1)}Cr).`,
          evidence_links: [],
          auto_generated: true,
        });
      }
    }
  }

  return signals;
}
