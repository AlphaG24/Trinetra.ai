export default function AgentsLoading() {
  return (
    <div className="space-y-6 animate-pulse text-left">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div className="space-y-2">
          <div className="h-8 w-52 bg-[var(--primary-bg)] rounded-lg" />
          <div className="h-4 w-80 bg-[var(--primary-bg)]/50 rounded-lg" />
        </div>
        <div className="h-10 w-44 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl" />
      </div>

      {/* Grid of Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 h-[140px] flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-32 bg-[var(--primary-bg)] rounded" />
                <div className="h-2.5 w-24 bg-[var(--primary-bg)]/40 rounded" />
              </div>
              <div className="h-5 w-16 bg-[var(--primary-bg)]/60 rounded-full" />
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 mt-4">
              <div className="h-3.5 w-20 bg-[var(--primary-bg)]/40 rounded" />
              <div className="h-4 w-4 bg-[var(--primary-bg)]/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
