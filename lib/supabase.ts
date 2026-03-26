import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Client-side Supabase client (uses anon key, respects RLS).
 * Safe to use in browser/client components.
 */
export function createBrowserClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Server-side Supabase client (uses anon key + cookies for session).
 * Use in Server Components, Route Handlers, Server Actions.
 */
export async function createServerClient() {
  const { createServerClient: createSSRServerClient } = await import(
    "@supabase/ssr"
  );
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return createSSRServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll called from Server Component — read-only, safe to ignore
        }
      },
    },
  });
}

/**
 * Service-role client for admin operations (scraper, sync jobs).
 * NEVER expose this to the browser. Server-only.
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createSupabaseClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Casts Supabase query results to the correct type.
 *
 * Supabase's TypeScript inference can produce `never[]` when chaining
 * filters like `.eq("is_active", true)` on boolean columns. This helper
 * provides a safe escape hatch without silencing the entire query type.
 *
 * @example
 * const rows = castRows<Politician>(data);
 */
export function castRows<T>(data: unknown): T[] {
  return (data ?? []) as T[];
}
