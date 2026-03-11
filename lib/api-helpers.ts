import { NextRequest, NextResponse } from "next/server";

/** Standard API response envelope */
export interface ApiResponse<T> {
  data: T;
  meta: {
    total?: number;
    page: number;
    per_page: number;
    timestamp: string;
  };
}

/** Parse pagination params from URL search params */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") ?? "20", 10) || 20));
  const offset = (page - 1) * perPage;
  return { page, perPage, offset };
}

/** Build a standard JSON response */
export function jsonResponse<T>(
  data: T,
  meta: { total?: number; page: number; per_page: number },
  status = 200,
): NextResponse {
  return NextResponse.json(
    {
      data,
      meta: { ...meta, timestamp: new Date().toISOString() },
    } satisfies ApiResponse<T>,
    {
      status,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
      },
    },
  );
}

/** Return a JSON error */
export function errorResponse(message: string, status = 400): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

/** Simple in-memory rate limiter (per-IP, resets every minute) */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per minute
const WINDOW_MS = 60_000;

export function checkRateLimit(request: NextRequest): NextResponse | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";

  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) {
    return errorResponse("Rate limit exceeded. Max 100 requests per minute.", 429);
  }

  return null;
}
