'use client'

import { useState, useMemo } from 'react'
import { 
  BarChart3, 
  ArrowLeft, 
  PhoneCall, 
  Clock, 
  Smile, 
  Activity,
  FileDown
} from 'lucide-react'
import Link from 'next/link'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from 'recharts'

interface VoiceCall {
  id: string
  created_at: string
  duration_seconds: number | null
  status: string | null
  sentiment: string | null
}

interface Lead {
  id: string
  created_at: string
  interest_level: string | null
  lead_score: number | null
}

interface GlobalAnalyticsProps {
  voiceCalls: VoiceCall[]
  leads: Lead[]
}

const COLORS = ['#8b5cf6', '#a78bfa', '#c084fc', '#e9d5ff', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export default function GlobalAnalyticsClient({ voiceCalls, leads }: GlobalAnalyticsProps) {
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all')

  // Filter Data by Date Range
  const filteredData = useMemo(() => {
    const now = new Date()
    let cutoff = new Date(0) // Default all time

    if (dateRange === '7d') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    else if (dateRange === '30d') cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    else if (dateRange === '90d') cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    const calls = voiceCalls.filter(c => new Date(c.created_at) >= cutoff)
    const filteredLeads = leads.filter(l => new Date(l.created_at) >= cutoff)

    return { calls, leads: filteredLeads }
  }, [voiceCalls, leads, dateRange])

  // Aggregate stats
  const stats = useMemo(() => {
    const totalCalls = filteredData.calls.length
    const totalSeconds = filteredData.calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0)
    const avgDuration = totalCalls > 0 ? Math.round(totalSeconds / totalCalls) : 0
    const totalMinutes = Math.round(totalSeconds / 60)
    
    // Average lead score
    const scoredLeads = filteredData.leads.filter(l => l.lead_score !== null)
    const avgLeadScore = scoredLeads.length > 0 
      ? Math.round(scoredLeads.reduce((sum, l) => sum + (l.lead_score || 0), 0) / scoredLeads.length)
      : 0

    return {
      totalCalls,
      totalMinutes,
      avgDuration,
      avgLeadScore,
      totalLeads: filteredData.leads.length
    }
  }, [filteredData])

  // Chart Data: Calls over time (grouped by day/week)
  const timelineChartData = useMemo(() => {
    const dailyMap: Record<string, { date: string; calls: number; minutes: number }> = {}
    
    filteredData.calls.forEach(c => {
      const d = new Date(c.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
      const secs = c.duration_seconds || 0
      
      if (!dailyMap[d]) {
        dailyMap[d] = { date: d, calls: 0, minutes: 0 }
      }
      dailyMap[d].calls += 1
      dailyMap[d].minutes += Math.round(secs / 60)
    })

    return Object.values(dailyMap)
  }, [filteredData])

  // Chart Data: Sentiment Distribution
  const sentimentChartData = useMemo(() => {
    const counts: Record<string, number> = { Positive: 0, Neutral: 0, Negative: 0, Unclassified: 0 }
    
    filteredData.calls.forEach(c => {
      const s = c.sentiment || 'unclassified'
      const formatted = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
      if (formatted in counts) counts[formatted] += 1
      else counts['Unclassified'] += 1
    })

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
  }, [filteredData])

  // Chart Data: Lead Interest Level
  const leadInterestChartData = useMemo(() => {
    const counts: Record<string, number> = { New: 0, Contacted: 0, Qualified: 0, Hot: 0, Converted: 0, Lost: 0 }
    
    filteredData.leads.forEach(l => {
      const stage = l.interest_level || 'New'
      const formatted = stage.charAt(0).toUpperCase() + stage.slice(1).toLowerCase()
      if (formatted in counts) counts[formatted] += 1
    })

    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredData])

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = ['Call ID', 'Created At', 'Duration (sec)', 'Connection Status', 'Sentiment']
    const rows = filteredData.calls.map(c => [
      c.id,
      c.created_at,
      c.duration_seconds || 0,
      c.status || 'unknown',
      c.sentiment || 'unclassified'
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `trinetra_global_call_telemetry_${dateRange}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-300 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2 font-display">
            <BarChart3 className="w-8 h-8 text-violet-500" /> Global Analytics
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Real-time visual telemetry, call traffic peaks, and prospect metrics across all enterprise organizations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e: any) => setDateRange(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="90d">Last 90 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="7d">Last 7 Days</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileDown className="w-4 h-4" /> Export CSV
          </button>

          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 hover:bg-zinc-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Calls</span>
            <PhoneCall className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalCalls}</div>
          <p className="text-[11px] text-zinc-500">Call sessions logged</p>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Minutes</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalMinutes} min</div>
          <p className="text-[11px] text-zinc-500">Audio streaming duration</p>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Call Duration</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.avgDuration} sec</div>
          <p className="text-[11px] text-zinc-500">Average call length</p>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Prospects Recruited</span>
            <Smile className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalLeads}</div>
          <p className="text-[11px] text-zinc-500">Avg Lead Score: {stats.avgLeadScore}/100</p>
        </div>
      </div>

      {/* Recharts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Traffic Chart */}
        <div className="lg:col-span-2 bg-[#0f111a]/60 border border-white/5 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Traffic & Call Volume Trends</h3>
          <div className="h-72 w-full">
            {timelineChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-xs">No chart data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineChartData}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="calls" name="Calls" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCalls)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Sentiment Distribution Pie Chart */}
        <div className="bg-[#0f111a]/60 border border-white/5 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Outbound Sentiment Analytics</h3>
          <div className="h-48 w-full flex items-center justify-center">
            {sentimentChartData.length === 0 ? (
              <div className="text-zinc-500 text-xs">No sentiment logs found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sentimentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
            {sentimentChartData.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span>{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Stages Bar Chart */}
        <div className="lg:col-span-3 bg-[#0f111a]/60 border border-white/5 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Prospect Conversion Funnel</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadInterestChartData}>
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '11px' }} />
                <Bar dataKey="value" name="Leads count" radius={[6, 6, 0, 0]}>
                  {leadInterestChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
