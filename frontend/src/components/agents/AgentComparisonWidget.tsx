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
    if (s === 'live' || s === 'active') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
    if (s === 'beta') return 'bg-blue-500/10 border-blue-500/20 text-blue-400'
    if (s === 'in_development') return 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    if (s === 'paused') return 'bg-zinc-500/10 border-zinc-600/30 text-zinc-400'
    return 'bg-zinc-850 border-zinc-800 text-zinc-400'
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400'
    if (score >= 70) return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/5 blur-[80px] pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-5">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-violet-400 flex-shrink-0" />
          <div>
            <h3 className="font-bold font-montserrat text-sm text-[var(--heading)] uppercase tracking-wider">
              Agent Performance Scorecard
            </h3>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">
              Real-time calls and health scores from your deployed agents.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/analytics"
          className="flex items-center gap-1 text-[10px] text-violet-400 font-bold uppercase tracking-wider hover:underline flex-shrink-0"
        >
          <span>Analytics</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Sort Buttons */}
      <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider uppercase text-[var(--muted)] mb-5">
        <span className="mr-1">Sort By:</span>
        <button
          onClick={() => setSortBy('calls')}
          className={`px-3 py-1 rounded-md transition-all ${sortBy === 'calls' ? 'bg-violet-600 text-white' : 'hover:text-[var(--heading)] bg-[var(--background)]/40 border border-[var(--border)]'}`}
        >
          Calls Today
        </button>
        <button
          onClick={() => setSortBy('health')}
          className={`px-3 py-1 rounded-md transition-all ${sortBy === 'health' ? 'bg-violet-600 text-white' : 'hover:text-[var(--heading)] bg-[var(--background)]/40 border border-[var(--border)]'}`}
        >
          Health Score
        </button>
      </div>

      {/* Column Headers */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-[1fr_110px_110px] gap-4 px-4 mb-2">
          <span className="text-[9px] text-[var(--muted)] font-semibold uppercase tracking-wider">Agent</span>
          <span className="text-[9px] text-[var(--muted)] font-semibold uppercase tracking-wider text-center">Calls Today</span>
          <span className="text-[9px] text-[var(--muted)] font-semibold uppercase tracking-wider text-center">Health</span>
        </div>
      )}

      {/* Agent Rows */}
      <div className="space-y-2">
        {sorted.length === 0 ? (
          <p className="text-xs text-[var(--muted)] text-center py-8">
            No agents deployed yet. Visit the Marketplace to get started.
          </p>
        ) : (
          sorted.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_110px_110px] gap-4 items-center px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--background)]/30 hover:bg-[var(--background)]/60 transition duration-150"
            >
              {/* Agent Identity */}
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--heading)] font-montserrat truncate leading-tight">
                  {item.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-[var(--muted)] uppercase tracking-wider font-mono">
                    {item.agent_type}
                  </span>
                  <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${getStatusStyle(item.status)}`}>
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Calls Today */}
              <div className="flex items-center justify-center">
                <span className="flex items-center gap-1 text-sm font-extrabold text-[var(--heading)] font-mono">
                  <Phone className="w-3 h-3 text-violet-400" />
                  {item.calls_today}
                </span>
              </div>

              {/* Health Score */}
              <div className="flex items-center justify-center">
                <span className={`flex items-center gap-1 text-sm font-extrabold font-mono ${getHealthColor(item.health_score)}`}>
                  <Activity className="w-3 h-3" />
                  {item.health_score}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

