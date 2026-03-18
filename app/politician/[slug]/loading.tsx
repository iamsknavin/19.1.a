import { SkeletonProfileHeader } from "@/components/ui/Skeleton";

export default function PoliticianLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <SkeletonProfileHeader />
    </div>
  );
}
