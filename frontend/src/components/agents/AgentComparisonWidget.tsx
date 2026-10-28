'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, Phone, Activity } from 'lucide-react'

interface AgentCompareStats {
  id: string
  name: string
  status: string
  agent_type: string
  calls_today: number
  health_score: number
}

interface AgentComparisonWidgetProps {
  agents: any[]
  loading?: boolean
}

export function AgentComparisonWidget({ agents: rawAgents, loading = false }: AgentComparisonWidgetProps) {
  const [sortBy, setSortBy] = useState<'calls' | 'health'>('calls')

  if (loading) {
    return (
      <div className="h-64 rounded-2xl bg-zinc-200/50 dark:bg-zinc-850/50 animate-pulse" />
    )
  }

  // Use ONLY real data from the API — no mock fallbacks
  const processed: AgentCompareStats[] = (rawAgents || []).map((agent) => ({
    id: agent.id,
    name: (agent.agent_name || agent.name || 'AI Agent')
      .replace(/^\[[^\]]+\]\s*/, '')
      .replace(/\s*-\s*Demo\s*$/i, ' (Demo)')
      .replace(/\s*-\s*Trial\s*$/i, ' (Trial)'),
    status: agent.status || 'draft',
    agent_type: agent.agent_type || 'voice',
    calls_today: typeof agent.calls_today === 'number' ? agent.calls_today : 0,
    health_score: typeof agent.health_score === 'number' ? agent.health_score : 100,
  }))

  const sorted = [...processed].sort((a, b) => {
    if (sortBy === 'calls') return b.calls_today - a.calls_today
    return b.health_score - a.health_score
  })

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'live' || s === 'active') return 'bg-emerald-50 border-emerald-300/80 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
    if (s === 'beta') return 'bg-blue-50 border-blue-300/80 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400'
    if (s === 'in_development') return 'bg-amber-50 border-amber-300/80 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400'
    if (s === 'paused') return 'bg-zinc-100 border-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'
    return 'bg-zinc-100 border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 70) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-6 shadow-xs relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-5">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-[#3EAB93] dark:text-[#89D4C2] flex-shrink-0" />
          <div>
            <h3 className="font-bold font-montserrat text-sm md:text-base text-zinc-900 dark:text-white uppercase tracking-wider">
              Agent Performance Scorecard
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Real-time calls and health scores from your deployed agents.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/analytics"
          className="flex items-center gap-1.5 text-xs text-[#1D8A74] dark:text-[#89D4C2] font-bold uppercase tracking-wider hover:underline flex-shrink-0"
        >
          <span>Analytics</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Sort Buttons */}
      <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400 mb-4">
        <span className="mr-1">Sort By:</span>
        <button
          onClick={() => setSortBy('calls')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-montserrat font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
            sortBy === 'calls'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
          }`}
        >
          <span>Calls Today</span>
        </button>
        <button
          onClick={() => setSortBy('health')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-montserrat font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
            sortBy === 'health'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
          }`}
        >
          <span>Health Score</span>
        </button>
      </div>

      {/* Column Headers */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-800/80 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2.5">
          <span className="flex-1 min-w-0">Agent</span>
          <div className="flex items-center gap-6 flex-shrink-0">
            <span className="w-24 text-center">Calls Today</span>
            <span className="w-20 text-center">Health</span>
          </div>
        </div>
      )}

      {/* Agent Rows */}
      <div className="space-y-2.5">
        {sorted.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-8">
            No agents deployed yet. Visit the Marketplace to get started.
          </p>
        ) : (
          sorted.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-blue-500/50 hover:shadow-xs transition duration-150"
            >
              {/* Agent Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white font-montserrat truncate leading-snug">
                    {item.name}
                  </p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusStyle(item.status)}`}>
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono mt-0.5">
                  {item.agent_type}
                </p>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-6 flex-shrink-0">
                {/* Calls Today */}
                <div className="w-24 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white font-mono">
                    <Phone className="w-3.5 h-3.5 text-[#3EAB93] dark:text-[#89D4C2]" />
                    {item.calls_today}
                  </span>
                </div>

                {/* Health Score */}
                <div className="w-20 flex items-center justify-center">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-bold font-mono ${getHealthColor(item.health_score)}`}>
                    <Activity className="w-3.5 h-3.5" />
                    {item.health_score}%
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
