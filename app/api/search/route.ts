/**
 * Internal search proxy — tries Meilisearch first (2s timeout), falls back to Supabase ilike search.
 */
import { NextRequest, NextResponse } from "next/server";
import { castRows } from "@/lib/supabase";

const MEILISEARCH_HOST =
  process.env.NEXT_PUBLIC_MEILISEARCH_HOST || "http://localhost:7700";
const SEARCH_KEY = process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY || "";

interface SearchHit {
  id: string;
  name: string;
  name_hindi: string | null;
  slug: string;
  party_name: string;
  party_abbreviation: string | null;
  constituency: string | null;
  state: string | null;
  house: string | null;
  net_worth: number | null;
  criminal_case_count: number;
  has_criminal_cases: boolean;
  is_active: boolean;
  profile_image_url: string | null;
  _formatted?: Record<string, unknown>;
}

async function searchViaMeilisearch(
  q: string,
  limit: number,
  filters: string[]
): Promise<{ hits: SearchHit[]; query: string; processingTimeMs: number } | null> {
  const body = {
    q: q.trim(),
    limit,
    filter: filters.length > 0 ? filters.join(" AND ") : undefined,
    attributesToHighlight: ["name", "party_name"],
  };

  const res = await fetch(`${MEILISEARCH_HOST}/indexes/politicians/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(SEARCH_KEY ? { Authorization: `Bearer ${SEARCH_KEY}` } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(2000), // 2s timeout
  });

  if (!res.ok) return null;
  return res.json();
}

async function searchViaSupabase(
  q: string,
  limit: number,
  house?: string,
  state?: string
): Promise<{ hits: SearchHit[]; query: string; processingTimeMs: number }> {
  const start = Date.now();

  const { createServerClient } = await import("@/lib/supabase");
  const supabase = await createServerClient();

  type PoliticianRow = {
    id: string;
    name: string;
    name_hindi: string | null;
    slug: string;
    constituency: string | null;
    state: string | null;
    house: string | null;
    is_active: boolean | null;
    profile_image_url: string | null;
    parties: { name: string; abbreviation: string | null } | null;
    assets_declarations: Array<{ net_worth: number | null; declaration_year: number }> | null;
    criminal_cases: Array<{ id: string }> | null;
  };

  let query = supabase
    .from("politicians")
    .select(
      `id, name, name_hindi, slug, constituency, state, house, is_active, profile_image_url,
       parties (name, abbreviation),
       assets_declarations (net_worth, declaration_year),
       criminal_cases (id)`
    )
    .or(`name.ilike.%${q}%,constituency.ilike.%${q}%,state.ilike.%${q}%`)
    .limit(limit);

  if (house) query = query.eq("house", house);
  if (state) query = query.ilike("state", `%${state}%`);

  const { data } = await query;
  const rows = castRows<PoliticianRow>(data);

  const hits: SearchHit[] = rows.map((p) => {
    const assets = (p.assets_declarations ?? [])
      .sort((a, b) => b.declaration_year - a.declaration_year);
    const caseCount = (p.criminal_cases ?? []).length;
    const party = p.parties;

    return {
      id: p.id,
      name: p.name,
      name_hindi: p.name_hindi ?? null,
      slug: p.slug,
      party_name: party?.name ?? "Independent",
      party_abbreviation: party?.abbreviation ?? null,
      constituency: p.constituency ?? null,
      state: p.state ?? null,
      house: p.house ?? null,
      net_worth: assets[0]?.net_worth ?? null,
      criminal_case_count: caseCount,
      has_criminal_cases: caseCount > 0,
      is_active: p.is_active ?? true,
      profile_image_url: p.profile_image_url ?? null,
    };
  });

  // Sort: exact name matches first, then party, then constituency
  const ql = q.toLowerCase();
  hits.sort((a, b) => {
    const aExact = a.name.toLowerCase().startsWith(ql) ? 0 : 1;
    const bExact = b.name.toLowerCase().startsWith(ql) ? 0 : 1;
    return aExact - bExact;
  });

  return { hits, query: q, processingTimeMs: Date.now() - start };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 50);
  const house = searchParams.get("house") ?? undefined;
  const state = searchParams.get("state") ?? undefined;

  if (!q.trim()) {
    return NextResponse.json({ hits: [], query: "", processingTimeMs: 0 });
  }

  // Try Meilisearch first (fast, typo-tolerant)
  // Fall back to Supabase if unavailable
  try {
    const filters: string[] = ["is_active = true"];
    if (house) filters.push(`house = "${house}"`);
    if (state) filters.push(`state = "${state}"`);

    const meiliResult = await searchViaMeilisearch(q, limit, filters);
    if (meiliResult) {
      return NextResponse.json(meiliResult);
    }
  } catch {
    // Meilisearch unavailable — fall through to Supabase
  }

  // Supabase fallback
  try {
    const result = await searchViaSupabase(q, limit, house, state);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ hits: [], query: q, processingTimeMs: 0 });
  }
}
