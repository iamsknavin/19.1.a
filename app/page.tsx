import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { formatIndianCurrency, formatRelativeTime } from "@/lib/formatters";
import { HOUSE_LABELS } from "@/lib/utils";
import { StatCard } from "@/components/ui/StatCard";
import { SearchBar } from "@/components/SearchBar";
import { IndiaMap } from "@/components/IndiaMap";
import { PartyBadge } from "@/components/politician/PartyBadge";
import { ParliamentHemicycle } from "@/components/ParliamentHemicycle";
import { computeHemicycleLayout } from "@/lib/hemicycle-layout";
import type { PlatformStats } from "@/types";

export const revalidate = 3600; // revalidate every hour

async function getPlatformStats(): Promise<PlatformStats & { total_elected: number }> {
  const supabase = await createServerClient();

  const [politiciansResult, electedResult, casesResult, assetsResult, attendanceResult, companyResult] = await Promise.all([
    supabase
      .from("politicians")
      .select("id, house, updated_at", { count: "exact" })
      .eq("is_active", true),
    supabase
      .from("politicians")
      .select("id", { count: "exact", head: true })
      .eq("election_status", "won"),
    supabase.from("criminal_cases").select("id", { count: "exact" }),
    supabase.from("assets_declarations").select("net_worth"),
    supabase.from("attendance_records").select("id", { count: "exact" }),
    supabase.from("company_interests").select("id", { count: "exact" }),
  ]);

  const politicians = (politiciansResult.data ?? []) as { id: string; house: string; updated_at: string }[];
  const assetsRows = (assetsResult.data ?? []) as { net_worth: number | null }[];
  const totalDeclaredWealth = assetsRows.reduce(
    (sum, a) => sum + (a.net_worth ?? 0),
    0
  );

  const lastUpdated =
    politicians.length > 0
      ? politicians.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0]?.updated_at ?? null
      : null;

  return {
    total_politicians: politiciansResult.count ?? 0,
    total_elected: electedResult.count ?? 0,
    total_lok_sabha: politicians.filter((p) => p.house === "lok_sabha").length,
    total_rajya_sabha: politicians.filter((p) => p.house === "rajya_sabha").length,
    total_criminal_cases: casesResult.count ?? 0,
    total_declared_wealth: totalDeclaredWealth,
    total_attendance_records: attendanceResult.count ?? 0,
    total_company_interests: companyResult.count ?? 0,
    last_updated: lastUpdated,
  };
}

async function getTopParties() {
  const supabase = await createServerClient();

  const { data: parties } = await supabase
    .from("parties")
    .select("id, name, abbreviation")
    .not("abbreviation", "in", '("IND")')
    .limit(6);

  if (!parties) return [];

  const results = await Promise.all(
    (parties as { id: string; name: string; abbreviation: string | null }[]).map(async (party) => {
      // Get party member IDs first
      const partyMembersResult = await supabase
        .from("politicians")
        .select("id")
        .eq("party_id", party.id);
      const memberIds = ((partyMembersResult.data ?? []) as { id: string }[]).map((p) => p.id);

      const [mps, cases, assets] = await Promise.all([
        supabase
          .from("politicians")
          .select("id", { count: "exact" })
          .eq("party_id", party.id)
          .eq("is_active", true),
        supabase
          .from("criminal_cases")
          .select("id", { count: "exact" })
          .in("politician_id", memberIds.length > 0 ? memberIds : ["__none__"]),
        supabase
          .from("assets_declarations")
          .select("net_worth")
          .in("politician_id", memberIds.length > 0 ? memberIds : ["__none__"]),
      ]);

      const mpCount = mps.count ?? 0;
      const assetData = (assets.data ?? []) as { net_worth: number | null }[];
      const avgNetWorth =
        assetData.length > 0
          ? assetData.reduce((s, a) => s + (a.net_worth ?? 0), 0) /
            assetData.length
          : null;

      return {
        party,
        mp_count: mpCount,
        total_criminal_cases: cases.count ?? 0,
        avg_net_worth: avgNetWorth,
      };
    })
  );

  return results.sort((a, b) => b.mp_count - a.mp_count);
}

interface RecentUpdate {
  id: string;
  name: string;
  slug: string;
  updated_at: string;
  house: string;
  parties: { name: string; abbreviation: string | null } | null;
}

async function getParliamentSeats() {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("politicians")
    .select("parties(abbreviation)")
    .eq("house", "lok_sabha")
    .eq("is_active", true)
    .eq("election_status", "won");

  if (!data) return [];

  const counts: Record<string, number> = {};
  for (const row of data as { parties: { abbreviation: string | null } | null }[]) {
    const abbr = row.parties?.abbreviation ?? "IND";
    counts[abbr] = (counts[abbr] ?? 0) + 1;
  }

  return Object.entries(counts).map(([abbreviation, count]) => ({
    abbreviation,
    count,
  }));
}

async function getRecentUpdates(): Promise<RecentUpdate[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("politicians")
    .select("id, name, slug, updated_at, house, parties(name, abbreviation)")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(8);
  return (data ?? []) as RecentUpdate[];
}

