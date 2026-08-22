'use client'

import React, { useState, useEffect } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { 
  ArrowLeft, RefreshCw, Loader2, PhoneCall, CheckCircle, 
  Smile, Target, Users, Hourglass, Calendar, ShieldAlert
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface CampaignAnalyticsData {
  campaign_id: string
  name: string
  status: string
  contact_stats: {
    total: number
    called: number
    connected: number
    dnd: number
    pending: number
  }
  call_stats: {
    total_calls: number
    avg_duration_seconds: number
    total_duration_seconds: number
    answered: number
    no_answer: number
    busy: number
    failed: number
  }
  lead_stats: {
    total_leads: number
    interest: {
      hot: number
      warm: number
      cold: number
    }
    stages: Record<string, number>
  }
  conversion_rate: number
  answer_rate: number
  hourly_volume: { hour: string; calls: number }[]
  sentiment_distribution: {
    positive: number
    neutral: number
    negative: number
  }
}

interface CampaignAnalyticsClientProps {
  campaignId: string
}

// Custom tooltips for chart components
const ChartTooltip = ({ active, payload, label, suffix = 'calls' }: any) => {
  if (!active || !payload?.length) return null
  const name = payload[0].name || label
  const value = payload[0].value
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 shadow-lg text-left">
      {label && <p className="text-zinc-500 text-[10px] font-mono mb-0.5">{label}</p>}
      <p className="text-xs font-semibold text-white font-montserrat">
        {name}: <span className="font-mono text-violet-400">{value} {suffix}</span>
      </p>
    </div>
  )
}

