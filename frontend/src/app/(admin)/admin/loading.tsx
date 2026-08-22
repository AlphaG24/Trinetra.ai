import { Skeleton } from "@/src/components/ui/skeleton"

export default function AdminOverviewLoading() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64 bg-zinc-800/40" />
        <Skeleton className="h-4 w-96 bg-zinc-800/40" />
      </div>

      {/* Grid of 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 bg-zinc-800/40" />
              <Skeleton className="h-4 w-4 bg-zinc-800/40" />
            </div>
            <Skeleton className="h-8 w-20 bg-zinc-800/40" />
            <Skeleton className="h-3.5 w-32 bg-zinc-800/40" />
          </div>
        ))}
      </div>

      {/* Large Banner Card Skeleton */}
      <div className="bg-[#0f1117]/90 border border-zinc-900 rounded-2xl p-6 space-y-3">
        <Skeleton className="h-5 w-60 bg-zinc-800/40" />
        <Skeleton className="h-4 w-full bg-zinc-800/40" />
        <Skeleton className="h-4 w-3/4 bg-zinc-800/40" />
      </div>
    </div>
  )
}
