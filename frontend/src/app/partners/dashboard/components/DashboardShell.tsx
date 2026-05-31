'use client'

import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle,
  CircleDollarSign,
  Clock,
  Copy,
  Link2,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { format, startOfMonth, subMonths } from 'date-fns'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DashboardMetrics } from '@/lib/computeMetrics'
import { formatCurrency, formatDate } from '@/lib/formatters'
import DashboardSidebar from './DashboardSidebar'
import DashboardNav from './DashboardNav'
import StatusBadge from './StatusBadge'
import EmptyState from './EmptyState'
import AddReferralModal from './AddReferralModal'

/* ─── Types ─── */
interface DashboardShellProps {
  partner: any
  policy: any
  metrics: DashboardMetrics
  referrals: any[]
  payouts: any[]
  effectiveRate: number
  currency: string
  referralLink: string
}

/* ─── Animation ─── */
const stagger: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const fadeUp: any = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

/* ─── Component ─── */
export default function DashboardShell({
  partner,
  policy,
  metrics,
  referrals,
  payouts,
  effectiveRate,
  currency,
  referralLink,
}: DashboardShellProps) {
  const [isAddingReferral, setIsAddingReferral] = useState(false)

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(referralLink)
    toast.success('Referral link copied!', { duration: 2000 })
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(partner.referral_code || '')
    toast.success('Referral code copied!', { duration: 2000 })
  }

  /* Chart data */
  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), 5 - i))
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM'), revenue: 0, commission: 0 }
    })
    referrals.forEach((r) => {
      if (!r.created_at) return
      const key = format(startOfMonth(new Date(r.created_at)), 'yyyy-MM')
      const m = months.find((e) => e.key === key)
      if (!m) return
      m.revenue += Number(r.deal_value ?? 0)
      m.commission += Number(r.commission_amount ?? 0)
    })
    return months
  }, [referrals])
  const hasChartData = chartData.some((d) => d.revenue > 0 || d.commission > 0)

  /* Recent referrals (top 5) */
  const recentRefs = referrals.slice(0, 5)

  /* Payout items (top 3) */
  const recentPayouts = payouts.slice(0, 3)

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      {/* Sidebar */}
      <DashboardSidebar
        partnerName={partner.full_name}
        partnerTier={partner.tier}
        onGenerateLink={handleCopyLink}
      />

      {/* Main content — offset by sidebar width on lg+ */}
      <div className="flex flex-1 flex-col lg:pl-[220px]">
        <DashboardNav partner={partner} />

        <motion.main
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-5 py-8 sm:px-8"
        >
          {/* ─── HERO HEADER ─── */}
          <motion.section variants={fadeUp} className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                Partner Overview
              </h1>
              <p className="mt-1 text-sm text-white/45">
                Performance analytics for {partner.company_name || partner.full_name || 'your account'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                <Link2 className="h-4 w-4" />
                Generate Referral Link
              </button>
            </div>
          </motion.section>

          {/* ─── 4 METRIC CARDS ─── */}
          <motion.section variants={fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              icon={Users}
              iconBg="bg-emerald-500/10"
              iconColor="text-emerald-400"
              label="Total Referrals"
              value={metrics.totalReferrals.toString()}
              badge={metrics.thisMonthReferrals > 0 ? `+${metrics.thisMonthReferrals} this month` : undefined}
              badgeColor="text-emerald-400 bg-emerald-500/10"
            />
            <MetricTile
              icon={TrendingUp}
              iconBg="bg-blue-500/10"
              iconColor="text-blue-400"
              label="Conversion Rate"
              value={`${metrics.conversionRate.toFixed(1)}%`}
              badge={metrics.qualifiedReferrals > 0 ? `${metrics.qualifiedReferrals} qualified` : undefined}
              badgeColor="text-blue-400 bg-blue-500/10"
            />
            <MetricTile
              icon={BarChart3}
              iconBg="bg-amber-500/10"
              iconColor="text-amber-400"
              label="Revenue Generated"
              value={formatCurrency(metrics.revenueGenerated, currency)}
              badge={metrics.convertedReferrals > 0 ? 'High Growth' : undefined}
              badgeColor="text-amber-400 bg-amber-500/10"
            />
            <MetricTile
              icon={Wallet}
              iconBg="bg-purple-500/10"
              iconColor="text-purple-400"
              label="Available Balance"
              value={formatCurrency(metrics.approvedCommission, currency)}
              action={
                metrics.approvedCommission > 0 ? (
                  <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase text-white/60">
                    Withdraw
                  </span>
                ) : undefined
              }
            />
          </motion.section>

          {/* ─── CHART + PAYOUT HISTORY ─── */}
          <motion.section variants={fadeUp} className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
            {/* Chart */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0e0c18] p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Revenue vs Commissions</h2>
                <div className="flex items-center gap-4 text-xs text-white/45">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> Revenue
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-400" /> Commissions
                  </span>
                </div>
              </div>
              {!hasChartData ? (
                <div className="flex h-[240px] items-center justify-center rounded-xl border border-white/[0.04] bg-white/[0.02]">
                  <p className="text-sm text-white/30">Chart data will appear once referrals convert</p>
                </div>
              ) : (
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="label" stroke="rgba(255,255,255,0.25)" tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.25)" tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v, currency)} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#14111f', borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12, fontSize: 13 }}
                        formatter={(value: any, name: any) => [formatCurrency(value, currency), name === 'revenue' ? 'Revenue' : 'Commission']}
                      />
                      <Area type="monotone" dataKey="revenue" name="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" />
                      <Area type="monotone" dataKey="commission" name="commission" stroke="#3b82f6" strokeWidth={2} fill="url(#commGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Payout History Sidebar */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0e0c18] p-6">
              <h2 className="mb-5 text-lg font-semibold text-white">Payout History</h2>
              {recentPayouts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CircleDollarSign className="mb-3 h-8 w-8 text-white/15" />
                  <p className="text-sm text-white/35">No payouts yet</p>
                  <p className="mt-1 text-xs text-white/20">Payouts appear once commission reaches the minimum threshold</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {recentPayouts.map((p: any) => (
                    <div key={p.id} className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-full p-2 ${p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : p.status === 'processing' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        <CircleDollarSign className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-white/80">{formatDate(p.paid_on || p.created_at)}</p>
                          <p className="text-sm font-medium text-white">{formatCurrency(Number(p.amount ?? 0), currency)}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-white/35">{p.payout_method || 'Transfer'}</p>
                          <StatusBadge status={p.status || 'pending'} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {payouts.length > 3 && (
                    <button className="mt-2 text-center text-xs font-medium text-emerald-400 transition hover:text-emerald-300">
                      View Full Payout Statement
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.section>

          {/* ─── RECENT REFERRALS TABLE ─── */}
          <motion.section variants={fadeUp} id="referrals" className="rounded-2xl border border-white/[0.06] bg-[#0e0c18] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent Referrals</h2>
              <button
                type="button"
                onClick={() => setIsAddingReferral(true)}
                className="text-xs font-medium text-emerald-400 transition hover:text-emerald-300"
              >
                + Add Referral
              </button>
            </div>

            {recentRefs.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No referrals recorded yet."
                description="Share your referral link to start earning commission."
                actionLabel="Copy Referral Link"
                onAction={handleCopyLink}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Name', 'Date', 'Product', 'Status', 'Commission'].map((h) => (
                        <th key={h} className="pb-3 text-left text-[11px] font-medium uppercase tracking-widest text-white/35">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentRefs.map((r: any) => {
                      const initials = (r.referral_name || 'N A')
                        .split(' ')
                        .map((w: string) => w[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)

                      return (
                        <tr key={r.id} className="border-b border-white/[0.03] transition hover:bg-white/[0.02]">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-bold text-white/50">
                                {initials}
                              </div>
                              <span className="text-sm font-medium text-white">{r.referral_name || '-'}</span>
                            </div>
                          </td>
                          <td className="py-4 text-sm text-white/55">{formatDate(r.created_at)}</td>
                          <td className="py-4">
                            {r.product ? (
                              <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                                {r.product}
                              </span>
                            ) : (
                              <span className="text-sm text-white/35">-</span>
                            )}
                          </td>
                          <td className="py-4">
                            <StatusBadge status={r.status || 'pending'} />
                          </td>
                          <td className="py-4 text-right text-sm font-medium text-white">
                            {formatCurrency(Number(r.commission_amount ?? 0), currency)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.section>

          {/* ─── QUICK SETTINGS STRIP ─── */}
          <motion.section variants={fadeUp} id="settings" className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Referral Info */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0e0c18] p-6">
              <p className="mb-1 text-[11px] uppercase tracking-widest text-white/35">Your Referral Code</p>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <span className="font-mono text-lg font-bold text-emerald-400">{partner.referral_code || '-'}</span>
                <button onClick={handleCopyCode} className="rounded-lg p-2 text-white/35 transition hover:bg-white/[0.04] hover:text-white">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 truncate text-xs text-white/30">{referralLink}</p>
            </div>

            {/* Commission Info */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0e0c18] p-6">
              <p className="mb-1 text-[11px] uppercase tracking-widest text-white/35">Commission Structure</p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Your Rate</span>
                  <span className="text-lg font-bold text-white">{effectiveRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Total Earned</span>
                  <span className="text-sm font-medium text-emerald-400">{formatCurrency(metrics.paidCommission, currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Pending</span>
                  <span className="text-sm font-medium text-amber-400">{formatCurrency(metrics.pendingCommission, currency)}</span>
                </div>
              </div>
            </div>

            {/* Account Quick Info */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0e0c18] p-6">
              <p className="mb-1 text-[11px] uppercase tracking-widest text-white/35">Account</p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Name</span>
                  <span className="text-sm font-medium text-white">{partner.full_name || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Email</span>
                  <span className="text-sm text-white/70 truncate max-w-[160px]">{partner.email || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Status</span>
                  <StatusBadge status={partner.status || 'active'} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Tier</span>
                  <StatusBadge status={partner.tier || 'standard'} />
                </div>
              </div>
            </div>
          </motion.section>
        </motion.main>
      </div>

      {/* Add Referral Modal */}
      <AddReferralModal
        key={`add-ref-${isAddingReferral ? 'open' : 'closed'}`}
        isOpen={isAddingReferral}
        onClose={() => setIsAddingReferral(false)}
        partnerId={partner.id}
        commissionRate={effectiveRate}
        currency={currency}
        referralCode={partner.referral_code}
      />
    </div>
  )
}

/* ─── Metric Card ─── */
function MetricTile({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  badge,
  badgeColor,
  action,
}: {
  icon: any
  iconBg: string
  iconColor: string
  label: string
  value: string
  badge?: string
  badgeColor?: string
  action?: React.ReactNode
}) {
  return (
    <div className="group rounded-2xl border border-white/[0.06] bg-[#0e0c18] p-5 transition hover:border-white/[0.1] hover:bg-[#110e1c]">
      <div className="mb-4 flex items-center justify-between">
        <div className={`rounded-xl p-2.5 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>
            {badge}
          </span>
        )}
        {action}
      </div>
      <p className="mb-1 text-[11px] uppercase tracking-widest text-white/35">{label}</p>
      <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
    </div>
  )
}
