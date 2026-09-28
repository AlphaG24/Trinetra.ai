import Link from 'next/link'
import { Activity, Bot, Target, TrendingUp, AlertCircle, RefreshCw, ArrowUpRight } from 'lucide-react'

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
      <div suppressHydrationWarning className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 w-full rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/15 hover:bg-red-500/20 transition cursor-pointer font-bold uppercase tracking-wider"
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
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
      desc: 'Calls + chats this month',
      href: '/dashboard/calls'
    },
    {
      label: 'Active Tools',
      value: stats?.activeTools ?? 0,
      icon: Bot,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      desc: 'Live deployed agents',
      href: '/dashboard/agents'
    },
    {
      label: 'Leads Generated',
      value: stats?.leadsGenerated ?? 0,
      icon: Target,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      desc: 'Extracted contact details',
      href: '/dashboard/leads'
    },
    {
      label: 'Conversion Rate',
      value: `${stats?.conversionRate ?? 0}%`,
      icon: TrendingUp,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      desc: 'Converted leads ratio',
      href: '/dashboard/analytics'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon
        return (
          <Link
            key={idx}
            href={kpi.href}
            className="group flex flex-col justify-between p-5 bg-[var(--card-bg)] border border-[var(--border)] hover:border-violet-500/40 rounded-2xl transition-all duration-200 hover:scale-[1.01] hover:shadow-lg shadow-sm cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] group-hover:text-[var(--heading)] transition-colors">
                {kpi.label}
              </span>
              <div className="flex items-center gap-1.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[var(--muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black font-display text-[var(--heading)]">
                {kpi.value}
              </span>
              <p className="text-[10px] text-[var(--muted)] mt-1 font-semibold">{kpi.desc}</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
