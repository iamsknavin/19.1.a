import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { DATA_SOURCES, PHASE_4_FEATURES } from "@/lib/config";
import { formatRelativeTime } from "@/lib/formatters";

export const metadata: Metadata = { title: "Data Sources" };
export const revalidate = 3600;

async function getDataStats() {
  const supabase = await createServerClient();
  const [
    politicians,
    cases,
    assets,
    parties,
    attendance,
    controversies,
    fundUsage,
    companyInterests,
    tenders,
  ] = await Promise.all([
    supabase.from("politicians").select("id, updated_at", { count: "exact" }),
    supabase.from("criminal_cases").select("id", { count: "exact" }),
    supabase.from("assets_declarations").select("id", { count: "exact" }),
    supabase.from("parties").select("id", { count: "exact" }),
    supabase.from("attendance_records").select("id", { count: "exact" }),
    supabase.from("controversies").select("id", { count: "exact" }),
    supabase.from("fund_usage").select("id", { count: "exact" }),
    supabase.from("company_interests").select("id", { count: "exact" }),
    supabase.from("govt_tenders").select("id", { count: "exact" }),
  ]);

  const politicianRows = politicians.data as
    | { id: string; updated_at: string }[]
    | null;
  const lastScraped =
    politicianRows && politicianRows.length > 0
      ? politicianRows.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0]?.updated_at
      : null;

  return {
    politicians: politicians.count ?? 0,
    criminal_cases: cases.count ?? 0,
    assets_declarations: assets.count ?? 0,
    parties: parties.count ?? 0,
    attendance: attendance.count ?? 0,
    controversies: controversies.count ?? 0,
    fund_usage: fundUsage.count ?? 0,
    company_interests: companyInterests.count ?? 0,
    govt_tenders: tenders.count ?? 0,
    lastScraped,
  };
}

export default async function DataSourcesPage() {
  const stats = await getDataStats();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <p className="font-mono text-accent text-xs uppercase tracking-widest mb-3">
          Transparency
        </p>
        <h1 className="text-3xl font-bold text-text-primary mb-4">
          Data Sources
        </h1>
        <p className="text-text-secondary text-sm leading-relaxed">
          Every data point on 19.1.a is sourced from mandatory public
          disclosures. Here&apos;s what we collect, from where, and when it was
          last updated.
        </p>
      </div>

      {/* Current record counts */}
      <section className="mb-12">
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-4">
          Live Database
        </h2>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Table</th>
                <th>Records</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  table: "Politicians",
                  count: stats.politicians,
                  source: "MyNeta / ADR + ECI",
                  updated: stats.lastScraped,
                  status: "live",
                },
                {
                  table: "Criminal Cases",
                  count: stats.criminal_cases,
                  source: "ECI Affidavits (via MyNeta)",
                  updated: stats.lastScraped,
                  status: "live",
                },
                {
                  table: "Asset Declarations",
                  count: stats.assets_declarations,
                  source: "ECI Affidavits (via MyNeta)",
                  updated: stats.lastScraped,
                  status: "live",
                },
                {
                  table: "Parties",
                  count: stats.parties,
                  source: "Manual + ECI",
                  updated: "Seed data",
                  status: "live",
                },
                {
                  table: "Attendance Records",
                  count: stats.attendance,
                  source: "PRS Legislative Research",
                  updated: stats.lastScraped,
                  status: "partial",
                  note: "452 of 543 LS MPs — RS pending",
                },
                {
                  table: "Controversies",
                  count: stats.controversies,
                  source: "Google News RSS",
                  updated: stats.lastScraped,
                  status: "live",
                },
                {
                  table: "MPLAD Fund Usage",
                  count: stats.fund_usage,
                  source: "MPLADS Portal",
                  updated: stats.fund_usage > 0 ? stats.lastScraped : null,
                  status: "live",
                },
                {
                  table: "Company Interests",
                  count: stats.company_interests,
                  source: "MyNeta RS Declarations",
                  updated: stats.company_interests > 0 ? stats.lastScraped : null,
                  status: "live",
                },
                {
                  table: "Govt Tenders",
                  count: stats.govt_tenders,
                  source: "GeM Portal",
                  updated: null,
                  status: "phase4",
                  note: "Phase 4 — Coming Soon",
                },
              ].map((row) => (
                <tr key={row.table}>
                  <td className="font-mono text-text-primary">{row.table}</td>
                  <td className="font-mono text-accent">
                    {typeof row.count === "number"
                      ? row.count.toLocaleString("en-IN")
                      : row.count}
                  </td>
                  <td className="font-mono text-xs">
                    {row.status === "phase4" ? (
                      <span className="text-text-muted border border-border/50 px-1.5 py-0.5 rounded-sm text-2xs">
                        Phase 4
                      </span>
                    ) : row.status === "partial" ? (
                      <span className="text-warning text-2xs">{row.note}</span>
                    ) : row.updated ? (
                      <span className="text-text-secondary">
                        {row.updated === "Seed data"
                          ? "Seed data"
                          : formatRelativeTime(row.updated)}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="text-text-secondary text-xs">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Phase 4 roadmap */}
      <section className="mb-12">
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-2">
          Phase 4 — Coming Soon
        </h2>
        <p className="text-text-muted text-xs mb-4">
          These features are in development and will be added in the next major
          release.
        </p>
        <div className="space-y-3">
          {PHASE_4_FEATURES.map((f) => (
            <div
              key={f.key}
              className="bg-surface border border-border/60 rounded-sm p-4 flex items-start gap-4"
            >
              <span className="font-mono text-2xs border border-border text-text-muted px-1.5 py-0.5 rounded-sm shrink-0 mt-0.5">
                Phase 4
              </span>
              <div>
                <h3 className="font-semibold text-text-primary text-sm mb-1">
                  {f.title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Source details — Phase 1–3 only */}
      <section className="mb-12">
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-4">
          Active Sources (Phase 1–3)
        </h2>
        <div className="space-y-3">
          {Object.entries(DATA_SOURCES)
            .filter(([, src]) => src.phase <= 3)
            .map(([key, src]) => (
              <div
                key={key}
                className="bg-surface border border-border rounded-sm p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-text-primary text-sm">
                        {src.name}
                      </h3>
                      <span className="font-mono text-2xs text-text-muted border border-border px-1 py-0.5 rounded-sm">
                        Phase {src.phase}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {src.description}
                    </p>
                  </div>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 font-mono text-2xs border border-border text-text-secondary hover:border-accent hover:text-accent transition-colors px-2 py-1 rounded-sm"
                  >
                    Visit ↗
                  </a>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="bg-surface border border-border rounded-sm p-6">
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-3">
          Update Frequency
        </h2>
        <div className="space-y-2 text-sm text-text-secondary">
          <p>
            <strong className="text-text-primary">Politicians & Assets:</strong>{" "}
            Scraped from MyNeta after each election cycle. Updated on demand.
          </p>
          <p>
            <strong className="text-text-primary">Attendance:</strong> Pulled
            from PRS India per parliamentary session. 452 of 543 LS MPs currently matched.
          </p>
          <p>
            <strong className="text-text-primary">Controversies:</strong> Google
            News RSS monitored daily via scheduled pipeline.
          </p>
          <p>
            <strong className="text-text-primary">Court Cases:</strong> eCourts
            case status checked periodically for linked cases via Playwright + OCR.
          </p>
          <p>
            <strong className="text-text-primary">Company Interests:</strong>{" "}
            Sourced from MyNeta&apos;s Rajya Sabha member interest declarations.
          </p>
        </div>
      </section>
    </div>
  );
}
