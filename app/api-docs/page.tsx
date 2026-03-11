import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API Documentation — NETAwatch",
  description: "Public REST API for accessing Indian politician transparency data.",
};

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/politicians",
    description: "List politicians with filtering and pagination",
    params: [
      { name: "page", type: "number", description: "Page number (default: 1)" },
      { name: "per_page", type: "number", description: "Results per page (default: 20, max: 100)" },
      { name: "state", type: "string", description: "Filter by state (e.g., Delhi, Maharashtra)" },
      { name: "house", type: "string", description: "Filter by house: lok_sabha, rajya_sabha, vidhan_sabha" },
      { name: "party", type: "string", description: "Filter by party abbreviation (e.g., BJP, INC)" },
      { name: "has_cases", type: "boolean", description: "Filter: true = only with cases, false = only clean" },
      { name: "q", type: "string", description: "Search by politician name" },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/politicians/:slug",
    description: "Full politician profile with all related data",
    params: [
      { name: "slug", type: "string", description: "URL slug of the politician (path parameter)" },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/parties",
    description: "List all parties with MP counts",
    params: [
      { name: "page", type: "number", description: "Page number (default: 1)" },
      { name: "per_page", type: "number", description: "Results per page (default: 20, max: 100)" },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/stats",
    description: "Aggregate platform statistics",
    params: [],
  },
];

export default function ApiDocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="font-mono text-2xs text-text-muted mb-6">
        <Link href="/" className="hover:text-text-primary transition-colors">Home</Link>
        <span className="mx-2">&rsaquo;</span>
        <span className="text-text-secondary">API Documentation</span>
      </nav>

      <h1 className="font-mono text-xl text-text-primary mb-2">
        NETAwatch Public API
      </h1>
      <p className="text-sm text-text-secondary mb-8 leading-relaxed max-w-2xl">
        Free, open access to Indian politician transparency data. All endpoints
        return JSON. Rate limit: 100 requests per minute.
      </p>

      <div className="bg-surface border border-border rounded-sm p-4 mb-8">
        <p className="font-mono text-xs text-text-secondary mb-2">Base URL</p>
        <code className="font-mono text-sm text-accent">
          https://netawatch.vercel.app/api/v1
        </code>
      </div>

      <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-4">
        Endpoints
      </h2>

      <div className="space-y-6">
        {ENDPOINTS.map((ep) => (
          <div key={ep.path} className="bg-surface border border-border rounded-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-2xs bg-safe/20 text-safe border border-safe/50 px-2 py-0.5 rounded-sm font-semibold">
                {ep.method}
              </span>
              <code className="font-mono text-sm text-text-primary">{ep.path}</code>
            </div>
            <p className="text-xs text-text-secondary mb-3">{ep.description}</p>

            {ep.params.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="font-mono text-2xs text-text-muted uppercase tracking-wider mb-2">
                  Parameters
                </p>
                <div className="space-y-1.5">
                  {ep.params.map((param) => (
                    <div key={param.name} className="flex items-baseline gap-3 text-xs">
                      <code className="font-mono text-accent shrink-0">{param.name}</code>
                      <span className="font-mono text-2xs text-text-muted">{param.type}</span>
                      <span className="text-text-secondary">{param.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-surface border border-border rounded-sm p-5">
        <h3 className="font-mono text-xs text-text-secondary uppercase tracking-widest mb-3">
          Response Format
        </h3>
        <pre className="font-mono text-xs text-text-secondary overflow-x-auto leading-relaxed">
{`{
  "data": [ ... ],
  "meta": {
    "total": 545,
    "page": 1,
    "per_page": 20,
    "timestamp": "2026-03-11T12:00:00.000Z"
  }
}`}
        </pre>
      </div>

      <div className="mt-8 border border-dashed border-border rounded-sm p-5 text-center">
        <p className="text-xs text-text-muted">
          Data sourced from MyNeta/ADR, PRS India, eCourts, and MPLADS.
          For questions, open an issue on GitHub.
        </p>
      </div>
    </div>
  );
}
