import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import {
  formatIndianCurrency,
  formatDate,
  formatPercent,
} from "@/lib/formatters";
import { HOUSE_LABELS, CASE_STATUS_COLORS } from "@/lib/utils";
import {
  getIPCLabel,
  getCrimeNames,
  getHeinousCrimeTypes,
  getStatusLabel,
} from "@/lib/ipc-sections";
import { PartyBadge } from "@/components/politician/PartyBadge";
import { CasesBadge } from "@/components/politician/CasesBadge";
import { WealthBar } from "@/components/politician/WealthBar";
import { DataSourceTag } from "@/components/ui/DataSourceTag";
import type { PoliticianProfile } from "@/types";

export const revalidate = 86400;

async function getPolitician(slug: string): Promise<PoliticianProfile | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("politicians")
    .select(
      `
      *,
      parties (*),
      assets_declarations (*),
      criminal_cases (*),
      election_terms (*),
      attendance_records (*),
      company_interests (*),
      corruption_signals (*),
      controversies (*),
      fund_usage (*)
    `
    )
    .eq("slug", slug)
    .single();

  return data as PoliticianProfile | null;
}

export async function generateStaticParams() {
  const { createBrowserClient } = await import("@/lib/supabase");
  const supabase = createBrowserClient();
  const { data } = await supabase
    .from("politicians")
    .select("slug")
    .eq("is_active", true) as { data: { slug: string }[] | null };
  return (data ?? []).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPolitician(slug);
  if (!p) return { title: "Politician not found" };
  return {
    title: p.name,
    description: `${p.name} — ${(p.parties as { name: string } | null)?.name ?? "Independent"} · ${p.constituency ?? p.state} · Criminal cases, assets, and parliamentary record.`,
  };
}

