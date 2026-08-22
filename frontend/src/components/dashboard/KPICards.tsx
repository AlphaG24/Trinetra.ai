'use client'

import { useState, useEffect } from 'react'
import { Activity, Bot, Target, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react'

interface StatsData {
  totalInteractions: number
  activeTools: number
  leadsGenerated: number
  conversionRate: number
}

interface KPICardsProps {
  stats: StatsData | null
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function KPICards({ stats, loading = false, error = null, onRetry }: KPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 w-full rounded-2xl bg-zinc-200/50 dark:bg-zinc-850/50 animate-pulse" />
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

  const kpis = [
    {
      label: 'Total Interactions',
      value: stats?.totalInteractions ?? 0,
      icon: Activity,
      color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20',
      desc: 'Calls + chats this month'
    },
    {
      label: 'Active Tools',
      value: stats?.activeTools ?? 0,
      icon: Bot,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
      desc: 'Live deployed agents'
    },
    {
      label: 'Leads Generated',
      value: stats?.leadsGenerated ?? 0,
      icon: Target,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      desc: 'Extracted contact details'
    },
    {
      label: 'Conversion Rate',
      value: `${stats?.conversionRate ?? 0}%`,
      icon: TrendingUp,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
      desc: 'Converted leads ratio'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon
        return (
          <div
            key={idx}
            className="flex flex-col justify-between p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl transition hover:scale-[1.01] hover:shadow-lg dark:hover:shadow-violet-500/5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{kpi.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${kpi.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black font-heading text-zinc-950 dark:text-white">
                {kpi.value}
              </span>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-450 mt-1 font-semibold">{kpi.desc}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
