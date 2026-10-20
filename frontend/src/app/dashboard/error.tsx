'use client'

import React, { useEffect } from 'react'
import { AlertOctagon, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Dashboard Error Boundary Captured:', error)
  }, [error])

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl relative overflow-hidden text-center space-y-6">
        
        {/* Alert Icon */}
        <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-900 dark:text-zinc-100 mx-auto">
          <AlertOctagon className="w-7 h-7 text-rose-500" />
        </div>

        {/* Header Text */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Workspace Interruption</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed max-w-md mx-auto">
            An unexpected error occurred while loading this workspace view. Please reload your session.
          </p>
        </div>

        {/* Error Details */}
        <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl p-3.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 text-left max-h-[100px] overflow-auto leading-relaxed select-text">
          <span className="text-rose-500 font-bold block mb-1">Details:</span>
          {error.message || 'Unknown Exception'}
          {error.digest && <span className="block mt-1 opacity-70">Digest: {error.digest}</span>}
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reload View
          </button>
          
          <Link
            href="/dashboard"
            className="flex-1 py-2.5 px-4 border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            Overview
          </Link>
        </div>
      </div>
    </div>
  )
}
