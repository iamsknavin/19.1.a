import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { parsePagination, jsonResponse, errorResponse, checkRateLimit } from "@/lib/api-helpers";

export const revalidate = 300;

interface PoliticianRow {
  id: string;
  name: string;
  slug: string;
  constituency: string | null;
  state: string | null;
  house: string | null;
  is_active: boolean | null;
  profile_image_url: string | null;
  parties: { id: string; name: string; abbreviation: string | null } | null;
  criminal_cases: { id: string }[];
  assets_declarations: { net_worth: number | null; declaration_year: number }[];
}

export async function GET(request: NextRequest) {
  const rateLimitError = checkRateLimit(request);
  if (rateLimitError) return rateLimitError;

  const { searchParams } = new URL(request.url);
  const { page, perPage, offset } = parsePagination(searchParams);

  const state = searchParams.get("state");
  const house = searchParams.get("house");
  const hasCases = searchParams.get("has_cases");
  const search = searchParams.get("q");

  const supabase = await createServerClient();

  const { data, count, error } = await supabase
    .from("politicians")
    .select(
      `id, name, slug, constituency, state, house, is_active, profile_image_url,
       parties (id, name, abbreviation),
       criminal_cases (id),
       assets_declarations (net_worth, declaration_year)`,
      { count: "exact" },
    )
    .order("name")
    .range(offset, offset + perPage - 1);

  if (error) return errorResponse(error.message, 500);

  const rows = (data ?? []) as unknown as PoliticianRow[];

  // Transform and filter
  const politicians = rows
    .filter((p) => p.is_active !== false)
    .filter((p) => !state || p.state === state)
    .filter((p) => !house || p.house === house)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .map((p) => {
      const latestAssets = [...(p.assets_declarations ?? [])]
        .sort((a, b) => b.declaration_year - a.declaration_year)[0];
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        constituency: p.constituency,
        state: p.state,
        house: p.house,
        is_active: p.is_active,
        profile_image_url: p.profile_image_url,
        party: p.parties,
        criminal_case_count: p.criminal_cases?.length ?? 0,
        net_worth: latestAssets?.net_worth ?? null,
      };
    })
    .filter((p) => {
      if (hasCases === "true") return p.criminal_case_count > 0;
      if (hasCases === "false") return p.criminal_case_count === 0;
      return true;
    });

  return jsonResponse(politicians, { total: count ?? 0, page, per_page: perPage });
}
