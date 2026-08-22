export default function AnalyticsLoading() {
  return (
    <div className="space-y-8 animate-pulse text-left">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-[var(--primary-bg)] rounded-lg" />
          <div className="h-4 w-72 bg-[var(--primary-bg)]/50 rounded-lg" />
        </div>
        <div className="h-10 w-64 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 h-[120px] flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 bg-[var(--primary-bg)] rounded" />
              <div className="h-7 w-7 bg-[var(--primary-bg)]/60 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <div className="h-7 w-16 bg-[var(--primary-bg)] rounded-md" />
              <div className="h-2 w-28 bg-[var(--primary-bg)]/40 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 h-80 flex flex-col justify-between"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="space-y-1.5">
                <div className="h-4 w-36 bg-[var(--primary-bg)] rounded" />
                <div className="h-2 w-28 bg-[var(--primary-bg)]/40 rounded" />
              </div>
              <div className="h-7 w-7 bg-[var(--primary-bg)]/60 rounded-lg" />
            </div>
            <div className="flex-1 bg-[var(--background)] rounded-xl w-full h-full" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-[var(--primary-bg)] rounded" />
            <div className="h-2 w-24 bg-[var(--primary-bg)]/40 rounded" />
          </div>
          <div className="h-9 w-28 bg-[var(--primary-bg)] rounded-xl" />
        </div>
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="h-10 bg-[var(--background)] border-b border-[var(--border)]" />
          <div className="divide-y divide-[var(--border)]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-transparent" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
