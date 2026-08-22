import { useState, useEffect } from 'react'
import { BarChart3, Calendar, Loader2 } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { LockedFeature } from './LockedFeature'

interface AgentAnalyticsTabProps {
  agent: any
  unlocked: boolean
  upgradeUrl: string
}

export function AgentAnalyticsTab({ agent, unlocked, upgradeUrl }: AgentAnalyticsTabProps) {
  const [dateRange, setDateRange] = useState('7d')
  const [loading, setLoading] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<any>(null)

  useEffect(() => {
    if (!unlocked || !agent?.id) return

    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const rangeVal = dateRange.replace('d', '')
        const res = await fetch(`/api/dashboard/analytics?agent_id=${agent.id}&range=${rangeVal}`)
        if (res.ok) {
          const data = await res.json()
          setAnalyticsData(data)
        }
      } catch (err) {
        console.error("Failed to fetch agent analytics:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [agent?.id, dateRange, unlocked])

  if (!unlocked) {
    return (
      <LockedFeature 
        title="Performance Analytics"
        description="Unlock deep insights, call volume telemetry charts, automated sentiment tracking, and conversion funnels for this agent."
        upgradeUrl={upgradeUrl}
      />
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      {/* Header & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-[var(--heading)] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-400" /> Performance Analytics
          </h2>
          <p className="text-xs text-[var(--muted)] font-sans">
            Monitor real-time call performance, user sentiment, and lead conversion trends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--muted)]" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs focus:outline-none text-[var(--heading)] font-montserrat font-bold uppercase tracking-wider cursor-pointer"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Call Volume Area Chart (2 cols) */}
        <div className="lg:col-span-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold font-montserrat uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
            Call Volume {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          </h3>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData?.callVolume?.map((v: any) => {
                const d = new Date(v.date)
                const isWeek = dateRange === '7d'
                return {
                  day: isWeek ? d.toLocaleDateString('en-US', { weekday: 'short' }) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  calls: v.count
                }
              }) || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)', borderRadius: '12px' }}
                  labelStyle={{ fontSize: '10px', color: 'var(--heading)', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="calls" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Pie Chart (1 col) */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-bold font-montserrat uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
            Call Sentiment {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          </h3>
          
          {(() => {
            const rawSentiment = analyticsData?.sentiment || []
            const sentimentData = rawSentiment.map((s: any) => ({
              ...s,
              color: s.name === 'Positive' ? '#10B981' : s.name === 'Negative' ? '#EF4444' : '#6B7280'
            }))
            const totalSentiment = sentimentData.reduce((acc: number, s: any) => acc + s.value, 0)
            const positiveVal = sentimentData.find((s: any) => s.name === 'Positive')?.value || 0
            const positivePercent = totalSentiment > 0 ? Math.round((positiveVal / totalSentiment) * 100) : 0

            return (
              <>
                <div className="h-48 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                        {sentimentData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)', borderRadius: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold font-display text-[var(--heading)]">{positivePercent}%</span>
                    <span className="text-[9px] uppercase tracking-wider font-montserrat font-bold text-[var(--muted)]">Positive</span>
                  </div>
                </div>

                <div className="flex justify-around text-center pt-2 border-t border-[var(--border)]">
                  {sentimentData.map((entry: any, index: number) => {
                    const pct = totalSentiment > 0 ? Math.round((entry.value / totalSentiment) * 100) : 0
                    return (
                      <div key={index} className="space-y-1">
                        <span className="text-[10px] font-montserrat font-bold uppercase tracking-wider text-[var(--muted)] block">{entry.name}</span>
                        <span className="text-xs font-bold text-[var(--heading)] font-sans">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>

        {/* Conversion Funnel (3 cols) */}
        <div className="lg:col-span-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold font-montserrat uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
            Conversion Funnel {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          </h3>
          
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData?.leadFunnel?.map((f: any) => ({ stage: f.stage, value: f.count })) || []} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <XAxis type="number" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="stage" type="category" stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)', borderRadius: '12px' }}
                />
                <Bar dataKey="value" fill="#8B5CF6" radius={[0, 8, 8, 0]}>
                  {(analyticsData?.leadFunnel || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`rgba(139, 92, 246, ${1 - index * 0.2})`} />
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
