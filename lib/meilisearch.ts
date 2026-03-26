import { MeiliSearch } from "meilisearch";

const host = process.env.NEXT_PUBLIC_MEILISEARCH_HOST || "http://localhost:7700";
const searchKey = process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY || "";
const adminKey = process.env.MEILISEARCH_ADMIN_KEY || "";

/** Search-only client — safe for browser use */
export const meiliSearchClient = new MeiliSearch({
  host,
  apiKey: searchKey,
});

/** Admin client — server-only, never expose to browser */
export const meiliAdminClient = new MeiliSearch({
  host,
  apiKey: adminKey,
});

export const POLITICIANS_INDEX = "politicians";

export interface PoliticianSearchDoc {
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
}

/**
 * Configure Meilisearch index settings.
 * Call once on setup or when settings change.
 */
export async function configureSearchIndex() {
  const index = meiliAdminClient.index(POLITICIANS_INDEX);

  await index.updateSettings({
    searchableAttributes: [
      "name",
      "name_hindi",
      "party_name",
      "constituency",
      "state",
    ],
    filterableAttributes: [
      "house",
      "state",
      "party_name",
      "has_criminal_cases",
      "is_active",
    ],
    sortableAttributes: ["net_worth", "criminal_case_count", "name"],
    displayedAttributes: [
      "id",
      "name",
      "name_hindi",
      "slug",
      "party_name",
      "party_abbreviation",
      "constituency",
      "state",
      "house",
      "net_worth",
      "criminal_case_count",
      "has_criminal_cases",
      "is_active",
      "profile_image_url",
    ],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
    },
  });
}

/**
 * Sync all active politicians from Supabase into Meilisearch.
 *
 * Fetches every politician where `is_active = true`, joins their latest
 * asset declaration and total criminal case count, then bulk-upserts the
 * resulting documents into the `politicians` Meilisearch index.
 *
 * Also reconfigures index settings (searchable / filterable / sortable
 * attributes) on every run — safe to call repeatedly.
 *
 * Call this after every scraper run, or on demand via `POST /api/sync-search`
 * (requires `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`).
 *
 * @returns Object with `added` (document count upserted) and `errors`
 *   (array containing the Meilisearch task UID for async status tracking).
 */
export async function syncPoliticiansIndex(): Promise<{
  added: number;
  errors: string[];
}> {
  const { createServiceClient } = await import("@/lib/supabase");
  const supabase = createServiceClient();

  const { data: politicians, error } = await supabase
    .from("politicians")
    .select(
      `
      id, name, name_hindi, slug, constituency, state, house,
      is_active, profile_image_url,
      parties (name, abbreviation),
      assets_declarations (net_worth, declaration_year),
      criminal_cases (id)
    `
    )
    .eq("is_active", true);

  if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
  if (!politicians) return { added: 0, errors: [] };

  const docs: PoliticianSearchDoc[] = politicians.map((p) => {
    // Latest asset declaration
    const latestAssets = (p.assets_declarations as Array<{ net_worth: number | null; declaration_year: number }> | null)
      ?.sort((a, b) => b.declaration_year - a.declaration_year)[0];

    const caseCount = (p.criminal_cases as Array<{ id: string }> | null)?.length ?? 0;
    const party = p.parties as { name: string; abbreviation: string | null } | null;

    return {
      id: p.id,
      name: p.name,
      name_hindi: p.name_hindi,
      slug: p.slug,
      party_name: party?.name ?? "Independent",
      party_abbreviation: party?.abbreviation ?? null,
      constituency: p.constituency,
      state: p.state,
      house: p.house,
      net_worth: latestAssets?.net_worth ?? null,
      criminal_case_count: caseCount,
      has_criminal_cases: caseCount > 0,
      is_active: p.is_active ?? true,
      profile_image_url: p.profile_image_url,
    };
  });

  const index = meiliAdminClient.index(POLITICIANS_INDEX);
  await configureSearchIndex();
  const task = await index.addDocuments(docs, { primaryKey: "id" });

  return { added: docs.length, errors: [String(task.taskUid)] };
}
