import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { jsonResponse, errorResponse, checkRateLimit } from "@/lib/api-helpers";

export const revalidate = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const rateLimitError = checkRateLimit(request);
  if (rateLimitError) return rateLimitError;

  const { slug } = await params;
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("politicians")
    .select(
      `*,
       parties (*),
       assets_declarations (*),
       criminal_cases (*),
       election_terms (*),
       attendance_records (*),
       corruption_signals (*),
       controversies (*),
       fund_usage (*)`,
    )
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return errorResponse("Politician not found", 404);
  }

  return jsonResponse(data, { page: 1, per_page: 1, total: 1 });
}
