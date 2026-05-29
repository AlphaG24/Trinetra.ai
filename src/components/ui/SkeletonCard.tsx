export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#0f1117] border border-white/5 rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-24 h-4 rounded bg-white/5 animate-pulse" />
        <div className="w-6 h-6 rounded-md bg-white/5 animate-pulse" />
      </div>
      <div className="space-y-3">
        <div className="w-16 h-10 rounded-lg bg-white/5 animate-pulse" />
        <div className="w-32 h-4 rounded bg-white/5 animate-pulse" />
      </div>
    </div>
  )
}