export default async function PoliticianProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getPolitician(slug);
  if (!p) notFound();

  const party = p.parties as { name: string; abbreviation: string | null; logo_url: string | null } | null;
  const assets = p.assets_declarations ?? [];
  const cases = p.criminal_cases ?? [];
  const terms = p.election_terms ?? [];
  const attendance = p.attendance_records ?? [];
  const latestAssets = [...assets]
    .sort((a, b) => b.declaration_year - a.declaration_year)[0] ?? null;
  const heinousCases = cases.filter((c) => c.is_heinous);
  const signals = p.corruption_signals ?? [];
  const controversies = p.controversies ?? [];
  const fundUsage = p.fund_usage ?? [];
  const companyInterests = p.company_interests ?? [];
  const houseLabel = HOUSE_LABELS[p.house ?? ""] ?? p.house;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="font-mono text-2xs text-text-muted mb-6">
        <Link href="/" className="hover:text-text-primary transition-colors">Home</Link>
        <span className="mx-2">›</span>
        <Link href="/politicians" className="hover:text-text-primary transition-colors">MPs</Link>
        <span className="mx-2">›</span>
        <span className="text-text-secondary">{p.name}</span>
      </nav>

      {/* Profile header */}
      <div className="bg-surface border border-border rounded-sm p-6 mb-6">
        <div className="flex gap-6">
          {/* Photo */}
          <div className="shrink-0">
            {p.profile_image_url ? (
              <Image
                src={p.profile_image_url}
                alt={p.name}
                width={96}
                height={96}
                className="w-24 h-24 object-cover rounded-sm"
              />
            ) : (
              <div className="w-24 h-24 bg-surface-2 rounded-sm flex items-center justify-center border border-border">
                <span className="font-mono text-4xl text-text-muted">
                  {p.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-2 mb-2">
              <h1 className="font-bold text-2xl text-text-primary">{p.name}</h1>
              {heinousCases.length > 0 && (
                <span className="bg-danger/20 border border-danger/50 text-danger font-mono text-2xs px-2 py-0.5 rounded-sm self-center">
                  HEINOUS OFFENCES
                </span>
              )}
            </div>

            {p.name_hindi && (
              <p className="text-text-secondary text-sm mb-2">{p.name_hindi}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              <PartyBadge party={party} />
              {houseLabel && (
                <span className="font-mono text-2xs border border-border px-1.5 py-0.5 text-text-secondary rounded-sm">
                  {houseLabel}
                </span>
              )}
              {(() => {
                const status = p.election_status;
                if (status === "won") return (
                  <span className="font-mono text-2xs border border-safe/50 bg-safe/10 text-safe px-1.5 py-0.5 rounded-sm">
                    ELECTED MP
                  </span>
                );
                if (status === "lost") return (
                  <span className="font-mono text-2xs border border-danger/50 bg-danger/10 text-danger px-1.5 py-0.5 rounded-sm">
                    CANDIDATE (LOST)
                  </span>
                );
                return (
                  <span className="font-mono text-2xs border border-border bg-surface-2 text-text-muted px-1.5 py-0.5 rounded-sm">
                    CANDIDATE
                  </span>
                );
              })()}
            </div>

            {(p.constituency || p.state) && (
              <p className="text-sm text-text-secondary font-mono mb-3">
                {p.constituency}
                {p.constituency && p.state && " · "}
                {p.state}
              </p>
            )}

            {/* Quick stats */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-text-muted text-xs font-mono">Net Worth</span>
                <p className="font-mono text-accent font-semibold">
                  {formatIndianCurrency(latestAssets?.net_worth ?? null)}
                </p>
              </div>
              <div>
                <span className="text-text-muted text-xs font-mono">Criminal Cases</span>
                <p className="mt-0.5">
                  <CasesBadge
                    count={cases.length}
                    hasHeinous={heinousCases.length > 0}
                  />
                </p>
              </div>
              <div>
                <span className="text-text-muted text-xs font-mono">Terms</span>
                <p className="font-mono text-text-primary font-semibold">
                  {terms.length}
                </p>
              </div>
              {attendance[0]?.attendance_percent !== undefined && (
                <div>
                  <span className="text-text-muted text-xs font-mono">Attendance</span>
                  <p className="font-mono text-text-primary font-semibold">
                    {formatPercent(attendance[0].attendance_percent)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab content (server-rendered, hash-based switching via CSS) */}
      {/* Risk signals banner */}
      {signals.length > 0 && (
        <div className="bg-warning/5 border border-warning/30 rounded-sm p-4 mb-6">
          <p className="font-mono text-xs text-warning font-semibold mb-2 uppercase tracking-widest">
            ⚠ {signals.length} Risk Signal{signals.length > 1 ? "s" : ""} Detected
          </p>
          <div className="space-y-1">
            {signals.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                  s.signal_severity === "critical" ? "bg-danger" :
                  s.signal_severity === "high" ? "bg-warning" :
                  s.signal_severity === "medium" ? "bg-accent" : "bg-text-muted"
                }`} />
                <span className="text-xs text-text-secondary">{s.signal_description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <TabLayout
        assets={assets}
        cases={cases}
        terms={terms}
        attendance={attendance}
        latestAssets={latestAssets}
        heinousCases={heinousCases}
        controversies={controversies}
        fundUsage={fundUsage}
        companyInterests={companyInterests}
      />
    </div>
  );
}

// Split into a sub-component to keep the page function readable
function TabLayout({
  assets,
  cases,
  terms,
  attendance,
  latestAssets,
  heinousCases,
  controversies,
  fundUsage,
  companyInterests,
}: {
  assets: PoliticianProfile["assets_declarations"];
  cases: PoliticianProfile["criminal_cases"];
  terms: PoliticianProfile["election_terms"];
  attendance: PoliticianProfile["attendance_records"];
  latestAssets: PoliticianProfile["assets_declarations"][0] | null;
  heinousCases: PoliticianProfile["criminal_cases"];
  controversies: PoliticianProfile["controversies"];
  fundUsage: PoliticianProfile["fund_usage"];
  companyInterests: PoliticianProfile["company_interests"];
}) {
  return (
    <div>
      {/* Tab navigation */}
      <div className="flex overflow-x-auto border-b border-border mb-6 gap-0">
        {[
          { id: "wealth", label: "Wealth & Assets" },
          { id: "cases", label: `Cases (${cases.length})` },
          { id: "elections", label: `Elections (${terms.length})` },
          { id: "performance", label: "Parliament" },
          { id: "companies", label: `Companies (${companyInterests.length})` },
          { id: "controversies", label: `Controversies (${controversies.length})` },
          { id: "tenders", label: "Tenders" },
        ].map((tab) => (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            className="shrink-0 font-mono text-xs text-text-secondary px-4 py-3 border-b-2 border-transparent hover:text-text-primary hover:border-border transition-colors"
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Tab 1: Wealth */}
      <section id="wealth" className="mb-16 scroll-mt-20">
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-6">
          Wealth & Assets
        </h2>

        {latestAssets ? (
          <div className="space-y-6">
            {/* Hero net worth */}
            <div className="bg-surface border border-border p-6 rounded-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-mono text-2xs text-text-muted uppercase tracking-widest">
                    Net Worth ({latestAssets.declaration_year})
                  </p>
                  <p className="font-mono text-4xl font-bold text-accent mt-1">
                    {formatIndianCurrency(latestAssets.net_worth, false)}
                  </p>
                </div>
                <DataSourceTag
                  source={latestAssets.source_type ?? "myneta"}
                  url={latestAssets.source_url ?? undefined}
                />
              </div>
              <WealthBar
                totalAssets={latestAssets.total_assets}
                totalLiabilities={latestAssets.total_liabilities}
              />
            </div>

            {/* Breakdown table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Movable assets */}
              <div className="bg-surface border border-border rounded-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-surface-2">
                  <h3 className="font-mono text-xs text-text-secondary uppercase tracking-widest">
                    Movable Assets
                  </h3>
                  <p className="font-mono text-sm text-accent font-semibold mt-0.5">
                    {formatIndianCurrency(latestAssets.total_movable_assets)}
                  </p>
                </div>
                <table className="data-table w-full">
                  <tbody>
                    {[
                      ["Cash in hand", latestAssets.cash_in_hand],
                      ["Bank deposits", latestAssets.bank_deposits],
                      ["Bonds & debentures", latestAssets.bonds_debentures],
                      ["NSC / Postal", latestAssets.nsc_postal],
                      ["LIC policies", latestAssets.lic_policies],
                      ["Loans given", latestAssets.personal_loans_given],
                      ["Motor vehicles", latestAssets.motor_vehicles],
                      ["Jewelry & gold", latestAssets.jewelry_gold],
                      ["Other movable", latestAssets.other_movable],
                    ]
                      .filter(([, v]) => v !== null)
                      .map(([label, value]) => (
                        <tr key={String(label)}>
                          <td className="text-text-secondary text-xs">{label}</td>
                          <td className="text-right font-mono text-xs">
                            {formatIndianCurrency(value as number)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Immovable assets */}
              <div className="bg-surface border border-border rounded-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-surface-2">
                  <h3 className="font-mono text-xs text-text-secondary uppercase tracking-widest">
                    Immovable Assets
                  </h3>
                  <p className="font-mono text-sm text-accent font-semibold mt-0.5">
                    {formatIndianCurrency(latestAssets.total_immovable_assets)}
                  </p>
                </div>
                <table className="data-table w-full">
                  <tbody>
                    {[
                      ["Agricultural land", latestAssets.agricultural_land],
                      ["Non-agricultural land", latestAssets.non_agricultural_land],
                      ["Buildings", latestAssets.buildings],
                      ["Other immovable", latestAssets.other_immovable],
                    ]
                      .filter(([, v]) => v !== null)
                      .map(([label, value]) => (
                        <tr key={String(label)}>
                          <td className="text-text-secondary text-xs">{label}</td>
                          <td className="text-right font-mono text-xs">
                            {formatIndianCurrency(value as number)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* YoY stub */}
            {assets.length < 2 && (
              <div className="border border-dashed border-border p-4 rounded-sm text-center">
                <p className="font-mono text-2xs text-text-muted">
                  Year-over-year comparison — data for previous elections coming soon
                </p>
              </div>
            )}

            {/* Source */}
            {latestAssets.raw_affidavit_url && (
              <a
                href={latestAssets.raw_affidavit_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-mono text-text-secondary hover:text-accent transition-colors border border-border px-3 py-2 rounded-sm"
              >
                View original ECI affidavit ↗
              </a>
            )}
          </div>
        ) : (
          <div className="border border-dashed border-border p-8 text-center rounded-sm">
            <p className="font-mono text-text-secondary text-sm">
              Asset declaration data not yet available
            </p>
          </div>
        )}
      </section>

      {/* Tab 2: Criminal Cases */}
      <section id="cases" className="mb-16 scroll-mt-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest">
            Criminal Cases
          </h2>
          <CasesBadge
            count={cases.length}
            hasHeinous={heinousCases.length > 0}
          />
        </div>

        {cases.length === 0 ? (
          <div className="bg-safe/5 border border-safe/30 p-6 rounded-sm text-center">
            <p className="font-mono text-safe text-sm">
              ✓ No criminal cases declared
            </p>
            <DataSourceTag source="myneta" className="mt-2" />
          </div>
        ) : (
          <div className="space-y-3">
            {heinousCases.length > 0 && (() => {
              const allHeinousSections = heinousCases.flatMap((c) => c.ipc_sections ?? []);
              const specificCrimes = getHeinousCrimeTypes(allHeinousSections);
              return (
                <div className="bg-danger/10 border border-danger/40 p-3 rounded-sm mb-4">
                  <p className="font-mono text-danger text-xs font-semibold">
                    ⚠ Heinous charges include: {specificCrimes.length > 0
                      ? specificCrimes.join(", ")
                      : "Major financial fraud"}
                  </p>
                </div>
              );
            })()}

            {cases.map((c) => {
              const sections = (c.ipc_sections ?? [])
                .map((s) => s.replace(/^0+/, "") || s) // normalize leading zeros: "04" → "4"
                .filter((s) => !/^(1[89]|20)\d{2}$/.test(s)); // filter years (1800s–2099)
              const crimeNames = getCrimeNames(sections);
              const heinousCrimes = c.is_heinous ? getHeinousCrimeTypes(sections) : [];
              const status = getStatusLabel(c.current_status);

              return (
                <div
                  key={c.id}
                  className={`bg-surface border rounded-sm p-4 ${
                    c.is_heinous ? "border-danger/40" : "border-border"
                  }`}
                >
                  {/* Crime type headline */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary font-medium leading-snug">
                        {crimeNames.length > 0
                          ? crimeNames.slice(0, 4).join(", ") + (crimeNames.length > 4 ? ` +${crimeNames.length - 4} more` : "")
                          : "Criminal Case"}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-2xs px-2 py-0.5 border rounded-sm shrink-0 ${
                        CASE_STATUS_COLORS[c.current_status ?? "unknown"]
                      }`}
                      title={status.description}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Heinous badge — specific crime type */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {heinousCrimes.map((crime) => (
                      <span
                        key={crime}
                        className="font-mono text-2xs bg-danger/20 border border-danger/50 text-danger px-1.5 py-0.5 rounded-sm uppercase font-semibold"
                      >
                        {crime}
                      </span>
                    ))}
                    {c.current_status === "convicted" && c.sentence_description && (
                      <span className="font-mono text-2xs bg-danger/10 border border-danger/30 text-danger px-1.5 py-0.5 rounded-sm">
                        {c.sentence_description}
                      </span>
                    )}
                    {c.current_status === "acquitted" && (
                      <span className="font-mono text-2xs bg-safe/20 border border-safe/50 text-safe px-1.5 py-0.5 rounded-sm">
                        Cleared by Court
                      </span>
                    )}
                  </div>

                  {/* IPC sections as subtle references */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {sections.map((section) => (
                      <span
                        key={section}
                        className="font-mono text-2xs bg-surface-2 border border-border px-1.5 py-0.5 rounded-sm text-text-muted"
                        title={getIPCLabel(section)}
                      >
                        §{section}
                      </span>
                    ))}
                  </div>

                  {/* Case description */}
                  {c.case_description && !/^\s*(?:Rs\.?\s*)?[\d,]+(?:\.\d+)?\s*(?:~[\d.]+\s*(?:Lacs?|Crore|Lakhs?)\+?)?\s*$/.test(c.case_description) && (
                    <p className="text-xs text-text-secondary mb-2 leading-relaxed">
                      {c.case_description}
                    </p>
                  )}

                  {/* Court & filing metadata */}
                  <div className="flex flex-wrap gap-4 text-2xs font-mono text-text-muted">
                    {c.court_name && !/^\s*(?:Rs\.?\s*)?[\d,]+/.test(c.court_name) && <span>{c.court_name}</span>}
                    {c.case_number && <span>Case: {c.case_number}</span>}
                    {c.date_of_filing && (
                      <span>Filed: {formatDate(c.date_of_filing)}</span>
                    )}
                    {c.case_year && <span>Year: {c.case_year}</span>}
                    {c.conviction_year && <span>Convicted: {c.conviction_year}</span>}
                  </div>

                  {/* eCourts live data */}
                  {c.ecourts_case_id && (
                    <div className="mt-2 bg-surface-2 border border-safe/20 rounded-sm p-2.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-2xs text-safe font-semibold uppercase tracking-wider">eCourts Live</span>
                        <span className="font-mono text-2xs text-text-muted">CNR: {c.ecourts_case_id}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-2xs font-mono text-text-secondary">
                        {c.judge_name && (
                          <span>Judge: {c.judge_name}</span>
                        )}
                        {c.next_hearing_date && (
                          <span className="text-accent">Next Hearing: {formatDate(c.next_hearing_date)}</span>
                        )}
                        {c.last_hearing_date && (
                          <span>Last Heard: {formatDate(c.last_hearing_date)}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Source tags */}
                  <div className={`${c.ecourts_case_id ? "mt-2" : "mt-2"} flex items-center gap-2`}>
                    {c.source_url && (
                      <DataSourceTag source="myneta" url={c.source_url} />
                    )}
                    {c.ecourts_case_id ? (
                      <span className="font-mono text-2xs text-safe border border-safe/30 px-1.5 py-0.5 rounded-sm">
                        eCourts: linked
                      </span>
                    ) : (
                      <span className="font-mono text-2xs text-text-muted border border-border/30 px-1.5 py-0.5 rounded-sm opacity-50">
                        eCourts: not linked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tab 3: Election History */}
      <section id="elections" className="mb-16 scroll-mt-20">
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-6">
          Election History
        </h2>

        {terms.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center rounded-sm">
            <p className="font-mono text-text-secondary text-sm">
              Election history not yet available
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...terms]
              .sort((a, b) => b.election_year - a.election_year)
              .map((term) => (
                <div
                  key={term.id}
                  className={`bg-surface border rounded-sm p-4 flex items-center justify-between gap-4 ${
                    term.result === "won"
                      ? "border-safe/30"
                      : "border-border"
                  }`}
                >
                  <div>
                    <p className="font-mono text-sm text-text-primary font-semibold">
                      {term.election_year}
                    </p>
                    <p className="text-xs text-text-secondary font-mono">
                      {term.constituency ?? "N/A"} · {term.state ?? ""}
                    </p>
                  </div>
                  <div className="text-right">
                    {term.votes_received !== null && (
                      <p className="font-mono text-xs text-text-secondary">
                        {term.votes_received.toLocaleString("en-IN")} votes
                      </p>
                    )}
                    {term.margin !== null && (
                      <p className="font-mono text-2xs text-text-muted">
                        margin: {term.margin.toLocaleString("en-IN")}
                      </p>
                    )}
                    <span
                      className={`font-mono text-2xs px-2 py-0.5 border rounded-sm mt-1 inline-block ${
                        term.result === "won"
                          ? "bg-safe/10 text-safe border-safe/30"
                          : "bg-danger/10 text-danger border-danger/30"
                      }`}
                    >
                      {term.result ?? "N/A"}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Tab 4: Parliamentary Performance */}
      <section id="performance" className="mb-16 scroll-mt-20">
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-6">
          Parliamentary Performance
        </h2>

        {attendance.length > 0 ? (
          <div className="space-y-4">
            {attendance.map((rec) => (
              <div
                key={rec.id}
                className="bg-surface border border-border rounded-sm p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-sm font-semibold">
                    {rec.session_name ?? rec.session_year}
                  </p>
                  {rec.source_url && (
                    <DataSourceTag source="prs" url={rec.source_url} />
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  {[
                    ["Attendance", formatPercent(rec.attendance_percent)],
                    ["Questions", rec.questions_asked?.toLocaleString("en-IN") ?? "—"],
                    ["Debates", rec.debates_participated?.toLocaleString("en-IN") ?? "—"],
                    ["Bills", rec.bills_introduced?.toLocaleString("en-IN") ?? "—"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="font-mono text-2xs text-text-muted uppercase tracking-widest">
                        {label}
                      </p>
                      <p className="font-mono text-sm text-accent font-semibold mt-1">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border p-8 text-center rounded-sm">
            <p className="font-mono text-text-secondary text-sm">
              Parliamentary performance data not yet available for this MP
            </p>
          </div>
        )}

        {/* MPLAD Fund Usage */}
        {fundUsage.length > 0 && (
          <div className="mt-8">
            <h3 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-4">
              MPLAD Fund Usage
            </h3>
            <div className="space-y-3">
              {[...fundUsage]
                .sort((a, b) => (b.financial_year ?? "").localeCompare(a.financial_year ?? ""))
                .map((fund) => (
                  <div key={fund.id} className="bg-surface border border-border rounded-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-text-primary font-semibold">
                        FY {fund.financial_year}
                      </span>
                      {fund.utilization_percent != null && (
                        <span className={`font-mono text-xs font-semibold ${
                          fund.utilization_percent >= 75 ? "text-safe" :
                          fund.utilization_percent >= 50 ? "text-warning" :
                          "text-danger"
                        }`}>
                          {fund.utilization_percent}% utilized
                        </span>
                      )}
                    </div>
                    {fund.utilization_percent != null && (
                      <div className="w-full bg-surface-2 rounded-sm h-2 mb-2">
                        <div
                          className={`h-2 rounded-sm ${
                            fund.utilization_percent >= 75 ? "bg-safe" :
                            fund.utilization_percent >= 50 ? "bg-warning" :
                            "bg-danger"
                          }`}
                          style={{ width: `${Math.min(fund.utilization_percent, 100)}%` }}
                        />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4 text-2xs font-mono text-text-muted">
                      {fund.total_allocated != null && (
                        <span>Allocated: {formatIndianCurrency(fund.total_allocated)}</span>
                      )}
                      {fund.total_released != null && (
                        <span>Released: {formatIndianCurrency(fund.total_released)}</span>
                      )}
                      {fund.total_utilized != null && (
                        <span>Utilized: {formatIndianCurrency(fund.total_utilized)}</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>

      {/* Tab 5: Companies */}
      <section id="companies" className="mb-16 scroll-mt-20">
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-6">
          Company Interests & Business Declarations
        </h2>

        {companyInterests.length === 0 ? (
          <div className="bg-safe/5 border border-safe/30 p-6 rounded-sm text-center">
            <p className="font-mono text-safe text-sm">
              ✓ No business interests declared
            </p>
            <DataSourceTag source="myneta" className="mt-2" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Phase 4 notice — GeM cross-referencing */}
            <div className="border border-dashed border-border/50 rounded-sm p-3 flex items-center gap-3">
              <span className="font-mono text-2xs border border-border text-text-muted px-1.5 py-0.5 rounded-sm shrink-0">
                Phase 4
              </span>
              <p className="text-xs text-text-muted leading-relaxed">
                GeM portal cross-referencing for government procurement conflicts coming soon.{" "}
                <a href="/data-sources" className="text-accent hover:underline">See roadmap →</a>
              </p>
            </div>

            {/* Business / Profession Declarations */}
            {(() => {
              const professions = companyInterests.filter((c) => c.company_type === "profession_declaration");
              if (professions.length === 0) return null;
              return (
                <div>
                  <h3 className="font-mono text-xs text-text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-accent" />
                    Business Interests ({professions.length})
                  </h3>
                  <div className="space-y-2">
                    {professions.map((c) => (
                      <div key={c.id} className="bg-surface border border-border rounded-sm p-4">
                        <p className="text-sm text-text-primary">
                          {c.company_name}
                        </p>
                        <p className="text-2xs font-mono text-text-muted mt-1">
                          Self-declared in election affidavit
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Other company interests (directorships, shareholdings) */}
            {(() => {
              const others = companyInterests.filter(
                (c) => c.company_type !== "government_contract" && c.company_type !== "profession_declaration"
              );
              if (others.length === 0) return null;
              return (
                <div>
                  <h3 className="font-mono text-xs text-text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-text-muted" />
                    Directorships & Shareholdings ({others.length})
                  </h3>
                  <div className="bg-surface border border-border rounded-sm overflow-hidden">
                    <table className="data-table w-full">
                      <thead>
                        <tr>
                          <th className="text-left text-2xs font-mono text-text-muted uppercase">Company</th>
                          <th className="text-left text-2xs font-mono text-text-muted uppercase">Role</th>
                          {others.some((c) => c.share_percentage) && (
                            <th className="text-right text-2xs font-mono text-text-muted uppercase">Share %</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {others.map((c) => (
                          <tr key={c.id}>
                            <td className="text-xs text-text-primary">
                              {c.company_name}
                              {c.cin && (
                                <span className="text-2xs text-text-muted ml-2">CIN: {c.cin}</span>
                              )}
                            </td>
                            <td className="text-xs text-text-secondary font-mono">{c.role ?? "—"}</td>
                            {others.some((ci) => ci.share_percentage) && (
                              <td className="text-right text-xs font-mono text-accent">
                                {c.share_percentage != null ? `${c.share_percentage}%` : "—"}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            <DataSourceTag source="myneta" className="mt-2" />
          </div>
        )}
      </section>

      {/* Tab 6: Controversies */}
      <section id="controversies" className="mb-8 scroll-mt-20">
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-6">
          Controversies & News
        </h2>

        {controversies.length === 0 ? (
          <div className="bg-safe/5 border border-safe/30 p-6 rounded-sm text-center">
            <p className="font-mono text-safe text-sm">
              No controversies tracked
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...controversies]
              .sort((a, b) => (b.date_of_incident ?? "").localeCompare(a.date_of_incident ?? ""))
              .map((c) => {
                const severityColors: Record<string, string> = {
                  critical: "border-danger/40 bg-danger/5",
                  high: "border-warning/40 bg-warning/5",
                  medium: "border-border",
                  low: "border-border",
                };
                const severityBadge: Record<string, string> = {
                  critical: "bg-danger/20 text-danger border-danger/50",
                  high: "bg-warning/20 text-warning border-warning/50",
                  medium: "bg-surface-2 text-text-secondary border-border",
                  low: "bg-surface-2 text-text-muted border-border",
                };
                return (
                  <div
                    key={c.id}
                    className={`bg-surface border rounded-sm p-4 ${
                      severityColors[c.severity ?? "low"] ?? "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-sm text-text-primary font-medium leading-snug">
                        {c.title}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.is_verified && (
                          <span className="font-mono text-2xs bg-safe/20 text-safe border border-safe/50 px-1.5 py-0.5 rounded-sm">
                            VERIFIED
                          </span>
                        )}
                        <span className={`font-mono text-2xs px-1.5 py-0.5 border rounded-sm ${
                          severityBadge[c.severity ?? "low"] ?? ""
                        }`}>
                          {c.severity ?? "low"}
                        </span>
                      </div>
                    </div>

                    {c.description && (
                      <p className="text-xs text-text-secondary mb-2 leading-relaxed line-clamp-2">
                        {c.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-2xs font-mono text-text-muted">
                      {c.date_of_incident && (
                        <span>{formatDate(c.date_of_incident)}</span>
                      )}
                      {c.controversy_type && (
                        <span className="uppercase">{c.controversy_type.replace(/_/g, " ")}</span>
                      )}
                      {(c.news_links ?? []).length > 0 && (
                        <a
                          href={(c.news_links as string[])[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          Source
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* Tab 7: Government Tenders — Phase 4 */}
      <section id="tenders" className="mb-8 scroll-mt-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest">
            Government Tenders
          </h2>
          <span className="font-mono text-2xs border border-border text-text-muted px-2 py-0.5 rounded-sm">
            Phase 4
          </span>
        </div>

        <div className="border border-dashed border-border/60 rounded-sm p-8">
          <div className="text-center max-w-sm mx-auto">
            <div className="w-10 h-10 rounded-sm bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
              <span className="font-mono text-text-muted text-lg">⟳</span>
            </div>
            <h3 className="font-semibold text-text-primary text-sm mb-2">
              GeM Tender Tracking — Coming in Phase 4
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              We&apos;re building a pipeline to cross-reference this MP&apos;s
              company interests against government procurement contracts on the
              GeM portal. This will flag potential conflicts of interest between
              declared business links and public contracts.
            </p>
            <a
              href="/data-sources"
              className="font-mono text-2xs text-accent hover:underline"
            >
              See our Phase 4 roadmap →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
