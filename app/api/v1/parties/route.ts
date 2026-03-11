import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { parsePagination, jsonResponse, errorResponse, checkRateLimit } from "@/lib/api-helpers";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const rateLimitError = checkRateLimit(request);
  if (rateLimitError) return rateLimitError;

  const { searchParams } = new URL(request.url);
  const { page, perPage, offset } = parsePagination(searchParams);

  const supabase = await createServerClient();

  const { data: partiesRaw, error } = await supabase
    .from("parties")
    .select("id, name, abbreviation, founded_year, ideology, logo_url")
    .order("name")
    .range(offset, offset + perPage - 1);

  if (error) return errorResponse(error.message, 500);

  const parties = (partiesRaw ?? []) as { id: string; name: string; abbreviation: string | null; founded_year: number | null; ideology: string | null; logo_url: string | null }[];

  // Get MP counts per party
  const { data: counts } = await supabase
    .from("politicians")
    .select("id, party_id") as { data: { id: string; party_id: string | null }[] | null };

  const countMap: Record<string, number> = {};
  for (const row of counts ?? []) {
    const pid = row.party_id;
    if (pid) {
      countMap[pid] = (countMap[pid] ?? 0) + 1;
    }
  }

  const result = parties.map((p) => ({
    ...p,
    mp_count: countMap[p.id] ?? 0,
  }));

  return jsonResponse(result, { page, per_page: perPage });
}
