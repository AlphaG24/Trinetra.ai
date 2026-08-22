export default function LeadsLoading() {
  return (
    <div className="space-y-6 animate-pulse text-left">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div className="space-y-2">
          <div className="h-8 w-36 bg-[var(--primary-bg)] rounded-lg" />
          <div className="h-4 w-60 bg-[var(--primary-bg)]/50 rounded-lg" />
        </div>
        <div className="h-10 w-28 bg-[var(--primary-bg)] rounded-xl" />
      </div>

      {/* Table Skeleton */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center pb-2">
          <div className="h-4 w-32 bg-[var(--primary-bg)] rounded" />
          <div className="h-9 w-40 bg-[var(--background)] border border-[var(--border)] rounded-xl" />
        </div>
        
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="h-10 bg-[var(--background)] border-b border-[var(--border)]" />
          <div className="divide-y divide-[var(--border)]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-transparent" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
