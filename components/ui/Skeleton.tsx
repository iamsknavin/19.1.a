import { cn } from "@/lib/utils";

interface SkeletonLineProps {
  className?: string;
}

export function SkeletonLine({ className }: SkeletonLineProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-surface-2 rounded-sm",
        className ?? "h-4 w-full"
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-surface border border-border p-4 rounded-sm">
      <div className="flex gap-3">
        <div className="shrink-0 w-14 h-14 bg-surface-2 rounded-sm animate-pulse" />
        <div className="flex-1 min-w-0 space-y-2">
          <SkeletonLine className="h-4 w-3/4" />
          <div className="flex gap-2">
            <SkeletonLine className="h-5 w-16 rounded-sm" />
            <SkeletonLine className="h-5 w-20 rounded-sm" />
          </div>
          <SkeletonLine className="h-3 w-1/2" />
          <SkeletonLine className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="bg-surface border border-border p-4 rounded-sm space-y-2">
      <SkeletonLine className="h-3 w-20" />
      <SkeletonLine className="h-6 w-16" />
      <SkeletonLine className="h-2 w-24" />
    </div>
  );
}

export function SkeletonPartyCard() {
  return (
    <div className="bg-surface border border-border p-4 rounded-sm space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonLine className="h-5 w-12 rounded-sm" />
        <SkeletonLine className="h-4 w-14" />
      </div>
      <SkeletonLine className="h-4 w-3/4" />
      <div className="flex gap-4">
        <SkeletonLine className="h-3 w-16" />
        <SkeletonLine className="h-3 w-20" />
      </div>
    </div>
  );
}

export function SkeletonProfileHeader() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <SkeletonLine className="h-3 w-48" />
      {/* Profile header */}
      <div className="flex gap-6">
        <div className="shrink-0 w-24 h-24 bg-surface-2 rounded-sm animate-pulse" />
        <div className="flex-1 space-y-3">
          <SkeletonLine className="h-6 w-64" />
          <div className="flex gap-2">
            <SkeletonLine className="h-5 w-16 rounded-sm" />
            <SkeletonLine className="h-5 w-24 rounded-sm" />
          </div>
          <SkeletonLine className="h-4 w-48" />
          <SkeletonLine className="h-4 w-32" />
        </div>
      </div>
      {/* Tabs */}
      <div className="flex gap-4 border-b border-border pb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLine key={i} className="h-4 w-16" />
        ))}
      </div>
      {/* Content */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonLine key={i} className={`h-4 ${i % 2 === 0 ? "w-full" : "w-3/4"}`} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 border-b border-border/50">
      <div className="flex items-center gap-3 flex-1">
        <SkeletonLine className="h-3 w-4" />
        <SkeletonLine className="h-4 w-40" />
        <SkeletonLine className="h-3 w-10 hidden sm:block" />
      </div>
      <SkeletonLine className="h-3 w-12" />
    </div>
  );
}
