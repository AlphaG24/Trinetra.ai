import { Skeleton } from "@/src/components/ui/skeleton"

export default function AdminTenantsLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64 bg-zinc-800/40" />
        <Skeleton className="h-4 w-96 bg-zinc-800/40" />
      </div>

      {/* Controls Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <Skeleton className="h-10 w-full sm:w-80 bg-zinc-800/40 rounded-xl" />
        <div className="flex gap-2 w-full sm:w-auto">
          <Skeleton className="h-10 w-32 bg-zinc-800/40 rounded-xl" />
          <Skeleton className="h-10 w-32 bg-zinc-800/40 rounded-xl" />
        </div>
      </div>

      {/* Table Container Skeleton */}
      <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
        <div className="border-b border-zinc-900 bg-zinc-900/40 p-4 flex gap-4">
          <Skeleton className="h-4 w-1/4 bg-zinc-800/40" />
          <Skeleton className="h-4 w-1/6 bg-zinc-800/40" />
          <Skeleton className="h-4 w-1/12 bg-zinc-800/40" />
          <Skeleton className="h-4 w-1/12 bg-zinc-800/40" />
          <Skeleton className="h-4 w-1/6 bg-zinc-800/40" />
        </div>
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-900/40 last:border-0">
              <div className="flex items-center gap-3 w-1/4">
                <Skeleton className="w-8 h-8 rounded-lg bg-zinc-800/40 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4 bg-zinc-800/40" />
                  <Skeleton className="h-3 w-1/2 bg-zinc-800/40" />
                </div>
              </div>
              <Skeleton className="h-4 w-1/6 bg-zinc-800/40" />
              <Skeleton className="h-5 w-16 bg-zinc-800/40 rounded" />
              <Skeleton className="h-5 w-20 bg-zinc-800/40 rounded-full" />
              <Skeleton className="h-4 w-1/6 bg-zinc-800/40" />
              <Skeleton className="w-4 h-4 bg-zinc-800/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
