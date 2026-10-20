import { Skeleton } from "@/src/components/ui/skeleton"

export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0F172A]">
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        {/* Header Skeleton */}
        <div className="text-center max-w-2xl mx-auto space-y-4 flex flex-col items-center">
          <Skeleton className="h-6 w-28 bg-slate-200/80 rounded-full" />
          <Skeleton className="h-12 w-96 bg-slate-200/80 rounded-xl" />
          <Skeleton className="h-4 w-full bg-slate-200/80 rounded-lg" />
          <Skeleton className="h-4 w-5/6 bg-slate-200/80 rounded-lg" />
        </div>

        {/* Card Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] shadow-xs rounded-3xl p-6 space-y-6 min-h-[220px]">
              <div className="flex justify-between items-start">
                <Skeleton className="w-12 h-12 rounded-2xl bg-slate-200/80" />
                <Skeleton className="w-20 h-5 rounded-full bg-slate-200/80" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4 bg-slate-200/80" />
                <Skeleton className="h-4 w-full bg-slate-200/80" />
                <Skeleton className="h-4 w-5/6 bg-slate-200/80" />
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-6">
                <Skeleton className="h-3.5 w-16 bg-slate-200/80" />
                <Skeleton className="h-4 w-28 bg-slate-200/80" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