export default async function HomePage() {
  const [stats, topParties, recentUpdates, partySeats] = await Promise.all([
    getPlatformStats(),
    getTopParties(),
    getRecentUpdates(),
    getParliamentSeats(),
  ]);

  const { seats, coalitionStats, totalSeats } =
    computeHemicycleLayout(partySeats);

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="font-mono text-accent text-xs uppercase tracking-widest mb-4">
                Indian Politician Transparency Platform
              </p>
              <h1 className="text-3xl sm:text-5xl font-bold text-text-primary mb-4 leading-tight">
                Every rupee.
                <br />
                Every case.
                <br />
                Every vote.
              </h1>
              <p className="text-text-secondary text-sm sm:text-base mb-8 max-w-xl leading-relaxed">
                Public record — sourced from mandatory ECI affidavits,
                parliamentary attendance data, and criminal court disclosures.
              </p>

              <div className="max-w-xl">
                <SearchBar autoFocus />
              </div>

              <div className="flex flex-wrap gap-4 mt-6">
                <Link
                  href="/politicians"
                  className="font-mono text-sm border border-accent text-accent px-4 py-2 hover:bg-accent hover:text-bg transition-colors"
                >
                  Browse All MPs →
                </Link>
                <Link
                  href="/about"
                  className="font-mono text-sm border border-border text-text-secondary px-4 py-2 hover:border-text-secondary transition-colors"
                >
                  How it works
                </Link>
              </div>
            </div>

            {/* Parliament Hemicycle */}
            {totalSeats > 0 && (
              <div className="hidden lg:block">
                <p className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-3 text-center">
                  18th Lok Sabha
                </p>
                <ParliamentHemicycle
                  seats={seats}
                  coalitionStats={coalitionStats}
                  totalSeats={totalSeats}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-border bg-surface-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              label={stats.total_elected > 0 ? "Elected MPs" : "Candidates Tracked"}
              value={stats.total_elected > 0 ? stats.total_elected.toLocaleString("en-IN") : stats.total_politicians.toLocaleString("en-IN")}
              subValue={stats.total_elected > 0 ? `of ${stats.total_politicians} total` : `LS: ${stats.total_lok_sabha} · RS: ${stats.total_rajya_sabha}`}
              accent
            />
            <StatCard
              label="Criminal Cases"
              value={stats.total_criminal_cases.toLocaleString("en-IN")}
              subValue="Declared in affidavits"
              danger={stats.total_criminal_cases > 0}
            />
            <StatCard
              label="Declared Wealth"
              value={formatIndianCurrency(stats.total_declared_wealth)}
              subValue="Combined net worth"
              accent
            />
            <StatCard
              label="Parliament Tracked"
              value={stats.total_attendance_records.toLocaleString("en-IN")}
              subValue="Attendance & performance"
            />
            <StatCard
              label="Business Interests"
              value={stats.total_company_interests.toLocaleString("en-IN")}
              subValue="Contracts & directorships"
            />
            <StatCard
              label="Last Updated"
              value={
                stats.last_updated
                  ? formatRelativeTime(stats.last_updated)
                  : "N/A"
              }
              subValue="Data freshness"
            />
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left: Party summaries + recent updates */}
          <div className="lg:col-span-2 space-y-12">
            {/* Party summary cards */}
            {topParties.length > 0 && (
              <section>
                <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-4">
                  Party Overview
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {topParties.map(({ party, mp_count, total_criminal_cases, avg_net_worth }) => (
                    <Link
                      key={party.id}
                      href={`/party/${(party.abbreviation ?? party.name).toLowerCase()}`}
                      className="bg-surface border border-border hover:border-accent/40 transition-colors p-4 rounded-sm group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <PartyBadge party={party} />
                        <span className="font-mono text-xs text-text-muted">
                          {mp_count} MPs
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-text-primary group-hover:text-accent transition-colors truncate mb-2">
                        {party.name}
                      </p>
                      <div className="flex gap-4 text-2xs font-mono">
                        <span className={total_criminal_cases > 0 ? "text-danger" : "text-safe"}>
                          {total_criminal_cases} cases
                        </span>
                        {avg_net_worth !== null && (
                          <span className="text-text-secondary">
                            avg {formatIndianCurrency(avg_net_worth)}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Recent updates */}
            {recentUpdates.length > 0 && (
              <section>
                <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-4">
                  Recently Updated
                </h2>
                <div className="space-y-1">
                  {recentUpdates.map((p) => {
                    const party = p.parties as { name: string; abbreviation: string | null } | null;
                    return (
                      <Link
                        key={p.id}
                        href={`/politician/${p.slug}`}
                        className="flex items-center justify-between py-2.5 px-3 border-b border-border/50 hover:bg-surface transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-2xs text-text-muted w-4">
                            {HOUSE_LABELS[p.house ?? ""]?.[0] ?? "?"}
                          </span>
                          <span className="text-sm text-text-primary group-hover:text-accent transition-colors truncate">
                            {p.name}
                          </span>
                          {party?.abbreviation && (
                            <span className="text-2xs font-mono text-text-muted hidden sm:inline">
                              {party.abbreviation}
                            </span>
                          )}
                        </div>
                        <span className="text-2xs font-mono text-text-muted shrink-0">
                          {formatRelativeTime(p.updated_at)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
                <Link
                  href="/politicians"
                  className="inline-block mt-3 font-mono text-xs text-text-secondary hover:text-accent transition-colors"
                >
                  View all MPs →
                </Link>
              </section>
            )}

            {/* Empty state */}
            {stats.total_politicians === 0 && (
              <div className="border border-dashed border-border p-12 text-center rounded-sm">
                <p className="font-mono text-text-secondary text-sm mb-2">
                  No data yet
                </p>
                <p className="text-text-muted text-xs mb-4">
                  Run the scraper to populate politician data from MyNeta.
                </p>
                <code className="bg-surface-2 border border-border px-3 py-2 rounded-sm text-xs font-mono text-accent block max-w-sm mx-auto">
                  cd scraper && scrapy crawl myneta -a dry_run=true
                </code>
              </div>
            )}
          </div>

          {/* Right: India map */}
          <div className="hidden lg:block">
            <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-4">
              Browse by State
            </h2>
            <IndiaMap className="h-80 opacity-90 hover:opacity-100 transition-opacity" />
            <p className="text-2xs font-mono text-text-muted mt-2 text-center">
              Click a state to filter MPs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
