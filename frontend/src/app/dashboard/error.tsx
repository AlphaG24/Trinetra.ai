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
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-6 bg-[#0a0a0f]">
      <div className="w-full max-w-lg border border-zinc-800/80 bg-[#0c0c12] p-8 rounded-2xl shadow-2xl relative overflow-hidden text-center space-y-6">
        {/* Glow Accent */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-red-500/5 blur-2xl pointer-events-none" />
        
        {/* Alert Icon */}
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto shadow-lg shadow-red-500/5 animate-pulse">
          <AlertOctagon className="w-8 h-8" />
        </div>

        {/* Header Text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">System Interruption</h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-md mx-auto">
            An unexpected error occurred while loading your workspace dashboard. Please try reloading the dashboard session.
          </p>
        </div>

        {/* Error Details */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 font-mono text-[11px] text-zinc-500 text-left max-h-[120px] overflow-auto leading-relaxed select-text">
          <span className="text-red-400 font-bold block mb-1">Error Details:</span>
          {error.message || 'Unknown Workspace Exception'}
          {error.digest && <span className="block mt-1 opacity-70">Digest: {error.digest}</span>}
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-xl text-sm transition-all duration-300 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
          
          <Link
            href="/dashboard"
            className="flex-1 py-3 px-4 border border-zinc-800 bg-[#0e0e15] hover:bg-[#14141f] text-zinc-300 font-semibold rounded-xl text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Back Home
          </Link>
        </div>
      </div>
    </div>
  )
}
