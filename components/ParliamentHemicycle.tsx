"use client";

import { useState } from "react";
import type { Seat, CoalitionStat } from "@/lib/hemicycle-layout";
import { PARTY_NAMES } from "@/lib/coalitions";

interface Props {
  seats: Seat[];
  coalitionStats: CoalitionStat[];
  totalSeats: number;
  className?: string;
}

export function ParliamentHemicycle({
  seats,
  coalitionStats,
  totalSeats,
  className = "",
}: Props) {
  const [hoveredParty, setHoveredParty] = useState<string | null>(null);

  // Count seats per party for tooltip
  const partyCounts: Record<string, number> = {};
  for (const s of seats) {
    partyCounts[s.party] = (partyCounts[s.party] ?? 0) + 1;
  }

  const DOT_RADIUS = 3.4;

  return (
    <div className={className}>
      <svg
        viewBox="0 0 500 280"
        className="w-full h-auto"
        role="img"
        aria-label={`Parliament hemicycle showing ${totalSeats} Lok Sabha seats`}
        onMouseLeave={() => setHoveredParty(null)}
      >
        {/* Decorative outer arc */}
        <path
          d="M 8,265 A 242,242 0 0,1 492,265"
          fill="none"
          stroke="#e8c547"
          strokeWidth="0.5"
          opacity={0.3}
        />
        {/* Decorative inner arc */}
        <path
          d="M 162,265 A 88,88 0 0,1 338,265"
          fill="none"
          stroke="#e8c547"
          strokeWidth="0.5"
          opacity={0.2}
        />

        {/* Seat dots */}
        {seats.map((seat, i) => {
          const isHovered = hoveredParty === seat.party;
          const isDimmed = hoveredParty !== null && !isHovered;

          return (
            <circle
              key={i}
              cx={seat.x}
              cy={seat.y}
              r={isHovered ? DOT_RADIUS + 0.8 : DOT_RADIUS}
              fill={seat.color}
              opacity={isDimmed ? 0.15 : 1}
              stroke={isHovered ? "#fff" : "none"}
              strokeWidth={isHovered ? 0.5 : 0}
              className="transition-opacity duration-150"
              onMouseEnter={() => setHoveredParty(seat.party)}
              style={{ cursor: "pointer" }}
            />
          );
        })}

        {/* Center label */}
        <text
          x="250"
          y="260"
          textAnchor="middle"
          className="fill-text-muted"
          style={{ fontSize: "10px", fontFamily: "IBM Plex Mono, monospace" }}
        >
          {totalSeats} seats
        </text>
      </svg>

      {/* Tooltip — party name + count */}
      {hoveredParty && (
        <div className="text-center -mt-2 mb-1">
          <span
            className="inline-flex items-center gap-2 font-mono text-xs px-3 py-1 border border-border bg-surface rounded-sm"
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: seats.find((s) => s.party === hoveredParty)?.color }}
            />
            <span className="text-text-primary font-semibold">
              {PARTY_NAMES[hoveredParty] ?? hoveredParty}
            </span>
            <span className="text-text-muted">
              {hoveredParty}
            </span>
            <span className="text-text-secondary">
              · {partyCounts[hoveredParty]} seats
            </span>
          </span>
        </div>
      )}

      {/* Coalition legend */}
      <div className="flex items-center justify-center gap-4 mt-1 flex-wrap">
        {coalitionStats.map((c) => (
          <div key={c.name} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: c.color }}
            />
            <span className="font-mono text-2xs text-text-secondary">
              {c.label}
            </span>
            <span className="font-mono text-2xs text-text-muted">
              {c.seats}
            </span>
            <span className="font-mono text-2xs text-text-muted">
              ({Math.round((c.seats / totalSeats) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
