import { Skeleton } from "@/src/components/ui/skeleton"

export default function AgentDetailLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0F172A]">
      <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column Skeleton */}
        <div className="lg:col-span-2 space-y-12">
          {/* Hero Banner Skeleton */}
          <div className="bg-white border border-[#E2E8F0] shadow-xs rounded-3xl p-8 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-2xl bg-slate-200/80" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48 bg-slate-200/80 rounded-xl" />
                <Skeleton className="h-4 w-24 bg-slate-200/80 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-4 w-full bg-slate-200/80 rounded-lg" />
            <Skeleton className="h-4 w-5/6 bg-slate-200/80 rounded-lg" />
          </div>

          {/* Capabilities Grid Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-48 bg-slate-200/80 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex items-center gap-3">
                  <Skeleton className="w-5 h-5 rounded-full bg-slate-200/80" />
                  <Skeleton className="h-4 w-3/4 bg-slate-200/80 rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          {/* How It Works Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-36 bg-slate-200/80 rounded-xl" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex items-center gap-4">
                  <Skeleton className="w-8 h-8 rounded-lg bg-slate-200/80 shrink-0" />
                  <Skeleton className="h-4 w-5/6 bg-slate-200/80 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar Card) Skeleton */}
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 space-y-6 shadow-sm">
            <div className="space-y-2">
              <Skeleton className="h-6 w-44 bg-slate-200/80 rounded-xl" />
              <Skeleton className="h-4 w-full bg-slate-200/80 rounded-lg" />
            </div>
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 space-y-3">
                <Skeleton className="h-4 w-28 bg-slate-200/80 rounded-lg" />
                <Skeleton className="h-3 w-40 bg-slate-200/80 rounded-lg" />
                <Skeleton className="h-3 w-32 bg-slate-200/80 rounded-lg" />
              </div>
              <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 space-y-3">
                <Skeleton className="h-4 w-28 bg-slate-200/80 rounded-lg" />
                <Skeleton className="h-3 w-40 bg-slate-200/80 rounded-lg" />
                <Skeleton className="h-3 w-32 bg-slate-200/80 rounded-lg" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-full bg-slate-200/80 rounded-xl" />
              <Skeleton className="h-10 w-full bg-slate-200/80 rounded-xl" />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
