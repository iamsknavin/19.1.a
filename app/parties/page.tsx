import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { formatIndianCurrency } from "@/lib/formatters";
import { PartyBadge } from "@/components/politician/PartyBadge";
import { StatCard } from "@/components/ui/StatCard";

export const metadata: Metadata = { title: "Political Parties" };
export const revalidate = 3600;

interface PartyWithStats {
  id: string;
  name: string;
  abbreviation: string | null;
  logo_url: string | null;
  ideology: string | null;
  founded_year: number | null;
  mp_count: number;
  total_cases: number;
  total_wealth: number;
}

async function getParties(): Promise<PartyWithStats[]> {
  const supabase = await createServerClient();

  const { data: parties } = await supabase
    .from("parties")
    .select("id, name, abbreviation, logo_url, ideology, founded_year")
    .order("name");

  if (!parties) return [];

  const results = await Promise.all(
    (parties as { id: string; name: string; abbreviation: string | null; logo_url: string | null; ideology: string | null; founded_year: number | null }[]).map(async (party) => {
      const { count: mpCount } = await supabase
        .from("politicians")
        .select("id", { count: "exact", head: true })
        .eq("party_id", party.id)
        .eq("is_active", true);

      const { data: memberIds } = await supabase
        .from("politicians")
        .select("id")
        .eq("party_id", party.id);

      const ids = (memberIds ?? []).map((m: { id: string }) => m.id);

      const [casesResult, assetsResult] = await Promise.all([
        ids.length > 0
          ? supabase.from("criminal_cases").select("id", { count: "exact", head: true }).in("politician_id", ids)
          : { count: 0 },
        ids.length > 0
          ? supabase.from("assets_declarations").select("net_worth").in("politician_id", ids)
          : { data: [] },
      ]);

      const assetRows = ((assetsResult as { data: { net_worth: number | null }[] | null }).data ?? []) as { net_worth: number | null }[];
      const totalWealth = assetRows.reduce((sum, a) => sum + (a.net_worth ?? 0), 0);

      return {
        ...party,
        mp_count: mpCount ?? 0,
        total_cases: (casesResult as { count: number | null }).count ?? 0,
        total_wealth: totalWealth,
      };
    })
  );

  return results.sort((a, b) => b.mp_count - a.mp_count);
}

export default async function PartiesPage() {
  const parties = await getParties();
  const totalParties = parties.length;
  const partiesWithMPs = parties.filter((p) => p.mp_count > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-up">
      <div className="mb-8">
        <p className="font-mono text-accent text-xs uppercase tracking-widest mb-2">
          Political Parties
        </p>
        <h1 className="text-2xl font-bold text-text-primary mb-1">
          All Parties
        </h1>
        <p className="text-text-secondary text-sm">
          {totalParties} parties tracked across {partiesWithMPs.length} with active candidates
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Total Parties" value={totalParties} accent />
        <StatCard label="With Candidates" value={partiesWithMPs.length} />
        <StatCard
          label="Total Candidates"
          value={parties.reduce((s, p) => s + p.mp_count, 0)}
          accent
        />
      </div>

      {partiesWithMPs.length > 0 && (
        <section className="mb-12">
          <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-4">
            Parties with Candidates ({partiesWithMPs.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {partiesWithMPs.map((party) => (
              <Link
                key={party.id}
                href={`/party/${(party.abbreviation ?? party.name).toLowerCase()}`}
                className="bg-surface border border-border hover:border-accent/40 transition-all duration-200 p-4 rounded-sm group hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/5"
              >
                <div className="flex items-center justify-between mb-3">
                  <PartyBadge party={party} />
                  <span className="font-mono text-xs text-text-muted">
                    {party.mp_count} candidates
                  </span>
                </div>
                <p className="font-semibold text-sm text-text-primary group-hover:text-accent transition-colors truncate mb-1">
                  {party.name}
                </p>
                {party.ideology && (
                  <p className="text-2xs text-text-muted truncate mb-2">
                    {party.ideology}
                  </p>
                )}
                <div className="flex gap-4 text-2xs font-mono">
                  <span className={party.total_cases > 0 ? "text-danger" : "text-safe"}>
                    {party.total_cases} cases
                  </span>
                  {party.total_wealth > 0 && (
                    <span className="text-text-secondary">
                      {formatIndianCurrency(party.total_wealth)} total
                    </span>
                  )}
                </div>
                {party.founded_year && (
                  <p className="text-2xs font-mono text-text-muted mt-2">
                    Est. {party.founded_year}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {parties.filter((p) => p.mp_count === 0).length > 0 && (
        <section>
          <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-4">
            Other Registered Parties ({parties.filter((p) => p.mp_count === 0).length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {parties
              .filter((p) => p.mp_count === 0)
              .map((party) => (
                <Link
                  key={party.id}
                  href={`/party/${(party.abbreviation ?? party.name).toLowerCase()}`}
                  className="bg-surface border border-border hover:border-accent/40 transition-colors p-3 rounded-sm group flex items-center gap-2"
                >
                  <PartyBadge party={party} />
                  <span className="text-xs text-text-secondary group-hover:text-accent transition-colors truncate">
                    {party.name}
                  </span>
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
