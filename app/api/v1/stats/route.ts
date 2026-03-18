import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { jsonResponse, checkRateLimit } from "@/lib/api-helpers";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const rateLimitError = checkRateLimit(request);
  if (rateLimitError) return rateLimitError;

  const supabase = await createServerClient();

  const [politicians, cases, signals, controversies, attendance, assets, fundUsage, companyInterests] = await Promise.all([
    supabase.from("politicians").select("id, house", { count: "exact" }),
    supabase.from("criminal_cases").select("id", { count: "exact" }),
    supabase.from("corruption_signals").select("id", { count: "exact" }),
    supabase.from("controversies").select("id", { count: "exact" }),
    supabase.from("attendance_records").select("id", { count: "exact" }),
    supabase.from("assets_declarations").select("id", { count: "exact" }),
    supabase.from("fund_usage").select("id", { count: "exact" }),
    supabase.from("company_interests").select("id", { count: "exact" }),
  ]);

  const politicianData = (politicians.data ?? []) as unknown as { id: string; house: string | null }[];
  const lokSabha = politicianData.filter((p) => p.house === "lok_sabha").length;
  const rajyaSabha = politicianData.filter((p) => p.house === "rajya_sabha").length;
  const vidhanSabha = politicianData.filter((p) => p.house === "vidhan_sabha").length;

  const stats = {
    total_politicians: politicians.count ?? 0,
    lok_sabha: lokSabha,
    rajya_sabha: rajyaSabha,
    vidhan_sabha: vidhanSabha,
    total_criminal_cases: cases.count ?? 0,
    total_corruption_signals: signals.count ?? 0,
    total_controversies: controversies.count ?? 0,
    total_attendance_records: attendance.count ?? 0,
    total_assets_declarations: assets.count ?? 0,
    total_fund_usage: fundUsage.count ?? 0,
    total_company_interests: companyInterests.count ?? 0,
  };

  return jsonResponse(stats, { page: 1, per_page: 1 });
}
