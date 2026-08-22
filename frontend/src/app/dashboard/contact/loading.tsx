export default function ContactLoading() {
  return (
    <div className="space-y-6 animate-pulse text-left pb-12">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-72 bg-[var(--hover-bg)] rounded-lg" />
        <div className="h-4 w-96 bg-[var(--hover-bg)] rounded-md" />
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Left: Form Card Skeleton */}
        <div className="lg:col-span-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-8 space-y-5">
          {/* Agent Selection */}
          <div className="space-y-1.5">
            <div className="h-4 w-28 bg-[var(--hover-bg)] rounded" />
            <div className="h-11 w-full bg-[var(--hover-bg)] rounded-xl" />
          </div>
          {/* Scale */}
          <div className="space-y-1.5">
            <div className="h-4 w-52 bg-[var(--hover-bg)] rounded" />
            <div className="h-11 w-full bg-[var(--hover-bg)] rounded-xl" />
          </div>
          {/* Stack */}
          <div className="space-y-1.5">
            <div className="h-4 w-44 bg-[var(--hover-bg)] rounded" />
            <div className="h-11 w-full bg-[var(--hover-bg)] rounded-xl" />
          </div>
          {/* Requirements */}
          <div className="space-y-1.5">
            <div className="h-4 w-60 bg-[var(--hover-bg)] rounded" />
            <div className="h-28 w-full bg-[var(--hover-bg)] rounded-xl" />
          </div>
          {/* Divider */}
          <div className="border-t border-[var(--border)]" />
          {/* Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="h-4 w-20 bg-[var(--hover-bg)] rounded" />
              <div className="h-11 w-full bg-[var(--hover-bg)] rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <div className="h-4 w-16 bg-[var(--hover-bg)] rounded" />
              <div className="h-11 w-full bg-[var(--hover-bg)] rounded-xl" />
            </div>
          </div>
          {/* Phone + Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="h-4 w-16 bg-[var(--hover-bg)] rounded" />
              <div className="h-11 w-full bg-[var(--hover-bg)] rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <div className="h-4 w-20 bg-[var(--hover-bg)] rounded" />
              <div className="h-11 w-full bg-[var(--hover-bg)] rounded-xl" />
            </div>
          </div>
          {/* Submit button */}
          <div className="h-11 w-44 bg-[var(--hover-bg)] rounded-xl" />
        </div>

        {/* Right: Info Cards Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          {/* Schedule Card */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--hover-bg)] rounded-xl" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-28 bg-[var(--hover-bg)] rounded" />
                <div className="h-3 w-40 bg-[var(--hover-bg)] rounded" />
              </div>
            </div>
            <div className="h-4 w-full bg-[var(--hover-bg)] rounded" />
            <div className="h-4 w-3/4 bg-[var(--hover-bg)] rounded" />
            <div className="h-11 w-full bg-[var(--hover-bg)] rounded-xl mt-2" />
          </div>

          {/* What happens next */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-8 space-y-4">
            <div className="h-5 w-44 bg-[var(--hover-bg)] rounded" />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[var(--hover-bg)] rounded-lg shrink-0" />
                <div className="h-4 flex-1 bg-[var(--hover-bg)] rounded" />
              </div>
            ))}
          </div>

          {/* Quick help */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-[var(--hover-bg)] rounded" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-28 bg-[var(--hover-bg)] rounded" />
                <div className="h-3 w-48 bg-[var(--hover-bg)] rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
