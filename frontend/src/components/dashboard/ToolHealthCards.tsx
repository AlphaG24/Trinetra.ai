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
          <Activity className="w-6 h-6 animate-pulse text-zinc-400" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No agents deployed yet</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">Browse the marketplace and configure your first cognitive agent to start automation.</p>
        </div>
        <Link 
          href="/dashboard/marketplace"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-[0.98]"
        >
          <span>Browse Marketplace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    )
  }

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'live' || s === 'active') return 'bg-teal-50 dark:bg-teal-950/40 border-teal-200/60 dark:border-teal-800/60 text-teal-700 dark:text-teal-400'
    if (s === 'beta') return 'bg-blue-50 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-800/60 text-blue-700 dark:text-blue-400'
    if (s === 'in_development') return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-400'
    if (s === 'paused') return 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500'
    return 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500'
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tools.map((tool, idx) => (
        <div
          key={tool.id}
          className="flex flex-col justify-between p-5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl hover:border-teal-400/40 dark:hover:border-teal-500/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 shadow-xs"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1 min-w-0 pr-2">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate font-display">
                {tool.name
                  .replace(/^\[[^\]]+\]\s*/, '')
                  .replace(/\s*-\s*Demo\s*$/i, ' (Demo)')
                  .replace(/\s*-\s*Trial\s*$/i, ' (Trial)')}
              </h4>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-medium uppercase tracking-wider">{tool.agent_type} agent</span>
            </div>
            <span className={`text-[9px] font-mono font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusStyle(tool.status)}`}>
              {tool.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[10px]">
            <div>
              <span className="text-zinc-400 dark:text-zinc-500 block font-medium">Calls Today</span>
              <span className="text-xs font-bold text-zinc-900 dark:text-white font-mono tabular-nums mt-0.5 block">{tool.calls_today}</span>
            </div>
            <div>
              <span className="text-zinc-400 dark:text-zinc-500 block font-medium">Health Score</span>
              <span className={`text-xs font-bold font-mono tabular-nums mt-0.5 block flex items-center gap-1 ${
                tool.health_score >= 90 ? 'text-teal-600 dark:text-teal-400' : tool.health_score >= 70 ? 'text-amber-500' : 'text-red-500'
              }`}>
                {tool.health_score >= 90 ? (
                  <CheckCircle className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                )}
                {tool.health_score}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium font-mono">Active: {formatDate(tool.last_active_at)}</span>
            <Link
              href={`/dashboard/agents/${tool.id}`}
              className="flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-300 hover:text-teal-600 dark:hover:text-teal-400 font-medium tracking-wide transition cursor-pointer"
            >
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
