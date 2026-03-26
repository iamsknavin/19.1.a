"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatIndianCurrency } from "@/lib/formatters";
import type { PoliticianSearchDoc } from "@/lib/meilisearch";

interface SearchBarProps {
  compact?: boolean;
  autoFocus?: boolean;
}

export function SearchBar({ compact, autoFocus }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PoliticianSearchDoc[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search — waits 300 ms after the user stops typing before
  // hitting the API, preventing a request on every keystroke.
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    // Cancel any in-flight debounce timer before scheduling a new one.
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}&limit=8`
        );
        const data = await res.json();
        setResults(data.hits ?? []);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    // Cleanup: cancel the timer if the component unmounts mid-debounce.
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Click-outside detection — close the dropdown when the user clicks
  // anywhere outside the search container (input + results panel).
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      router.push(`/politicians?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder="Search politicians, parties, constituencies…"
            autoFocus={autoFocus}
            className={`
              w-full bg-surface-2 border border-border text-text-primary placeholder-text-muted
              font-mono focus:outline-none focus:border-accent transition-colors
              ${compact ? "text-xs px-3 py-1.5 rounded-sm" : "text-sm px-4 py-3 rounded-sm"}
            `}
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-mono">
              …
            </span>
          )}
          {!loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-mono">
              ⌘K
            </span>
          )}
        </div>
      </form>

      {/* Dropdown results — shows up to 8 hits with name, party, net worth,
          and criminal case count. A "See all results" link at the bottom
          navigates to the full browse page with the query pre-filled. */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border shadow-xl z-50 max-h-96 overflow-y-auto rounded-sm">
          {results.map((hit) => (
            <Link
              key={hit.id}
              href={`/politician/${hit.slug}`}
              onClick={() => {
                setIsOpen(false);
                setQuery("");
              }}
              className="flex items-center justify-between px-3 py-2.5 hover:bg-surface-2 border-b border-border/50 last:border-0 group"
            >
              <div className="min-w-0">
                <p className="text-sm text-text-primary group-hover:text-accent transition-colors font-medium truncate">
                  {hit.name}
                </p>
                <p className="text-xs text-text-muted font-mono truncate">
                  {hit.party_abbreviation ?? hit.party_name} ·{" "}
                  {hit.constituency ?? hit.state ?? hit.house}
                </p>
              </div>
              <div className="text-right shrink-0 ml-3">
                {hit.net_worth !== null && (
                  <p className="text-xs font-mono text-accent">
                    {formatIndianCurrency(hit.net_worth)}
                  </p>
                )}
                {hit.criminal_case_count > 0 && (
                  <p className="text-2xs font-mono text-danger">
                    {hit.criminal_case_count} case{hit.criminal_case_count !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </Link>
          ))}
          <div className="px-3 py-2 border-t border-border">
            <Link
              href={`/politicians?q=${encodeURIComponent(query)}`}
              onClick={() => { setIsOpen(false); setQuery(""); }}
              className="text-2xs font-mono text-text-secondary hover:text-accent transition-colors"
            >
              See all results for &ldquo;{query}&rdquo; →
            </Link>
          </div>
        </div>
      )}

      {isOpen && query && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border shadow-xl z-50 rounded-sm">
          <p className="px-3 py-4 text-xs font-mono text-text-muted text-center">
            No results for &ldquo;{query}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
