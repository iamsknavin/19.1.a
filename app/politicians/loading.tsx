import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

export default function PoliticiansLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <SkeletonLine className="h-6 w-32 mb-2" />
        <SkeletonLine className="h-4 w-48" />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filter sidebar skeleton */}
        <aside className="lg:w-56 shrink-0">
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, section) => (
              <div key={section}>
                <SkeletonLine className="h-3 w-16 mb-2" />
                <div className="space-y-1">
                  {Array.from({ length: section === 2 ? 6 : 3 }).map((_, i) => (
                    <SkeletonLine
                      key={i}
                      className="h-8 w-full rounded-sm"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Grid skeleton */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
