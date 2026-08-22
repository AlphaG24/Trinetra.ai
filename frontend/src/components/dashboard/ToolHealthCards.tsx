'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, AlertCircle, RefreshCw, Activity, CheckCircle, ShieldAlert } from 'lucide-react'

interface ToolItem {
  id: string
  name: string
  agent_type: string
  status: string
  calls_today: number
  last_active_at: string
  health_score: number
}

function formatDate(dateString: string) {
  try {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateString
  }
}

interface ToolHealthCardsProps {
  tools: ToolItem[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function ToolHealthCards({ tools, loading = false, error = null, onRetry }: ToolHealthCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 w-full rounded-2xl bg-zinc-200/50 dark:bg-zinc-850/50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 text-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-550/15 hover:bg-red-550/20 transition cursor-pointer font-bold uppercase tracking-wider"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        )}
      </div>
    )
  }

  if (tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
          <Activity className="w-6 h-6 animate-pulse text-violet-500" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No agents deployed yet</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">Browse the marketplace and configure your first cognitive agent to start automation.</p>
        </div>
        <Link 
          href="/dashboard/marketplace"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase tracking-wider transition shadow-md shadow-violet-500/10"
        >
          <span>Browse Marketplace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    )
  }

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'live' || s === 'active') return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
    if (s === 'beta') return 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400'
    if (s === 'in_development') return 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
    if (s === 'paused') return 'bg-red-500/15 border-red-500/30 text-red-650 dark:text-red-400'
    return 'bg-zinc-100 border-zinc-205 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tools.map((tool, idx) => (
        <div
          key={tool.id}
          data-tour={idx === 0 ? 'agent-card' : undefined}
          className="flex flex-col justify-between p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:scale-[1.01] hover:shadow-lg dark:hover:shadow-violet-500/5 transition duration-200"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1 min-w-0">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate font-display">
                {tool.name
                  .replace(/^\[[^\]]+\]\s*/, '')
                  .replace(/\s*-\s*Demo\s*$/i, ' (Demo)')
                  .replace(/\s*-\s*Trial\s*$/i, ' (Trial)')}
              </h4>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono font-medium uppercase tracking-wider">{tool.agent_type} agent</span>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusStyle(tool.status)}`}>
              {tool.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[10px]">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400 block font-semibold">Calls Today</span>
              <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 font-mono mt-0.5 block">{tool.calls_today}</span>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400 block font-semibold">Health Score</span>
              <span className={`text-xs font-black font-mono mt-0.5 block flex items-center gap-1 ${
                tool.health_score >= 90 ? 'text-emerald-600' : tool.health_score >= 70 ? 'text-amber-600' : 'text-red-650'
              }`}>
                {tool.health_score >= 90 ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                )}
                {tool.health_score}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium">Last Active: {formatDate(tool.last_active_at)}</span>
            <Link
              href={`/dashboard/agents/${tool.id}`}
              className="flex items-center gap-0.5 text-[10px] text-violet-600 dark:text-violet-400 font-extrabold uppercase tracking-wider hover:underline"
            >
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
