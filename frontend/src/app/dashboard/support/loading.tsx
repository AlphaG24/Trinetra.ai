export default function SupportLoading() {
  return (
    <div className="space-y-8 animate-pulse text-left">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div className="space-y-2">
          <div className="h-8 w-44 bg-[var(--primary-bg)] rounded-lg" />
          <div className="h-4 w-72 bg-[var(--primary-bg)]/50 rounded-lg" />
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column (Faqs and Support options) */}
        <div className="space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <div className="h-5 w-32 bg-[var(--primary-bg)] rounded pb-2 border-b border-[var(--border)]" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 w-full bg-[var(--background)] border border-[var(--border)] rounded-xl" />
            ))}
          </div>
        </div>

        {/* Right Column (Tickets List) */}
        <div className="space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
              <div className="h-5 w-36 bg-[var(--primary-bg)] rounded" />
              <div className="h-9 w-28 bg-[var(--primary-bg)] rounded-xl" />
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 w-full bg-[var(--background)] border border-[var(--border)] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
