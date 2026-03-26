import { NextRequest, NextResponse } from "next/server";
import { syncPoliticiansIndex } from "@/lib/meilisearch";

/**
 * Admin endpoint to sync the Meilisearch index. Requires service role authorization.
 * Call after bulk data imports.
 *
 * POST /api/sync-search
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *
 * Fetches all active politicians from Supabase and upserts them into the
 * Meilisearch `politicians` index. Also reconfigures index settings on each run.
 * Called automatically by the scraper after a successful crawl, or manually
 * via curl for ad-hoc resyncs.
 */
export async function POST(req: NextRequest) {
  // Verify service role key
  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncPoliticiansIndex();
    return NextResponse.json({
      success: true,
      added: result.added,
      message: `Synced ${result.added} politicians to Meilisearch`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/** GET for health check / status */
export async function GET() {
  return NextResponse.json({
    service: "search-sync",
    phase: 1,
    meilisearch_host: process.env.NEXT_PUBLIC_MEILISEARCH_HOST ?? "not configured",
  });
}
