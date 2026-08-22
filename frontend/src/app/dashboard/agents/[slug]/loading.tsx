export default function AgentDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse p-4 md:p-6 text-left">
      {/* Back button link skeleton */}
      <div className="h-4 w-32 bg-[var(--hover-bg)] rounded mb-4" />

      {/* Top Bar Skeleton */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--background)] border border-[var(--border)]" />
          <div className="space-y-2">
            <div className="h-5 w-40 bg-[var(--hover-bg)] rounded" />
            <div className="h-3.5 w-24 bg-[var(--hover-bg)] rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-6 w-16 bg-[var(--hover-bg)] rounded-lg" />
          <div className="h-6 w-20 bg-[var(--hover-bg)] rounded-lg" />
          <div className="h-6 w-24 bg-[var(--hover-bg)] rounded-lg" />
        </div>
      </div>

      {/* Tab Bar Skeleton */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] p-1 rounded-xl flex gap-1 overflow-x-auto">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-9 w-24 bg-[var(--hover-bg)] rounded-lg shrink-0" />
        ))}
      </div>

      {/* Body Skeleton */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 md:p-8 min-h-[400px] space-y-6">
        <div className="h-6 w-48 bg-[var(--hover-bg)] rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-[var(--background)] border border-[var(--border)] rounded-xl" />
          ))}
        </div>
        <div className="h-48 bg-[var(--background)] border border-[var(--border)] rounded-xl" />
      </div>
    </div>
  )
}
