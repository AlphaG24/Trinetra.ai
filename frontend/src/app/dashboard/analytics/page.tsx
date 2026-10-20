'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  RefreshCw,
  BarChart3,
  IndianRupee,
  PhoneCall
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { cleanAgentName } from '@/src/utils/formatAgentName'

// Analytics Components
import { DateRangeFilter } from '@/src/components/analytics/DateRangeFilter'
import { KPICards } from '@/src/components/analytics/KPICards'
import { CallVolumeChart } from '@/src/components/analytics/CallVolumeChart'
import { SentimentChart } from '@/src/components/analytics/SentimentChart'
import { LeadFunnelChart } from '@/src/components/analytics/LeadFunnelChart'
import { CallsByAgentChart } from '@/src/components/analytics/CallsByAgentChart'

// Revenue Component
import { RevenueDashboardClient } from '@/src/components/dashboard/revenue/RevenueDashboardClient'

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

const EMPTY_ANALYTICS_DATA: AnalyticsData = {
  kpis: {
    totalCalls: 0,
    totalMinutes: 0,
    avgDuration: 0,
    leadsGenerated: 0,
  },
  callVolume: [],
  sentiment: [],
  leadFunnel: [],
  callsByAgent: [],
  recentCalls: [],
}

function AnalyticsDashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const initialTab = searchParams.get('tab') === 'revenue' ? 'revenue' : 'performance'
  const [activeTab, setActiveTab] = useState<'performance' | 'revenue'>(initialTab)

  // Sync tab with URL if search param changes
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'revenue') {
      setActiveTab('revenue')
    } else if (tabParam === 'performance') {
      setActiveTab('performance')
    }
  }, [searchParams])

  const handleTabChange = (newTab: 'performance' | 'revenue') => {
    setActiveTab(newTab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', newTab)
    router.replace(`/dashboard/analytics?${params.toString()}`, { scroll: false })
  }

  const [range, setRange] = useState<number>(30)
  const [agentId, setAgentId] = useState<string>('all')
  const [agents, setAgents] = useState<AgentOption[]>([])
  
  // Real-time data state: starts as null with loading=true to prevent initial mock flash
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
          .select('id, name')
          .eq('user_id', user.id)
          .order('name', { ascending: true })

        if (userAgents && userAgents.length > 0) {
          setAgents(userAgents.map((a: any) => ({ id: a.id, agent_name: cleanAgentName(a.name) })))
        }
      } catch (err) {
        console.error('Failed to load agents list:', err)
      }
    }
    loadAgents()
  }, [])

  // 2. Fetch real analytics telemetry
  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/dashboard/analytics?range=${range}&agent_id=${agentId}`)
      if (res.ok) {
        const text = await res.text()
        const json = text && text.trim() ? JSON.parse(text) : null
        if (json && json.kpis) {
          setData(json)
          return
        }
      }
      setData(EMPTY_ANALYTICS_DATA)
    } catch (err: any) {
      console.error('Failed to load analytics telemetry:', err)
      setError(err?.message || 'Failed to load telemetry')
      setData(EMPTY_ANALYTICS_DATA)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'performance') {
      fetchAnalytics()
    }
  }, [range, agentId, activeTab])

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

  const activeData = data || EMPTY_ANALYTICS_DATA

  return (
    <div className="space-y-6 text-left">
      {/* Header and Sub-Page Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--heading)] tracking-tight leading-tight">
            Analytics
          </h1>
          <p className="text-xs text-[var(--muted)] leading-relaxed mt-0.5">
            Monitor real-time call activity, agent performance, and live revenue attribution
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm self-start md:self-auto">
          <button
            type="button"
            onClick={() => handleTabChange('performance')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'performance'
                ? 'bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-900'
                : 'text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Overview &amp; Calls</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleTabChange('revenue')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'revenue'
                ? 'bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-900'
                : 'text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
            }`}
          >
            <IndianRupee className="w-4 h-4" />
            <span>Revenue &amp; ROI</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PERFORMANCE & CALL OVERVIEW */}
      {activeTab === 'performance' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Date and Agent Filter */}
          <DateRangeFilter
            range={range}
            onRangeChange={setRange}
            agentId={agentId}
            onAgentIdChange={setAgentId}
            agents={agents}
          />

          {/* Loading Skeleton: prevents fake data flash on first mount */}
          {loading && (
            <div className="space-y-8 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 h-28 animate-pulse" />
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl h-80 animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && renderSectionError('Dashboard Metrics', fetchAnalytics)}

          {/* Render Real-Time Data Components */}
          {!loading && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* KPIs (computed dynamically from live database) */}
              <KPICards
                totalCalls={activeData.kpis.totalCalls}
                totalMinutes={activeData.kpis.totalMinutes}
                avgDuration={activeData.kpis.avgDuration}
                leadsGenerated={activeData.kpis.leadsGenerated}
              />

              {activeData.kpis.totalCalls === 0 ? (
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <PhoneCall className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--heading)] font-montserrat uppercase tracking-wider">
                    No Call Telemetry Recorded Yet
                  </h3>
                  <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
                    As your AI agents connect with callers or test voice calls are initiated, real-time volume, duration, sentiment, and conversion telemetry will automatically plot here.
                  </p>
                </div>
              ) : (
                <>
                  {/* Row 1: Volume & Sentiment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CallVolumeChart data={activeData.callVolume} />
                    <SentimentChart data={activeData.sentiment} />
                  </div>

                  {/* Row 2: Funnel & Agent distribution */}
                  <div className={activeData.callsByAgent.length > 1 ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "grid grid-cols-1 gap-6"}>
                    <LeadFunnelChart data={activeData.leadFunnel} />
                    {activeData.callsByAgent.length > 1 && <CallsByAgentChart data={activeData.callsByAgent} />}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REVENUE FROM VAAKRITI & ROI */}
      {activeTab === 'revenue' && (
        <div className="animate-in fade-in duration-200">
          <RevenueDashboardClient embedded={true} />
        </div>
      )}
    </div>
  )
}

export default function AnalyticsDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--muted)]">Loading analytics...</div>}>
      <AnalyticsDashboardContent />
    </Suspense>
  )
}
