export default function AgentDemoLoading() {
  return (
    <div className="space-y-6 animate-pulse text-left">
      {/* Header Skeleton */}
      <div className="space-y-2 pb-6 border-b border-[var(--border)]">
        <div className="h-4 w-28 bg-[var(--primary-bg)]/40 rounded" />
        <div className="h-8 w-44 bg-[var(--primary-bg)] rounded-lg" />
      </div>

      {/* Main Sandbox Call Center */}
      <div className="max-w-xl mx-auto bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 md:p-8 space-y-6 shadow-md min-h-[400px] flex flex-col justify-between">
        {/* Status */}
        <div className="flex flex-col items-center text-center space-y-3 pt-6">
          <div className="w-16 h-16 rounded-full bg-[var(--primary-bg)] flex items-center justify-center" />
          <div className="h-4.5 w-32 bg-[var(--primary-bg)] rounded" />
          <div className="h-3 w-40 bg-[var(--primary-bg)]/40 rounded" />
        </div>

        {/* Action Button */}
        <div className="flex justify-center pb-6">
          <div className="w-20 h-20 rounded-full bg-[var(--primary-bg)] border-4 border-[var(--border)] shadow-lg" />
        </div>

        {/* Live Logs Mockup */}
        <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 min-h-[120px] space-y-2.5">
          <div className="h-3 w-16 bg-[var(--primary-bg)]/60 rounded" />
          <div className="space-y-1.5 pt-1">
            <div className="h-2.5 w-5/6 bg-[var(--primary-bg)]/40 rounded" />
            <div className="h-2.5 w-4/5 bg-[var(--primary-bg)]/40 rounded" />
            <div className="h-2.5 w-2/3 bg-[var(--primary-bg)]/30 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
