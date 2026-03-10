import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { computeSignals } from "@/lib/corruption-signals";

/**
 * POST /api/compute-signals
 * Computes corruption risk signals for all politicians.
 * Requires SUPABASE_SERVICE_ROLE_KEY (admin-only endpoint).
 *
 * Query params:
 *   ?politician_id=UUID  — compute for a single politician
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const singleId = searchParams.get("politician_id");

  try {
    const supabase = createServiceClient();

    // Fetch politicians with related data
    let query = supabase
      .from("politicians")
      .select("id, name, criminal_cases(*), attendance_records(*), assets_declarations(*)");

    if (singleId) {
      query = query.eq("id", singleId);
    }

    const { data: politicians, error } = await query;
    if (error) throw error;

    let totalSignals = 0;
    let processedCount = 0;

    for (const p of politicians ?? []) {
      const signals = computeSignals(p);
      processedCount++;

      if (signals.length === 0) continue;

      // Clear old auto-generated signals for this politician
      await supabase
        .from("corruption_signals")
        .delete()
        .eq("politician_id", p.id)
        .eq("auto_generated", true);

      // Insert new signals
      const { error: insertErr } = await supabase
        .from("corruption_signals")
        .insert(signals);

      if (insertErr) {
        console.error(`Signal insert error for ${p.name}:`, insertErr);
      } else {
        totalSignals += signals.length;
      }
    }

    return NextResponse.json({
      success: true,
      politicians_processed: processedCount,
      signals_generated: totalSignals,
    });
  } catch (err) {
    console.error("Compute signals error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
