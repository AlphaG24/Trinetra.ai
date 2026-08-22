export default function TicketDetailLoading() {
  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6 text-left animate-pulse pb-12">
      {/* Back Button Skeleton */}
      <div className="h-4 w-32 bg-[var(--hover-bg)] rounded-md" />

      {/* Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        {/* Left Column (60% width) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 md:p-8 space-y-6">
            
            {/* Header Block */}
            <div className="pb-6 border-b border-[var(--border)] space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-4 w-20 bg-[var(--hover-bg)] rounded" />
                <div className="h-4 w-24 bg-[var(--hover-bg)] rounded" />
                <div className="h-4 w-16 bg-[var(--hover-bg)] rounded-full" />
              </div>
              <div className="h-7 w-3/4 bg-[var(--hover-bg)] rounded-lg" />
            </div>

            {/* Info Box */}
            <div className="h-10 w-full bg-[var(--hover-bg)] rounded-xl" />

            {/* Messages */}
            <div className="space-y-4 min-h-[250px]">
              <div className="flex gap-3 max-w-[80%] mr-auto">
                <div className="w-8 h-8 rounded-lg bg-[var(--hover-bg)] shrink-0" />
                <div className="space-y-1 flex-1">
                  <div className="h-12 w-48 bg-[var(--hover-bg)] rounded-xl" />
                  <div className="h-3 w-28 bg-[var(--hover-bg)] rounded" />
                </div>
              </div>
              <div className="flex gap-3 max-w-[80%] ml-auto flex-row-reverse">
                <div className="w-8 h-8 rounded-lg bg-[var(--hover-bg)] shrink-0" />
                <div className="space-y-1 flex-1">
                  <div className="h-12 w-36 bg-[var(--hover-bg)] rounded-xl" />
                  <div className="h-3 w-24 bg-[var(--hover-bg)] rounded" />
                </div>
              </div>
            </div>

            {/* Reply area */}
            <div className="flex gap-2 border-t border-[var(--border)] pt-5">
              <div className="h-12 flex-grow bg-[var(--hover-bg)] rounded-xl" />
              <div className="h-12 w-16 bg-[var(--hover-bg)] rounded-xl" />
            </div>

          </div>
        </div>

        {/* Right Column (40% width) */}
        <div className="lg:col-span-2">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-8 space-y-6">
            <div className="h-5 w-32 bg-[var(--hover-bg)] rounded" />
            
            <div className="space-y-8 pl-4 border-l border-[var(--border)]">
              {[1, 2, 3].map(i => (
                <div key={i} className="relative space-y-1">
                  <div className="absolute -left-[25px] top-0 w-3.5 h-3.5 rounded-full bg-[var(--hover-bg)]" />
                  <div className="h-4 w-24 bg-[var(--hover-bg)] rounded" />
                  <div className="h-3 w-32 bg-[var(--hover-bg)] rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
