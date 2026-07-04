'use client'

import React, { useEffect } from 'react'
import { AlertCircle, RotateCcw, LayoutGrid } from 'lucide-react'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ToolError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Tool Error Boundary Captured:', error)
  }, [error])

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-6 bg-[#0a0a0f]">
      <div className="w-full max-w-lg border border-zinc-800/80 bg-[#0c0c12] p-8 rounded-2xl shadow-2xl relative overflow-hidden text-center space-y-6">
        {/* Glow Accent */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-orange-500/5 blur-2xl pointer-events-none" />
        
        {/* Alert Icon */}
        <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mx-auto shadow-lg shadow-orange-500/5 animate-pulse">
          <AlertCircle className="w-8 h-8" />
        </div>

        {/* Header Text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">Tool Execution Error</h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-md mx-auto">
            The AI engine console encountered a crash during runtime. This could be due to an API timeout, quota exhaust, or server issue.
          </p>
        </div>

        {/* Error Details */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 font-mono text-[11px] text-zinc-500 text-left max-h-[120px] overflow-auto leading-relaxed select-text">
          <span className="text-orange-400 font-bold block mb-1">Diagnostics Message:</span>
          {error.message || 'Unknown Tool Processing Failure'}
          {error.digest && <span className="block mt-1 opacity-70">Digest: {error.digest}</span>}
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-xl text-sm transition-all duration-300 shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            Restart Interface
          </button>
          
          <Link
            href="/dashboard/marketplace"
            className="flex-1 py-3 px-4 border border-zinc-800 bg-[#0e0e15] hover:bg-[#14141f] text-zinc-300 font-semibold rounded-xl text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4" />
            Marketplace
          </Link>
        </div>
      </div>
    </div>
  )
}
