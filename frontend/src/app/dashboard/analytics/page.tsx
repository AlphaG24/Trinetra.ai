'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, BarChart3, Bot } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

// Components
import { DateRangeFilter } from '@/src/components/analytics/DateRangeFilter'
import { KPICards } from '@/src/components/analytics/KPICards'
import { CallVolumeChart } from '@/src/components/analytics/CallVolumeChart'
import { SentimentChart } from '@/src/components/analytics/SentimentChart'
import { LeadFunnelChart } from '@/src/components/analytics/LeadFunnelChart'
import { CallsByAgentChart } from '@/src/components/analytics/CallsByAgentChart'
import { RecentCallsTable } from '@/src/components/analytics/RecentCallsTable'

interface AgentOption {
  id: string
  agent_name: string
}

interface AnalyticsData {
  kpis: {
    totalCalls: number
    totalMinutes: number
    avgDuration: number
    leadsGenerated: number
  }
  callVolume: Array<{ date: string; count: number }>
  sentiment: Array<{ name: string; value: number }>
  leadFunnel: Array<{ stage: string; count: number }>
  callsByAgent: Array<{ agentName: string; count: number }>
  recentCalls: any[]
}

export default function AnalyticsDashboardPage() {
  const [range, setRange] = useState<number>(30)
  const [agentId, setAgentId] = useState<string>('all')
  const [agents, setAgents] = useState<AgentOption[]>([])
  
  // States for data fetching
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // 1. Fetch user agents on mount
  useEffect(() => {
    async function loadAgents() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userAgents } = await supabase
          .from('agents')
          .select('id, agent_name')
          .eq('user_id', user.id)
          .order('agent_name', { ascending: true })

        setAgents(userAgents || [])
      } catch (err) {
        console.error('Failed to load agents list:', err)
      }
    }
    loadAgents()
  }, [])

  // 2. Fetch analytics data whenever range or agent selection changes
  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/dashboard/analytics?range=${range}&agent_id=${agentId}`)
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      console.error('Failed to fetch analytics payload:', err)
      setError(err?.message || 'Failed to retrieve analytics metrics.')
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    fetchAnalytics()
  }, [range, agentId])

  // Section level error UI helper
  const renderSectionError = (sectionName: string, retryFn: () => void) => (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-sm w-full min-h-[240px]">
      <div className="w-12 h-12 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-red-500 shadow-inner">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-[var(--heading)] font-montserrat uppercase tracking-wider">
          Failed to load {sectionName}
        </h3>
        <p className="text-xs text-[var(--muted)] font-merriweather max-w-xs mx-auto">
          An error occurred while loading this section&apos;s data telemetry.
        </p>
      </div>
      <button
        onClick={retryFn}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Retry Section
      </button>
    </div>
  )

  // Empty state when there are 0 calls
  const showEmptyState = data && data.kpis.totalCalls === 0 && !loading && !error

  return (
    <div className="space-y-8 text-left">
      {/* Header and Filter Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border)]">
        <div>
          <h1 className="text-3xl font-bold font-display text-[var(--heading)] tracking-tight leading-tight">
            Analytics
          </h1>
          <p className="text-xs text-[var(--body)] font-merriweather leading-relaxed mt-1">
            Track performance across all your AI tools
          </p>
        </div>
      </div>

      {/* Date and Agent Filter */}
      <DateRangeFilter
        range={range}
        onRangeChange={setRange}
        agentId={agentId}
        onAgentIdChange={setAgentId}
        agents={agents}
      />

      {/* Loading State */}
      {loading && (
        <div className="space-y-8">
          {/* KPI Loader */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 h-28 animate-pulse" />
            ))}
          </div>
          {/* Charts Loader */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && renderSectionError('Dashboard Metrics', fetchAnalytics)}

      {/* Empty State */}
      {showEmptyState && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border border-dashed border-[var(--border)] rounded-2xl bg-[var(--card-bg)] max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] shadow-inner">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold font-display text-[var(--heading)]">No analytics data yet</h2>
            <p className="text-xs text-[var(--body)] font-merriweather max-w-xs mx-auto">
              Start provisioning agents and making calls to see live telemetry and charts.
            </p>
          </div>
          <a
            href="/dashboard/marketplace"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Bot className="w-4 h-4" /> Browse Marketplace
          </a>
        </div>
      )}

      {/* Render Data Components */}
      {!loading && !error && data && !showEmptyState && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* KPIs */}
          <KPICards
            totalCalls={data.kpis.totalCalls}
            totalMinutes={data.kpis.totalMinutes}
            avgDuration={data.kpis.avgDuration}
            leadsGenerated={data.kpis.leadsGenerated}
          />

          {/* Row 1: Volume & Sentiment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CallVolumeChart data={data.callVolume} />
            <SentimentChart data={data.sentiment} />
          </div>

          {/* Row 2: Funnel & Agent distribution */}
          <div className={data.callsByAgent.length > 1 ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "grid grid-cols-1 gap-6"}>
            <LeadFunnelChart data={data.leadFunnel} />
            {data.callsByAgent.length > 1 && <CallsByAgentChart data={data.callsByAgent} />}
          </div>

          {/* Recent Activity Table */}
          <RecentCallsTable calls={data.recentCalls} />
        </div>
      )}
    </div>
  )
}
