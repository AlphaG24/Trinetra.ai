export default function SettingsLoading() {
  return (
    <div className="space-y-8 animate-pulse text-left">
      {/* Header Skeleton */}
      <div className="space-y-2 pb-6 border-b border-[var(--border)]">
        <div className="h-8 w-44 bg-[var(--primary-bg)] rounded-lg" />
        <div className="h-4 w-64 bg-[var(--primary-bg)]/50 rounded-lg" />
      </div>

      {/* Tab bar skeleton */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-[var(--border)]">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 w-28 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shrink-0" />
        ))}
      </div>

      {/* Two column form fields skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, colIdx) => (
          <div key={colIdx} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6">
            <div className="h-5 w-40 bg-[var(--primary-bg)] rounded pb-2 border-b border-[var(--border)]" />
            
            <div className="space-y-4">
              {[...Array(3)].map((_, inputIdx) => (
                <div key={inputIdx} className="space-y-2">
                  <div className="h-3.5 w-24 bg-[var(--primary-bg)]/60 rounded" />
                  <div className="h-12 w-full bg-[var(--background)] border border-[var(--border)] rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar skeleton */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-4 w-32 bg-[var(--primary-bg)] rounded" />
          <div className="h-2 w-56 bg-[var(--primary-bg)]/40 rounded" />
        </div>
        <div className="h-11 w-full sm:w-32 bg-[var(--primary-bg)] rounded-xl" />
      </div>
    </div>
  )
}
