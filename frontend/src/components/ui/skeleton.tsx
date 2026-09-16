import React from 'react'

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-800/40 dark:bg-zinc-800/40 border border-white/5 ${className}`}
    />
  )
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2 pb-6 border-b border-[var(--border)] animate-pulse">
      <div className="h-8 w-64 bg-zinc-800/50 rounded-xl" />
      <div className="h-4 w-96 max-w-full bg-zinc-800/30 rounded-lg" />
    </div>
  )
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] space-y-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 bg-zinc-800/50 rounded" />
            <div className="h-6 w-6 rounded-lg bg-zinc-800/40" />
          </div>
          <div className="h-7 w-28 bg-zinc-800/70 rounded-lg" />
          <div className="h-3 w-36 bg-zinc-800/30 rounded" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm animate-pulse">
      {/* Table Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--background)]/30">
        <div className="flex items-center gap-3">
          <div className="h-4 w-28 bg-zinc-800/60 rounded" />
        </div>
        <div className="h-8 w-24 bg-zinc-800/40 rounded-xl" />
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-full bg-zinc-800/60 shrink-0" />
              <div className="space-y-1.5 flex-1 max-w-[180px]">
                <div className="h-3.5 w-full bg-zinc-800/70 rounded" />
                <div className="h-2.5 w-2/3 bg-zinc-800/40 rounded" />
              </div>
            </div>
            <div className="h-3 w-20 bg-zinc-800/50 rounded hidden sm:block" />
            <div className="h-3 w-16 bg-zinc-800/50 rounded" />
            <div className="h-5 w-16 bg-zinc-800/40 rounded-full" />
            <div className="h-6 w-16 bg-zinc-800/40 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
