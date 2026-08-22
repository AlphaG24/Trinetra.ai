export default function MarketplaceDetailLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 text-left animate-pulse">
      {/* Back link skeleton */}
      <div className="h-4 bg-[var(--primary-bg)] rounded-xl w-32" />

      {/* Hero Header Skeleton */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-3 w-full md:w-2/3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[var(--primary-bg)] shrink-0" />
            <div className="space-y-2 w-full">
              <div className="h-6 bg-[var(--primary-bg)] rounded-xl w-1/3" />
              <div className="h-3 bg-[var(--primary-bg)] rounded-xl w-1/4" />
            </div>
          </div>
          <div className="h-4 bg-[var(--primary-bg)] rounded-xl w-3/4" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto shrink-0">
          <div className="h-10 bg-[var(--primary-bg)] rounded-xl w-24" />
          <div className="h-10 bg-[var(--primary-bg)] rounded-xl w-24" />
        </div>
      </div>

      {/* Detail Layout Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Overview */}
          <div className="space-y-3">
            <div className="h-6 bg-[var(--primary-bg)] rounded-xl w-1/4" />
            <div className="h-4 bg-[var(--primary-bg)] rounded-xl w-full" />
            <div className="h-4 bg-[var(--primary-bg)] rounded-xl w-5/6" />
          </div>

          {/* Capabilities */}
          <div className="space-y-4">
            <div className="h-6 bg-[var(--primary-bg)] rounded-xl w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 h-20" />
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="h-80 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6" />
      </div>
    </div>
  )
}
