import { SkeletonStat, SkeletonPartyCard, SkeletonRow } from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <div>
      {/* Hero skeleton */}
      <section className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="border-l-2 border-accent/30 bg-accent/5 px-5 py-4 rounded-r-sm">
                <div className="h-3 w-48 bg-surface-2 animate-pulse rounded-sm mb-2" />
                <div className="h-5 w-72 bg-surface-2 animate-pulse rounded-sm" />
              </div>
              <div className="space-y-3">
                <div className="h-10 w-64 bg-surface-2 animate-pulse rounded-sm" />
                <div className="h-10 w-48 bg-surface-2 animate-pulse rounded-sm" />
                <div className="h-10 w-56 bg-surface-2 animate-pulse rounded-sm" />
              </div>
              <div className="h-4 w-80 bg-surface-2 animate-pulse rounded-sm" />
              <div className="h-10 w-full max-w-xl bg-surface-2 animate-pulse rounded-sm" />
            </div>
            <div className="hidden lg:block">
              <div className="h-80 bg-surface-2 animate-pulse rounded-sm" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar skeleton */}
      <section className="border-b border-border bg-surface-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonStat key={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Main content skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            {/* Party overview */}
            <section>
              <div className="h-3 w-32 bg-surface-2 animate-pulse rounded-sm mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonPartyCard key={i} />
                ))}
              </div>
            </section>
            {/* Recent updates */}
            <section>
              <div className="h-3 w-36 bg-surface-2 animate-pulse rounded-sm mb-4" />
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </section>
          </div>
          <div className="hidden lg:block">
            <div className="h-3 w-28 bg-surface-2 animate-pulse rounded-sm mb-4" />
            <div className="h-80 bg-surface-2 animate-pulse rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
