'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Database,
  Calendar,
  Layers,
  ChevronDown,
  Sparkles,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface PlatformService {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  icon_url: string | null
  subdomain_url: string | null
  ui_config: any
  created_at: string
  is_active: boolean
  is_visible_in_marketplace: boolean
  is_demo_allowed: boolean
  demo_limit_config: any
  marketplace_metadata: {
    tagline?: string
    features?: string[]
    pricing_tiers?: any[]
    video_demo_url?: string
    analytics_chart_config?: {
      chart_type: 'line' | 'bar'
      metric_key: string
      label: string
    }
  } | null
}

interface AnalyticsLog {
  id: string
  service_slug: string
  user_id: string
  status: 'success' | 'failure'
  event_data: Record<string, any>
  created_at: string
}

interface AnalyticsPageClientProps {
  userId: string
  initialServices: PlatformService[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0c0d12]/95 border border-white/10 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md">
      <p className="text-zinc-500 text-xs font-mono mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
          <p className="text-sm font-semibold text-white">
            {p.name}: <span className="font-mono">{typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}</span>
          </p>
        </div>
      ))}
    </div>
  )
}

export function AnalyticsPageClient({ userId, initialServices }: AnalyticsPageClientProps) {
  const [selectedSlug, setSelectedSlug] = useState<string>(() => {
    return initialServices.length > 0 ? initialServices[0].slug : ''
  })
  const [logs, setLogs] = useState<AnalyticsLog[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  // Fetch 30 days of logs whenever selected service changes
  useEffect(() => {
    if (!selectedSlug) return

    const fetchLogs = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
        
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data, error } = await supabase
          .from('analytics_logs')
          .select('*')
          .eq('service_slug', selectedSlug)
          .eq('user_id', userId)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true })

        if (error) throw error
        setLogs(data || [])
      } catch (err) {
        console.error('Error fetching logs:', err)
        toast.error('Failed to load telemetry logs for the selected tool.')
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [selectedSlug, userId])

  // Get current active service
  const selectedService = useMemo(() => {
    return initialServices.find(s => s.slug === selectedSlug) || null
  }, [selectedSlug, initialServices])

  // Extract config
  const chartConfig = selectedService?.marketplace_metadata?.analytics_chart_config
  const metricKey = chartConfig?.metric_key || 'value'
  const metricLabel = chartConfig?.label || 'Value'
  const chartType = chartConfig?.chart_type || 'line'

  // Dynamic KPI Card Calculations
  const kpis = useMemo(() => {
    const totalExecutions = logs.length
    
    const successes = logs.filter(l => l.status === 'success').length
    const successRate = totalExecutions > 0 
      ? Number(((successes / totalExecutions) * 100).toFixed(1)) 
      : 0.0

    const totalMetricValue = logs.reduce((sum, log) => {
      const val = log.event_data?.[metricKey]
      return sum + (typeof val === 'number' ? val : 0)
    }, 0)

    return {
      totalExecutions,
      successRate,
      totalMetricValue
    }
  }, [logs, metricKey])

  // Aggregate logs into continuous 30-day timeline in IST/local timezone
  const aggregatedChartData = useMemo(() => {
    if (logs.length === 0 || !selectedService) return []

    const dateMap: Record<string, { date: string; rawDate: Date; [key: string]: any }> = {}
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
    })

    // Pre-populate last 30 days with 0s
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(now.getDate() - i)
      const dateStr = formatter.format(d)
      dateMap[dateStr] = {
        date: dateStr,
        rawDate: d,
        [metricKey]: 0,
        executions: 0
      }
    }

    // Accumulate actual log metrics
    logs.forEach(log => {
      const logDate = new Date(log.created_at)
      const dateStr = formatter.format(logDate)
      
      if (dateMap[dateStr]) {
        const val = log.event_data?.[metricKey]
        dateMap[dateStr][metricKey] += typeof val === 'number' ? val : 0
        dateMap[dateStr].executions += 1
      }
    })

    return Object.values(dateMap).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime())
  }, [logs, selectedService, metricKey])

  const accentColor = selectedService?.ui_config?.theme === 'amber' || selectedService?.ui_config?.theme === 'gold' ? '#f59e0b' : '#7c3aed'

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header and Tool Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-300 tracking-wider uppercase">Polymorphic Telemetry</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
            Analytics Dashboard
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Real-time performance and execution metrics across your deployed tools.
          </p>
        </div>

        {/* Dropdown Selector */}
        {initialServices.length > 0 && (
          <div className="relative min-w-[240px] group">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-amber-500/20 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className="relative flex items-center">
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full bg-[#0a0b10] border border-white/10 group-hover:border-white/20 rounded-xl pl-4 pr-10 py-3 text-sm text-white font-medium focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all appearance-none cursor-pointer"
              >
                {initialServices.map((service) => (
                  <option key={service.id} value={service.slug}>
                    {service.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 w-4 h-4 text-zinc-500 pointer-events-none group-hover:text-zinc-300 transition-colors" />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-zinc-500 text-sm font-mono">Loading telemetry insights...</p>
        </div>
      ) : logs.length === 0 ? (
        /* Empty State Canvas */
        <div className="bg-[#0f1117]/60 border border-white/5 rounded-2xl p-16 text-center flex flex-col items-center justify-center min-h-[450px] shadow-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-gradient-to-br from-violet-500/10 to-transparent blur-3xl opacity-60 pointer-events-none" />
          <div className="p-5 rounded-full bg-white/5 border border-white/10 text-zinc-500 mb-6 shadow-inner">
            <Layers className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-wide">No analytics data generated yet</h3>
          <p className="text-zinc-400 text-sm max-w-sm mt-2 mb-8 leading-relaxed">
            Launch or trigger operations with <span className="font-semibold text-zinc-300">{selectedService?.name}</span> to see real-time performance metrics populated here.
          </p>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Dynamic KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Executions KPI */}
            <div className="bg-[#0f1117]/80 border border-white/5 hover:border-violet-500/20 hover:shadow-[0_0_20px_rgba(124,58,237,0.05)] rounded-2xl p-6 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Total Executions</span>
                <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400 border border-violet-500/10">
                  <Database className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-white font-mono">{kpis.totalExecutions.toLocaleString()}</span>
                <p className="text-xs text-zinc-500 mt-1.5">Successful or failed service triggers</p>
              </div>
            </div>

            {/* Success Rate KPI */}
            <div className="bg-[#0f1117]/80 border border-white/5 hover:border-emerald-500/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.05)] rounded-2xl p-6 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Success Rate</span>
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/10">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-white font-mono">{kpis.successRate}%</span>
                <p className="text-xs text-zinc-500 mt-1.5">Executions finishing without exceptions</p>
              </div>
            </div>

            {/* Core Metric Dynamic Sum KPI */}
            <div className="bg-[#0f1117]/80 border border-white/5 hover:border-amber-500/20 hover:shadow-[0_0_20px_rgba(245,158,11,0.05)] rounded-2xl p-6 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Total {metricLabel.replace(/\s*\(.*\)\s*/, '')}</span>
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/10">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-white font-mono">
                  {kpis.totalMetricValue.toLocaleString('en-IN')}
                </span>
                <p className="text-xs text-zinc-500 mt-1.5">Cumulative metrics from event telemetry</p>
              </div>
            </div>
          </div>

          {/* Adaptive Chart Rendering Container */}
          <div className="bg-[#0f1117]/90 border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-xl">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-violet-600/5 to-transparent blur-3xl opacity-60 pointer-events-none" />
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">{metricLabel} Trend</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Aggregated daily telemetry for the last 30 days</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-mono text-zinc-400 uppercase">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                30 Day Series
              </div>
            </div>

            <div className="w-full h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={aggregatedChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={accentColor} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={accentColor} stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                    <Bar 
                      dataKey={metricKey} 
                      name={metricLabel} 
                      fill="url(#barGradient)" 
                      radius={[4, 4, 0, 0]} 
                    />
                  </BarChart>
                ) : (
                  <LineChart data={aggregatedChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey={metricKey} 
                      name={metricLabel} 
                      stroke={accentColor} 
                      strokeWidth={2.5} 
                      dot={{ r: 3, strokeWidth: 1.5, fill: '#0a0b10' }} 
                      activeDot={{ r: 5, strokeWidth: 2, fill: accentColor }} 
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