export function CampaignAnalyticsClient({ campaignId }: CampaignAnalyticsClientProps) {
  const [data, setData] = useState<CampaignAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const fetchAnalytics = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}/analytics`)
      const json = await res.json()
      if (res.ok) {
        setData(json.data)
      } else {
        toast.error(json.error || 'Failed to load campaign analytics')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error fetching analytics data')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchAnalytics()
  }, [campaignId])

  if (!mounted || (loading && !data)) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          <p className="text-xs text-[var(--muted)]">Gathering campaign statistics...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 max-w-xl mx-auto mt-12">
        <ShieldAlert className="w-12 h-12" />
        <h3 className="text-sm font-bold">Analytics Not Found</h3>
        <p className="text-xs text-[var(--muted)] text-center">We couldn't generate analytics for this campaign. Make sure it exists and has contacts.</p>
        <Link href="/dashboard/campaigns" className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider transition-all">
          Back to Overview
        </Link>
      </div>
    )
  }

  // Format Avg Duration
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const secs = Math.round(sec % 60)
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  // Outcome Chart Data mapping
  const outcomeData = [
    { name: 'Answered', value: data.call_stats.answered },
    { name: 'No Answer', value: data.call_stats.no_answer },
    { name: 'Busy', value: data.call_stats.busy },
    { name: 'Failed', value: data.call_stats.failed },
    { name: 'DND Skipped', value: data.contact_stats.dnd },
  ].filter(item => item.value > 0)

  const OUTCOME_COLORS = {
    'Answered': 'var(--heading)',      // Bright white/cyan accent
    'No Answer': 'var(--secondary)',   // Slate
    'Busy': 'var(--muted)',            // Muted text gray
    'Failed': '#ef4444',               // Soft Red
    'DND Skipped': '#a1a1aa',          // Gray
  }

  // Sentiment Chart Data mapping
  const sentimentData = [
    { name: 'Positive', value: data.sentiment_distribution.positive },
    { name: 'Neutral', value: data.sentiment_distribution.neutral },
    { name: 'Negative', value: data.sentiment_distribution.negative },
  ]

  const SENTIMENT_COLORS = {
    'Positive': '#10b981',             // Green
    'Neutral': 'var(--body)',          // Cyan/Indigo muted
    'Negative': '#f43f5e',             // Rose
  }

  // Lead Pipeline Stage Mapping
  const pipelineData = Object.entries(data.lead_stats.stages).map(([stage, count]) => ({
    stage: stage.charAt(0).toUpperCase() + stage.slice(1),
    count
  }))

  const PIPELINE_COLORS = [
    'var(--primary-bg)',
    'var(--secondary)',
    'var(--muted)',
    'var(--body)',
    'var(--heading)'
  ]

  const hasCallRecords = data.call_stats.total_calls > 0 || data.contact_stats.dnd > 0

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 text-[var(--body)]">
      
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/campaigns/${campaignId}`}
            className="p-2 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] text-[var(--body)] hover:text-[var(--heading)] transition-all"
            title="Back to Campaign Detail"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--heading)] font-display flex items-center gap-2">
              {data.name} — Performance Analytics
            </h1>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">Real-time statistics dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAnalytics(true)}
            className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-[var(--body)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] transition-all cursor-pointer"
            title="Refresh Analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1: Total Calls */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2 text-left">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Total Calls Placed</p>
            <PhoneCall className="w-4 h-4 text-violet-400" />
          </div>
          <p className="text-3xl font-extrabold text-[var(--heading)] font-mono">{data.call_stats.total_calls}</p>
          <p className="text-[10px] text-[var(--muted)] font-sans">Out of {data.contact_stats.total} total contacts list</p>
        </div>

        {/* Card 2: Answer Rate */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2 text-left">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Connection Ratio</p>
            <CheckCircle className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-extrabold text-blue-400 font-mono">
            {data.answer_rate}%
          </p>
          <p className="text-[10px] text-[var(--muted)] font-sans">{data.call_stats.answered} connected calls</p>
        </div>

        {/* Card 3: Avg Duration */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2 text-left">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Average Call Duration</p>
            <Hourglass className="w-4 h-4 text-violet-400" />
          </div>
          <p className="text-3xl font-extrabold text-[var(--heading)] font-mono">{formatDuration(data.call_stats.avg_duration_seconds)}</p>
          <p className="text-[10px] text-[var(--muted)] font-sans">Cumulative: {formatDuration(data.call_stats.total_duration_seconds)}</p>
        </div>

        {/* Card 4: Conversion Rate */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2 text-left">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">Leads Conversion</p>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-400 font-mono">
            {data.lead_stats.total_leads}
            <span className="text-xs text-[var(--muted)] font-sans font-bold ml-1.5">
              ({data.conversion_rate}% rate)
            </span>
          </p>
          <p className="text-[10px] text-[var(--muted)] font-sans">High-intent client leads added</p>
        </div>
      </div>

      {!hasCallRecords ? (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--hover-bg)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--muted)]">
            <Smile className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[var(--heading)]">No Analytics Data Yet</h3>
            <p className="text-xs text-[var(--muted)] max-w-md mx-auto">This campaign hasn't placed any calls yet. Start the campaign from the details screen to collect performance analytics.</p>
          </div>
          <Link
            href={`/dashboard/campaigns/${campaignId}`}
            className="inline-block px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase rounded-xl tracking-wider transition-all cursor-pointer"
          >
            Go to Campaign Detail
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Row 1: Volume Line Chart & Outcomes Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Call Volume by Hour */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between h-80 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider">
                    Call Volume Over Time
                  </h3>
                  <p className="text-[10px] text-[var(--muted)] font-sans mt-0.5">
                    Hourly outbound calling intensity chart
                  </p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex-1 min-h-[200px] w-full">
                {data.hourly_volume.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-[var(--muted)]">No hourly records logged.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.hourly_volume} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCampaignCalls" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary-bg)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="var(--primary-bg)" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="hour"
                        stroke="var(--muted)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<ChartTooltip suffix="calls" />} />
                      <Area
                        type="monotone"
                        dataKey="calls"
                        stroke="var(--heading)"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#colorCampaignCalls)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Call Outcomes Donut */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between h-80 lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider">
                    Call Outcome Share
                  </h3>
                  <p className="text-[10px] text-[var(--muted)] font-sans mt-0.5">
                    Ratios of successful and skipped contacts
                  </p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
                  <PhoneCall className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[200px]">
                <div className="relative w-36 h-36 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<ChartTooltip suffix="contacts" />} />
                      <Pie
                        data={outcomeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={62}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {outcomeData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={OUTCOME_COLORS[entry.name as keyof typeof OUTCOME_COLORS] || 'var(--secondary)'}
                            stroke="var(--card-bg)"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold font-display text-[var(--heading)]">
                      {data.contact_stats.called + data.contact_stats.dnd}
                    </span>
                    <span className="text-[8px] font-bold font-montserrat text-[var(--muted)] uppercase tracking-wider">
                      Processed
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full text-[10px]">
                  {outcomeData.map((item) => {
                    const color = OUTCOME_COLORS[item.name as keyof typeof OUTCOME_COLORS] || 'var(--secondary)'
                    return (
                      <div key={item.name} className="flex items-center gap-1.5 justify-start">
                        <span className="w-2.5 h-2.5 rounded-full border border-[var(--border)] shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-zinc-400 font-semibold truncate max-w-[80px]" title={item.name}>{item.name}</span>
                        <span className="text-[var(--heading)] font-mono font-bold ml-auto">{item.value}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* Row 2: Sentiment Distribution & Lead Pipeline Stages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Sentiment Chart */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between h-80">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider">
                    Agent Conversation Sentiment
                  </h3>
                  <p className="text-[10px] text-[var(--muted)] font-sans mt-0.5">
                    Dialogue mood breakdown from call transcript audits
                  </p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
                  <Smile className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 min-h-[200px]">
                <div className="relative w-36 h-36 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<ChartTooltip suffix="calls" />} />
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={62}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={SENTIMENT_COLORS[entry.name as keyof typeof SENTIMENT_COLORS] || 'var(--secondary)'}
                            stroke="var(--card-bg)"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold font-display text-[var(--heading)]">
                      {data.call_stats.answered}
                    </span>
                    <span className="text-[8px] font-bold font-montserrat text-[var(--muted)] uppercase tracking-wider">
                      Audited
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 w-full sm:w-auto text-xs">
                  {sentimentData.map((item) => {
                    const color = SENTIMENT_COLORS[item.name as keyof typeof SENTIMENT_COLORS] || 'var(--secondary)'
                    const pct = data.call_stats.answered > 0 ? Math.round((item.value / data.call_stats.answered) * 100) : 0
                    return (
                      <div key={item.name} className="flex items-center justify-between sm:justify-start gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full border border-[var(--border)]" style={{ backgroundColor: color }} />
                          <span className="font-semibold text-zinc-400 min-w-[70px]">
                            {item.name}
                          </span>
                        </div>
                        <span className="font-bold text-[var(--heading)] font-mono">
                          {item.value} ({pct}%)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Lead Funnel Pipeline stages */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between h-80">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold font-montserrat text-[var(--heading)] uppercase tracking-wider">
                    Leads Pipeline Stages
                  </h3>
                  <p className="text-[10px] text-[var(--muted)] font-sans mt-0.5">
                    Conversion tracking of captured prospects
                  </p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
                  <Target className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex-1 min-h-[200px] w-full">
                {pipelineData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-[var(--muted)]">No leads pipeline stages recorded.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={pipelineData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        stroke="var(--muted)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        dataKey="stage"
                        type="category"
                        stroke="var(--muted)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        width={75}
                      />
                      <Tooltip content={<ChartTooltip suffix="leads" />} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={14}>
                        {pipelineData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIPELINE_COLORS[index % PIPELINE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  )
}
