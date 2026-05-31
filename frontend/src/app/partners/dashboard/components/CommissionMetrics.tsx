import {
  BarChart2,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
} from 'lucide-react'
import { DashboardMetrics } from '@/lib/computeMetrics'
import { formatCurrency } from '@/lib/formatters'

interface CommissionMetricsProps {
  metrics: DashboardMetrics
  currency: string
}

const cards = (metrics: DashboardMetrics, currency: string) => [
  {
    label: 'Pending Commission',
    value: formatCurrency(metrics.pendingCommission, currency),
    sub: 'Awaiting approval',
    icon: Clock,
    iconClass: 'text-[#f59e0b]',
    iconBg: 'bg-[#f59e0b]/10',
  },
  {
    label: 'Approved Commission',
    value: formatCurrency(metrics.approvedCommission, currency),
    sub: 'Ready for next payout',
    icon: CheckCircle,
    iconClass: 'text-[#3b82f6]',
    iconBg: 'bg-[#3b82f6]/10',
  },
  {
    label: 'Paid Commission',
    value: formatCurrency(metrics.paidCommission, currency),
    sub: 'Total lifetime earned',
    icon: DollarSign,
    iconClass: 'text-[#10b981]',
    iconBg: 'bg-[#10b981]/10',
  },
  {
    label: 'Total Referrals',
    value: metrics.totalReferrals.toString(),
    sub: `${metrics.convertedReferrals} converted / ${metrics.pendingReferrals} pending`,
    icon: Users,
    iconClass: 'text-[#f5c518]',
    iconBg: 'bg-[#f5c518]/10',
  },
  {
    label: 'Conversion Rate',
    value: `${metrics.conversionRate.toFixed(1)}%`,
    sub: `${metrics.qualifiedReferrals} qualified referrals`,
    icon: TrendingUp,
    iconClass: 'text-[#f5c518]',
    iconBg: 'bg-[#f5c518]/10',
  },
  {
    label: 'Revenue Generated',
    value: formatCurrency(metrics.revenueGenerated, currency),
    sub: 'For Trinetra via your referrals',
    icon: BarChart2,
    iconClass: 'text-[#f5c518]',
    iconBg: 'bg-[#f5c518]/10',
  },
]

export default function CommissionMetrics({
  metrics,
  currency,
}: CommissionMetricsProps) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards(metrics, currency).map((card) => {
        const Icon = card.icon

        return (
          <div
            key={card.label}
            className="rounded-xl border border-amber-500/15 bg-[#100d1f] p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-widest text-white/45">
                  {card.label}
                </p>
                <span className="text-3xl font-bold text-white">{card.value}</span>
              </div>
              <div className={`rounded-xl p-3 ${card.iconBg}`}>
                <Icon className={`h-5 w-5 ${card.iconClass}`} />
              </div>
            </div>
            <span className="text-xs text-white/45">{card.sub}</span>
          </div>
        )
      })}
    </section>
  )
}
