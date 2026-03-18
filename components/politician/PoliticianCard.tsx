import Link from "next/link";
import Image from "next/image";
import { formatIndianCurrency } from "@/lib/formatters";
import { HOUSE_LABELS } from "@/lib/utils";
import { PartyBadge } from "./PartyBadge";
import { CasesBadge } from "./CasesBadge";
import type { PoliticianCard as PoliticianCardType } from "@/types";

interface PoliticianCardProps {
  politician: PoliticianCardType;
}

export function PoliticianCard({ politician: p }: PoliticianCardProps) {
  const hasHeinous = false; // Phase 2: compute from criminal_cases
  const houseLabel = HOUSE_LABELS[p.house ?? ""] ?? p.house;

  return (
    <Link
      href={`/politician/${p.slug}`}
      className="block bg-surface border border-border hover:border-accent/40 transition-all duration-200 p-4 rounded-sm group hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="flex gap-3">
        {/* Photo */}
        <div className="shrink-0">
          {p.profile_image_url ? (
            <Image
              src={p.profile_image_url}
              alt={p.name}
              width={56}
              height={56}
              className="w-14 h-14 object-cover rounded-sm grayscale group-hover:grayscale-0 transition-all"
            />
          ) : (
            <div className="w-14 h-14 bg-surface-2 rounded-sm flex items-center justify-center border border-border">
              <span className="text-text-muted font-mono text-lg">
                {p.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-text-primary group-hover:text-accent transition-colors truncate">
              {p.name}
            </h3>
            <CasesBadge
              count={p.criminal_case_count}
              hasHeinous={hasHeinous}
              className="shrink-0"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <PartyBadge party={p.parties} />
            {houseLabel && (
              <span className="text-2xs font-mono text-text-muted border border-border/50 px-1.5 py-0.5 rounded-sm">
                {houseLabel}
              </span>
            )}
          </div>

          {p.constituency && (
            <p className="text-xs text-text-secondary mt-1.5 truncate font-mono">
              {p.constituency}
              {p.state && <span className="text-text-muted"> · {p.state}</span>}
            </p>
          )}

          {p.latest_net_worth !== null && (
            <p className="text-xs font-mono text-accent mt-1.5">
              {formatIndianCurrency(p.latest_net_worth)}
              <span className="text-text-muted"> net worth</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
