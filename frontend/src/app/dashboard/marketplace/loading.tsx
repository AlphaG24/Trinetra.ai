export default function MarketplaceLoading() {
  return (
    <div className="space-y-8 text-left animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-3 w-full md:w-1/3">
          <div className="h-8 bg-[var(--primary-bg)] rounded-xl w-3/4" />
          <div className="h-4 bg-[var(--primary-bg)] rounded-xl w-1/2" />
        </div>
        <div className="h-10 bg-[var(--primary-bg)] rounded-xl w-full md:w-80" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
        <div className="h-8 bg-[var(--primary-bg)] rounded-xl w-16" />
        <div className="h-8 bg-[var(--primary-bg)] rounded-xl w-24" />
        <div className="h-8 bg-[var(--primary-bg)] rounded-xl w-20" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="border border-[var(--border)] bg-[var(--card-bg)] rounded-2xl p-5 h-56 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--primary-bg)] shrink-0" />
                <div className="space-y-2 w-full">
                  <div className="h-4 bg-[var(--primary-bg)] rounded w-1/2" />
                  <div className="h-3 bg-[var(--primary-bg)] rounded w-1/4" />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-3 bg-[var(--primary-bg)] rounded w-full" />
                <div className="h-3 bg-[var(--primary-bg)] rounded w-5/6" />
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-[var(--border)]">
              <div className="h-4 bg-[var(--primary-bg)] rounded w-16" />
              <div className="h-3 bg-[var(--primary-bg)] rounded w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
