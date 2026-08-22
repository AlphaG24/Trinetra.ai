export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      {/* 1. Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-lg bg-zinc-200 dark:bg-zinc-850 animate-pulse" />
        <div className="h-4 w-96 rounded bg-zinc-200 dark:bg-zinc-850 animate-pulse" />
      </div>

      {/* 2. Quick Actions Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-zinc-200 dark:bg-zinc-850 animate-pulse" />
        ))}
      </div>

      {/* 3. KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-zinc-200 dark:bg-zinc-850 animate-pulse" />
        ))}
      </div>

      {/* 4. Deployed Tools & Activity Feed Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Tools) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-850 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-zinc-200 dark:bg-zinc-850 animate-pulse" />
            ))}
          </div>
        </div>

        {/* Right Column (Activity Feed) */}
        <div className="space-y-4">
          <div className="h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-850 animate-pulse" />
          <div className="p-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
             {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-850 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 bg-zinc-200 dark:bg-zinc-850 rounded animate-pulse" />
                  <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-850 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
