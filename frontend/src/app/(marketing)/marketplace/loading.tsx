import { Skeleton } from "@/src/components/ui/skeleton"

export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen bg-[#080010] text-zinc-100">
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        {/* Header Skeleton */}
        <div className="text-center max-w-2xl mx-auto space-y-4 flex flex-col items-center">
          <Skeleton className="h-6 w-28 bg-zinc-800/40 rounded-full" />
          <Skeleton className="h-12 w-96 bg-zinc-800/40" />
          <Skeleton className="h-4 w-full bg-zinc-800/40" />
          <Skeleton className="h-4 w-5/6 bg-zinc-800/40" />
        </div>

        {/* Card Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-zinc-950/60 border border-zinc-900 rounded-3xl p-6 space-y-6 min-h-[220px]">
              <div className="flex justify-between items-start">
                <Skeleton className="w-12 h-12 rounded-2xl bg-zinc-800/40" />
                <Skeleton className="w-20 h-5 rounded-full bg-zinc-800/40" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4 bg-zinc-800/40" />
                <Skeleton className="h-4 w-full bg-zinc-800/40" />
                <Skeleton className="h-4 w-5/6 bg-zinc-800/40" />
              </div>
              <div className="flex justify-between items-center border-t border-zinc-900/60 pt-4 mt-6">
                <Skeleton className="h-3.5 w-16 bg-zinc-800/40" />
                <Skeleton className="h-4 w-28 bg-zinc-800/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
