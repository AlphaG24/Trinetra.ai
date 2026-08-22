export default function BillingLoading() {
  return (
    <div className="space-y-8 animate-pulse text-left">
      {/* Header Skeleton */}
      <div className="space-y-2 pb-6 border-b border-[var(--border)]">
        <div className="h-8 w-40 bg-[var(--primary-bg)] rounded-lg" />
        <div className="h-4 w-60 bg-[var(--primary-bg)]/50 rounded-lg" />
      </div>

      {/* Subscription Status Card */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 h-36 flex flex-col justify-between" >
        <div className="flex justify-between items-center">
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-32 bg-[var(--primary-bg)] rounded" />
            <div className="h-2.5 w-40 bg-[var(--primary-bg)]/40 rounded" />
          </div>
          <div className="h-10 w-28 bg-[var(--primary-bg)] rounded-xl" />
        </div>
        <div className="w-full bg-[var(--background)] h-3 rounded-full overflow-hidden" />
      </div>

      {/* 3 Tier Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 h-[400px] flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="space-y-1.5 pb-3 border-b border-[var(--border)]">
                <div className="h-5 w-20 bg-[var(--primary-bg)] rounded" />
                <div className="h-4 w-28 bg-[var(--primary-bg)]/60 rounded" />
              </div>
              
              <div className="h-8 w-32 bg-[var(--primary-bg)] rounded" />

              <div className="space-y-2.5 pt-2">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[var(--primary-bg)] rounded-full shrink-0" />
                    <div className="h-3 w-5/6 bg-[var(--primary-bg)]/40 rounded" />
                  </div>
                ))}
              </div>
            </div>

            <div className="h-11 w-full bg-[var(--primary-bg)] rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
