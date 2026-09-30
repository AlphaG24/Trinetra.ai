'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  PhoneCall,
  Megaphone,
  RotateCcw,
  Users,
  ShieldCheck,
  Info
} from 'lucide-react'
import toast from 'react-hot-toast'

interface RevenueEvent {
  id: string
  lead_id?: string | null
  call_id?: string | null
  quoted_amount?: number | null
  currency: string
  deal_status: 'open' | 'won' | 'lost'
  won_amount?: number | null
  price_type?: string | null
  service?: string | null
  confidence?: number | null
  source: string
  created_at: string
  extracted_quote_text?: string | null
  metadata?: any
}

interface RevenueMetrics {
  estimatedPipeline: number
  confirmedRevenue: number
  totalPaidToTrinetra: number
  roiMultiplier: number
  roiPercentage: number
  revenueBySource: Record<string, number>
  dealCounts: { open: number; won: number; lost: number }
  totalDeals: number
  events: RevenueEvent[]
  currency: string
  dateRange: { start: string; end: string; range: string }
}

export function RevenueDashboardClient({ embedded = false }: { embedded?: boolean } = {}) {
  const [range, setRange] = useState<'this_month' | '30d' | '7d'>('this_month')
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null)

  // Won Modal State
  const [selectedEventForWon, setSelectedEventForWon] = useState<RevenueEvent | null>(null)
  const [customWonAmount, setCustomWonAmount] = useState<string>('')

  const fetchMetrics = async (selectedRange: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/dashboard/revenue?range=${selectedRange}`)
      if (res.ok) {
        const data = await res.json()
        setMetrics(data)
      } else {
        toast.error('Failed to load revenue analytics')
      }
    } catch {
      toast.error('Network error loading revenue metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics(range)
  }, [range])

  const handleConfirmWon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEventForWon) return

    try {
      setUpdatingEventId(selectedEventForWon.id)
      const amt = customWonAmount ? parseFloat(customWonAmount) : (selectedEventForWon.quoted_amount || 0)
      const res = await fetch('/api/dashboard/revenue/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventForWon.id,
          dealStatus: 'won',
          wonAmount: amt
        })
      })

      if (res.ok) {
        toast.success(`Deal marked as Won (₹${amt.toLocaleString()})`)
        setSelectedEventForWon(null)
        setCustomWonAmount('')
        fetchMetrics(range)
      } else {
        toast.error('Failed to update deal status')
      }
    } catch {
      toast.error('Error recording confirmed revenue')
    } finally {
      setUpdatingEventId(null)
    }
  }

  const handleMarkLost = async (event: RevenueEvent) => {
    try {
      setUpdatingEventId(event.id)
      const res = await fetch('/api/dashboard/revenue/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          dealStatus: 'lost'
        })
      })

      if (res.ok) {
        toast.success('Deal marked as Lost')
        fetchMetrics(range)
      } else {
        toast.error('Failed to update deal status')
      }
    } catch {
      toast.error('Error updating deal status')
    } finally {
      setUpdatingEventId(null)
    }
  }

  const sourceIcons: Record<string, any> = {
    inbound: PhoneCall,
    campaign: Megaphone,
    callback: Clock,
    reactivation: RotateCcw,
    referral: Users
  }

  const sourceLabels: Record<string, string> = {
    inbound: 'Inbound Calls',
    campaign: 'Outbound Campaigns',
    callback: 'Scheduled Callbacks',
    reactivation: 'Reactivation Funnel',
    referral: 'Client Referrals'
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header and Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {!embedded ? (
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--heading)] font-display">
                Revenue from Trinetra
              </h1>
            ) : (
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--heading)] font-display">
                Revenue Attribution & Pipeline
              </h2>
            )}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-violet-500/15 text-violet-400 border border-violet-500/30">
              LIVE ATTRIBUTION
            </span>
          </div>
          <p className="text-[var(--muted)] text-xs mt-1">
            Real-time pipeline tracking, owner-confirmed closed deals, and ROI generated by your AI agents.
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] self-start sm:self-auto shadow-sm">
          {(['this_month', '30d', '7d'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setRange(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                range === tab
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--heading)]'
              }`}
            >
              {tab === 'this_month' ? 'This Month' : tab === '30d' ? 'Last 30 Days' : 'Last 7 Days'}
            </button>
          ))}
          <button
            onClick={() => fetchMetrics(range)}
            disabled={loading}
            className="p-1.5 text-[var(--muted)] hover:text-[var(--heading)] transition-colors cursor-pointer"
            title="Refresh metrics"
            aria-label="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-violet-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ROI Highlight Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-950/40 via-purple-900/25 to-[var(--card-bg)] p-6 backdrop-blur-xl shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
                Your Return On Investment (ROI)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--heading)]">
              You paid ₹{(metrics?.totalPaidToTrinetra || 0).toLocaleString()}, Trinetra brought{' '}
              <span className="text-emerald-400">
                ₹{(metrics?.confirmedRevenue || 0).toLocaleString()}
              </span>
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Display only &bull; Based on owner-confirmed closed deals &bull; Does not charge on these numbers
            </p>
          </div>

          <div className="flex items-center gap-4 bg-[var(--card-bg)]/90 border border-[var(--border)] rounded-xl px-5 py-3 shadow-inner">
            <div>
              <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                Confirmed ROI Multiple
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 flex items-center gap-1 font-mono">
                {metrics?.roiMultiplier || 0}x
                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div className="h-8 w-px bg-[var(--border)]" />
            <div>
              <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                Net Value Return
              </div>
              <div className="text-sm font-bold text-[var(--heading)] font-mono">
                {metrics && metrics.confirmedRevenue >= metrics.totalPaidToTrinetra ? '+' : ''}
                {metrics?.roiPercentage || 0}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Estimated Pipeline */}
        <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-violet-500/30 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Estimated Pipeline
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              ESTIMATE
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[var(--heading)] mt-3 font-mono">
            ₹{(metrics?.estimatedPipeline || 0).toLocaleString()}
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">
            {metrics?.dealCounts.open || 0} open deals with active AI quotes
          </p>
        </div>

        {/* Card 2: Confirmed Revenue */}
        <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-emerald-500/30 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Confirmed Revenue
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              OWNER CONFIRMED
            </span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-3 font-mono">
            ₹{(metrics?.confirmedRevenue || 0).toLocaleString()}
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">
            {metrics?.dealCounts.won || 0} deals closed and verified
          </p>
        </div>

        {/* Card 3: Deal Conversion Ratio */}
        <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-violet-500/30 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Close Ratio
            </span>
            <span className="text-[11px] font-mono text-[var(--muted)]">
              {metrics?.totalDeals || 0} Total Quotes
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[var(--heading)] mt-3 font-mono">
            {metrics && metrics.totalDeals > 0
              ? Math.round((metrics.dealCounts.won / metrics.totalDeals) * 100)
              : 0}
            %
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">
            {metrics?.dealCounts.lost || 0} lost &bull; {metrics?.dealCounts.open || 0} ongoing
          </p>
        </div>
      </div>

      {/* Revenue by Source Breakdown */}
      <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--heading)] font-display">Revenue by Source</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Attribution based on initial contact and return within 30-day window
            </p>
          </div>
          <div className="text-xs text-[var(--muted)] font-mono">
            30-Day Attribution Window
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(metrics?.revenueBySource || {}).map(([srcKey, amount]) => {
            const Icon = sourceIcons[srcKey] || PhoneCall
            const label = sourceLabels[srcKey] || srcKey
            const total = metrics?.confirmedRevenue || 1
            const pct = total > 0 ? Math.round((amount / total) * 100) : 0

            return (
              <div
                key={srcKey}
                className="p-4 rounded-xl bg-[var(--primary-bg)] border border-[var(--border)] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--muted)] flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-violet-400" />
                    {label}
                  </span>
                  <span className="text-xs font-bold text-[var(--heading)]">{pct}%</span>
                </div>
                <div className="text-lg font-bold text-[var(--heading)] font-mono">
                  ₹{amount.toLocaleString()}
                </div>
                <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Deals & Quotes Table with Quick Confirm Actions */}
      <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--heading)] font-display">Attributed Quotes & Deals</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Click &quot;Closed&quot; to verify revenue or &quot;Lost&quot; to archive
            </p>
          </div>
        </div>

        {metrics?.events && metrics.events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)] font-semibold text-[11px] uppercase tracking-wider">
                  <th className="pb-3 pl-2">Date</th>
                  <th className="pb-3">Source</th>
                  <th className="pb-3">Quoted Amount</th>
                  <th className="pb-3">Price Type</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Won Amount</th>
                  <th className="pb-3 pr-2 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--body)]">
                {metrics.events.map(ev => {
                  const isUpdating = updatingEventId === ev.id
                  const isWon = ev.deal_status === 'won'
                  const isLost = ev.deal_status === 'lost'

                  return (
                    <tr key={ev.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                      <td className="py-3.5 pl-2 font-mono text-[11px] text-[var(--muted)]">
                        {new Date(ev.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-3.5 capitalize font-medium text-[var(--heading)]">
                        {ev.source || 'inbound'}
                      </td>
                      <td className="py-3.5 font-bold text-[var(--heading)] font-mono">
                        {ev.quoted_amount ? `₹${Number(ev.quoted_amount).toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3.5 capitalize text-[var(--muted)] font-mono text-[11px]">
                        {ev.price_type?.replace('_', ' ') || 'One-time'}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isWon
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isLost
                              ? 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {ev.deal_status}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono text-emerald-400 font-bold">
                        {isWon && ev.won_amount ? `₹${Number(ev.won_amount).toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3.5 pr-2 text-right">
                        {ev.deal_status === 'open' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={isUpdating}
                              onClick={() => {
                                setSelectedEventForWon(ev)
                                setCustomWonAmount(ev.quoted_amount ? String(ev.quoted_amount) : '')
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              Closed
                            </button>
                            <button
                              disabled={isUpdating}
                              onClick={() => handleMarkLost(ev)}
                              className="px-2 py-1 rounded-lg bg-[var(--primary-bg)] hover:bg-red-500/20 hover:text-red-400 text-[var(--muted)] border border-[var(--border)] font-semibold text-[11px] transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Lost
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={isUpdating}
                            onClick={() => {
                              setSelectedEventForWon(ev)
                              setCustomWonAmount(ev.won_amount ? String(ev.won_amount) : String(ev.quoted_amount || ''))
                            }}
                            className="text-[var(--muted)] hover:text-violet-400 text-[11px] underline underline-offset-2 font-medium cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-[var(--muted)] space-y-2">
            <Info className="w-8 h-8 text-[var(--muted)] mx-auto opacity-70" />
            <p className="text-sm font-semibold text-[var(--heading)]">No attributed quotes recorded in this date range.</p>
            <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
              As your AI agents discuss pricing on inbound and outbound calls, structured quotes will automatically appear here.
            </p>
          </div>
        )}
      </div>

      {/* Won Confirmation Modal */}
      {selectedEventForWon && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-left animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-lg font-bold text-[var(--heading)]">🎉 Confirm Closed Revenue</h3>
              <p className="text-xs text-[var(--muted)] mt-1">
                Enter the final closed amount for this deal to update your confirmed ROI.
              </p>
            </div>

            <form onSubmit={handleConfirmWon} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                  Final Won Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={customWonAmount}
                  onChange={e => setCustomWonAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full bg-[var(--primary-bg)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--heading)] font-mono text-sm outline-none focus:border-violet-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedEventForWon(null)}
                  className="px-4 py-2 rounded-xl text-xs text-[var(--muted)] hover:text-[var(--heading)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingEventId !== null}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  Confirm &amp; Add Revenue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default RevenueDashboardClient
