'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { BarChart3, ChevronRight } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { toast } from 'sonner'

const RANGES = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
]

const SENTIMENT_COLORS = ['#22c55e', '#f59e0b', '#ef4444']

interface TooltipPayload {
  color: string
  name: string
  value: number | string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f1117] border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-white/60 text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

interface CallLog {
  id: string
  duration_seconds: number
  sentiment: string | null
  created_at: string
}

interface SummaryStats {
  totalCalls: number
  totalMinutes: number
  avgDuration: number
  positiveRate: number
}

export function AnalyticsPageClient() {
  const router = useRouter()
  const [range, setRange] = useState('30d')
  const [volumeData, setVolumeData] = useState<{ date: string; calls: number }[]>([])
  const [sentimentData, setSentimentData] = useState<{ name: string; value: number }[]>([])
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true)
        const supabase = createClient()

        // 1. Authenticate user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.push('/login')
          return
        }

        // Calculate time boundary
        const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
        const since = new Date()
        since.setDate(since.getDate() - days)

        // 2. Fetch call logs from agent_call_logs table
        const { data: logs, error: logsError } = await supabase
          .from('agent_call_logs')
          .select('id, duration_seconds, sentiment, created_at')
          .eq('user_id', user.id)
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: true })

        if (logsError) throw logsError

        const callLogs: CallLog[] = logs || []

        // 3. Build daily interaction volume mapping
        const dayMap: Record<string, { date: string; calls: number }> = {}
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const key = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
          dayMap[key] = { date: key, calls: 0 }
        }

        callLogs.forEach((log) => {
          const key = new Date(log.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
          if (dayMap[key]) {
            dayMap[key].calls++
          }
        })
        setVolumeData(Object.values(dayMap))

        // 4. Calculate call sentiment counts
        const pos = callLogs.filter(log => log.sentiment?.toLowerCase() === 'positive').length
        const neu = callLogs.filter(log => log.sentiment?.toLowerCase() === 'neutral' || !log.sentiment).length
        const neg = callLogs.filter(log => log.sentiment?.toLowerCase() === 'negative').length

        setSentimentData([
          { name: 'Positive', value: pos },
          { name: 'Neutral', value: neu },
          { name: 'Negative', value: neg },
        ])

        // 5. Calculate top-level stats
        const totalCalls = callLogs.length
        const totalDuration = callLogs.reduce((acc, log) => acc + (log.duration_seconds || 0), 0)
        const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0
        const totalMinutes = Math.round(totalDuration / 60)
        const positiveRate = totalCalls > 0 ? Math.round((pos / totalCalls) * 100) : 0

        setSummaryStats({
          totalCalls,
          totalMinutes,
          avgDuration,
          positiveRate,
        })
      } catch (err) {
        console.error("Error fetching analytics data:", err)
        toast.error("Failed to load real-time analytics data.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [range, router])

  // Duration M:SS Formatter
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const statCards = [
    { label: 'Total Calls', value: summaryStats?.totalCalls ?? 0, icon: '📞', color: 'text-purple-400', isText: false },
    { label: 'Total Minutes', value: `${summaryStats?.totalMinutes ?? 0}m`, icon: '💬', color: 'text-blue-400', isText: true },
    { label: 'Avg Call Duration', value: formatDuration(summaryStats?.avgDuration ?? 0), icon: '⏱', color: 'text-amber-400', isText: true },
    { label: 'Positive Sentiment', value: `${summaryStats?.positiveRate ?? 0}%`, icon: '😊', color: 'text-green-400', isText: true },
  ]

  const hasCallLogs = (summaryStats?.totalCalls ?? 0) > 0

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-amber-400" /> Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">Deep insights across all your AI agent interactions</p>
        </div>
        
        {/* Range Selector */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 self-start sm:self-auto">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                range === r.value
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/5 rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <div key={i} className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-5 flex flex-col gap-2 shadow-lg">
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <span>{card.icon}</span>
                <span>{card.label}</span>
              </div>
              <div className={`text-3xl font-bold font-mono ${card.color}`}>
                {card.isText ? card.value : card.value.toLocaleString('en-US')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts Section */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="h-80 bg-white/5 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 h-64 bg-white/5 rounded-2xl animate-pulse" />
            <div className="lg:col-span-3 h-64 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        </div>
      ) : !hasCallLogs ? (
        /* Glassmorphic Empty State Overlay */
        <div className="bg-[#0f1117]/85 border border-white/5 backdrop-blur-md rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 min-h-[400px] shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
          <div className="w-16 h-16 rounded-full bg-zinc-800/60 border border-white/5 flex items-center justify-center text-3xl mb-2">
            📊
          </div>
          <h3 className="text-xl font-bold text-white tracking-wide">Not enough data yet</h3>
          <p className="text-zinc-400 text-sm max-w-md mt-1 mb-6 leading-relaxed">
            Complete a test call to generate analytics and populate these charts with real performance metrics.
          </p>
          <button
            onClick={() => router.push('/dashboard/demo')}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/20 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm"
          >
            Go to Test Portal <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Interactive Charts display */
        <div className="space-y-6">
          
          {/* Interaction Volume Chart */}
          <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-6">Interaction Volume</h2>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={volumeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="calls" name="Voice Calls" stroke="#7c3aed" strokeWidth={2} fill="url(#callGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Call Sentiment Donut/Pie Chart */}
            <div className="lg:col-span-2 bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-6">Call Sentiment</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={index} fill={SENTIMENT_COLORS[index % SENTIMENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(val) => <span className="text-zinc-400 text-xs">{val}</span>}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Daily Breakdown Bar Chart */}
            <div className="lg:col-span-3 bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-6">Daily Breakdown</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={volumeData.slice(-14)} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="calls" name="Voice Calls" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
