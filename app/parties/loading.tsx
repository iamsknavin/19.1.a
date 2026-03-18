import { SkeletonStat, SkeletonPartyCard, SkeletonLine } from "@/components/ui/Skeleton";

export default function PartiesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <SkeletonLine className="h-3 w-24 mb-2" />
        <SkeletonLine className="h-7 w-32 mb-1" />
        <SkeletonLine className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonStat key={i} />
        ))}
      </div>

      <section>
        <SkeletonLine className="h-3 w-48 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonPartyCard key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
