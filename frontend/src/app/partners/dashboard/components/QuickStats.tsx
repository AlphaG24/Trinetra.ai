'use client'

import { CalendarClock, Coins, Link2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardMetrics } from '@/lib/computeMetrics'
import { formatCurrency, getNextPayoutDate } from '@/lib/formatters'

interface QuickStatsProps {
  partner: {
    referral_code: string | null
    commission_rate_override?: number | null
  }
  policy: {
    commission_on?: string | null
    recurring_months?: number | null
    payout_day?: number | null
    minimum_payout_threshold?: number | null
  } | null
  metrics: DashboardMetrics
  effectiveRate: number
  currency: string
}

const cardClass =
  'rounded-xl border border-amber-500/15 bg-[#100d1f] p-6 transition hover:bg-[#130f22]'

export default function QuickStats({
  partner,
  policy,
  metrics,
  effectiveRate,
  currency,
}: QuickStatsProps) {
  const handleCopyCode = async () => {
    if (!partner.referral_code) return
    await navigator.clipboard.writeText(partner.referral_code)
    toast.success('Copied to clipboard!', { duration: 2000 })
  }

  const commissionSubtitle =
    policy?.commission_on === 'first_payment'
      ? 'On first payment'
      : policy?.commission_on === 'recurring'
        ? `Recurring ${policy.recurring_months ?? 0} months`
        : 'Lifetime recurring'

  const threshold = policy?.minimum_payout_threshold ?? 0
  const approved = metrics.approvedCommission
  const payoutSubtitle =
    approved >= threshold
      ? `${formatCurrency(approved, currency)} ready`
      : `Need ${formatCurrency(Math.max(threshold - approved, 0), currency)} more`

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <button
        type="button"
        onClick={handleCopyCode}
        className={`${cardClass} text-left`}
      >
        <div className="mb-3 flex items-center gap-2 text-white/45">
          <Link2 className="h-4 w-4 text-[#f5c518]" />
          <p className="text-[11px] uppercase tracking-[0.24em]">Your Referral Code</p>
        </div>
        <span className="block text-3xl font-bold text-white">
          {partner.referral_code || '-'}
        </span>
        <span className="mt-1 block text-xs text-white/45">Click to copy</span>
      </button>

      <div className={cardClass}>
        <div className="mb-3 flex items-center gap-2 text-white/45">
          <Coins className="h-4 w-4 text-[#f5c518]" />
          <p className="text-[11px] uppercase tracking-[0.24em]">Commission Rate</p>
        </div>
        <span className="block text-3xl font-bold text-white">{effectiveRate}%</span>
        <span className="mt-1 block text-xs text-white/45">{commissionSubtitle}</span>
        {partner.commission_rate_override ? (
          <span className="mt-2 block text-xs text-[#f5c518]">Custom rate applied</span>
        ) : null}
      </div>

      <div className={cardClass}>
        <div className="mb-3 flex items-center gap-2 text-white/45">
          <CalendarClock className="h-4 w-4 text-[#3b82f6]" />
          <p className="text-[11px] uppercase tracking-[0.24em]">Next Payout Date</p>
        </div>
        <span className="block text-3xl font-bold text-white">
          {getNextPayoutDate(policy?.payout_day ?? 1)}
        </span>
        <span className="mt-1 block text-xs text-white/45">{payoutSubtitle}</span>
      </div>

      <div className={cardClass}>
        <div className="mb-3 flex items-center gap-2 text-white/45">
          <Sparkles className="h-4 w-4 text-[#10b981]" />
          <p className="text-[11px] uppercase tracking-[0.24em]">This Month</p>
        </div>
        <span className="block text-3xl font-bold text-white">
          {metrics.thisMonthReferrals} referrals
        </span>
        <span className="mt-1 block text-xs text-white/45">
          {formatCurrency(metrics.thisMonthCommission, currency)} earned
        </span>
      </div>
    </section>
  )
}
